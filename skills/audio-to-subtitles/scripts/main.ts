import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { uploadToR2 } from "./r2";

type MediaKind = "auto" | "audio" | "video";
type OutputFormat = "srt" | "vtt" | "json";
type InputType = "media" | "text";

type ManifestEntry = {
  input: string;
  inputType?: InputType;
  sourcePath?: string | null;
  textFile?: string | null;
  language?: string | null;
  speaker?: boolean | null;
  mediaKind?: MediaKind | null;
  outputName?: string | null;
  subtitles?: boolean | null;
  voiceId?: string | null;
  ttsModel?: string | null;
  ttsSpeed?: number | null;
  ttsVol?: number | null;
  ttsPitch?: number | null;
  ttsEmotion?: string | null;
  ttsFormat?: string | null;
};

type Args = {
  inputs: string[];
  texts: string[];
  textFiles: string[];
  manifest: string | null;
  outDir: string;
  formats: Set<OutputFormat>;
  language: string | null;
  speaker: boolean;
  ttsSubtitles: boolean;
  ttsVoiceId: string | null;
  ttsModel: string | null;
  ttsSpeed: number | null;
  ttsVol: number | null;
  ttsPitch: number | null;
  ttsEmotion: string | null;
  ttsFormat: string | null;
  ttsSampleRate: number | null;
  ttsBitrate: number | null;
  minimaxApiHost: string | null;
  minimaxApiKey: string | null;
  mediaKind: MediaKind;
  r2Prefix: string | null;
  r2Key: string | null;
  concurrency: number;
  pollIntervalSeconds: number;
  timeoutSeconds: number;
  apiBase: string;
  apiKey: string | null;
  json: boolean;
  help: boolean;
};

type SubtitleSegment = {
  start_time?: number;
  end_time?: number;
  subtitle_text?: string;
  speaker?: string;
  startTime?: number;
  endTime?: number;
  text?: string;
};

type TaskResponse = {
  success?: boolean;
  task_id?: string;
  status?: string;
  request_id?: string;
  result?: {
    duration?: number;
    subtitles?: SubtitleSegment[];
  };
  error?: unknown;
  message?: string;
  [key: string]: unknown;
};

type JobResult = {
  input: string;
  inputType: InputType;
  mediaUrl?: string;
  audioPath?: string;
  uploaded?: {
    url: string;
    key: string;
    bucket: string;
  };
  tts?: {
    voiceId: string;
    model: string;
    duration?: unknown;
    traceId?: unknown;
  };
  taskId?: string;
  status?: string;
  outputs: Record<string, string>;
};

type TtsSettings = {
  apiKey: string;
  apiHost: string;
  voiceId: string;
  model: string;
  speed: number;
  vol: number;
  pitch: number;
  emotion: string;
  format: string;
  sampleRate: number;
  bitrate: number;
};

type TtsResponse = {
  data?: {
    audio?: string;
    duration?: unknown;
  };
  trace_id?: unknown;
  extra_info?: unknown;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
  [key: string]: unknown;
};

const AUDIO_EXTENSIONS = new Set([".aac", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav"]);
const VIDEO_EXTENSIONS = new Set([".avi", ".flv", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".ts", ".webm", ".wmv"]);

function printUsage(): void {
  console.log(`Convert audio/video files or public URLs to subtitles with AI MediaKit.

Usage:
  npx -y bun scripts/main.ts <file-or-url...> [options]
  npx -y bun scripts/main.ts --text "要朗读的文字" [--subtitles] [options]
  npx -y bun scripts/main.ts --text-file script.md [--subtitles] [options]
  npx -y bun scripts/main.ts --manifest inputs.txt [options]

Examples:
  npx -y bun scripts/main.ts audio.mp3 --language zh-CN --out-dir subtitles
  npx -y bun scripts/main.ts interview.mp3 --speaker --format srt,vtt
  npx -y bun scripts/main.ts "https://example.com/video.mp4" --media-kind video
  npx -y bun scripts/main.ts --text "你好，欢迎收听。" --voice-id female-shaonv --out-dir out
  npx -y bun scripts/main.ts --text-file script.md --subtitles --language zh-CN --out-dir out
  npx -y bun scripts/main.ts --manifest inputs.txt --concurrency 2

Options:
  --text <text>             Generate TTS audio from text
  --text-file <path>        Generate TTS audio from a text file
  --subtitles               With --text/--text-file, also generate subtitles from the TTS audio
  --manifest <path>          Batch manifest: text lines or JSON array/object
  --out-dir <path>           Output directory (default: subtitles)
  --format <all|srt|vtt|json> Output format, comma-separated allowed (default: all)
  --language <lang>          Recognition language, e.g. cmn-Hans-CN, zh-CN, or eng-US
  --speaker                  Enable speaker diarization
  --voice-id <id>            MiniMax voice ID (default: MINIMAX_VOICE_ID or female-shaonv)
  --tts-model <model>        MiniMax TTS model (default: MINIMAX_TTS_MODEL or speech-02-hd)
  --tts-speed <n>            TTS speed (default: 1.0)
  --tts-vol <n>              TTS volume (default: 1.0)
  --tts-pitch <n>            TTS pitch (default: 0)
  --tts-emotion <emotion>    TTS emotion (default: happy)
  --tts-format <format>      TTS audio format: mp3, wav, flac, pcm (default: mp3)
  --tts-sample-rate <n>      TTS sample rate (default: 32000)
  --tts-bitrate <n>          TTS bitrate (default: 128000)
  --media-kind <kind>        auto, audio, or video (default: auto)
  --r2-prefix <prefix>       R2 object prefix (default: audio/YYYY-MM-DD)
  --r2-key <key>             R2 object key, only valid with one local input
  --concurrency <n>          Batch concurrency (default: 1)
  --poll-interval <seconds>  Poll interval (default: 5)
  --timeout <seconds>        Per-task timeout (default: 7200)
  --api-base <url>           API base (default: https://mediakit.cn-beijing.volces.com)
  --api-key <key>            MediaKit API key; env vars are preferred
  --minimax-api-host <url>   MiniMax API host (default: MINIMAX_API_HOST or https://api.minimax.io)
  --minimax-api-key <key>    MiniMax API key; env vars are preferred
  --json                     Print JSON summary
  -h, --help                 Show help

Environment:
  MINIMAX_API_KEY, MINIMAX_API_HOST, MINIMAX_VOICE_ID, MINIMAX_TTS_MODEL
  MEDIAKIT_API_KEY or AI_MEDIAKIT_API_KEY or VOLCENGINE_MEDIAKIT_API_KEY
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET
  R2_PUBLIC_BASE_URL or R2_PUBLIC_URL`);
}

function parseFormats(value: string): Set<OutputFormat> {
  const normalized = value.trim().toLowerCase();
  if (normalized === "all") return new Set(["srt", "vtt", "json"]);

  const formats = new Set<OutputFormat>();
  for (const part of normalized.split(",")) {
    const item = part.trim();
    if (!item) continue;
    if (item !== "srt" && item !== "vtt" && item !== "json") {
      throw new Error(`Invalid format: ${item}. Use all, srt, vtt, json, or comma-separated values.`);
    }
    formats.add(item);
  }
  if (formats.size === 0) throw new Error("No output format selected.");
  return formats;
}

function parsePositiveInt(value: string | undefined, name: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function parseNumber(value: string | undefined, name: string): number {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number.`);
  return parsed;
}

function parseMediaKind(value: string | undefined): MediaKind {
  if (value === "auto" || value === "audio" || value === "video") return value;
  throw new Error(`Invalid media kind: ${value}. Use auto, audio, or video.`);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    inputs: [],
    texts: [],
    textFiles: [],
    manifest: null,
    outDir: "subtitles",
    formats: new Set(["srt", "vtt", "json"]),
    language: null,
    speaker: false,
    ttsSubtitles: false,
    ttsVoiceId: null,
    ttsModel: null,
    ttsSpeed: null,
    ttsVol: null,
    ttsPitch: null,
    ttsEmotion: null,
    ttsFormat: null,
    ttsSampleRate: null,
    ttsBitrate: null,
    minimaxApiHost: null,
    minimaxApiKey: null,
    mediaKind: "auto",
    r2Prefix: null,
    r2Key: null,
    concurrency: 1,
    pollIntervalSeconds: 5,
    timeoutSeconds: 7200,
    apiBase: "https://mediakit.cn-beijing.volces.com",
    apiKey: null,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-h" || a === "--help") {
      args.help = true;
      continue;
    }
    if (a === "--json") {
      args.json = true;
      continue;
    }
    if (a === "--speaker") {
      args.speaker = true;
      continue;
    }
    if (a === "--subtitles") {
      args.ttsSubtitles = true;
      continue;
    }
    if (a === "--text") {
      args.texts.push(argv[++i] ?? "");
      continue;
    }
    if (a === "--text-file") {
      args.textFiles.push(argv[++i] ?? "");
      continue;
    }
    if (a === "--manifest") {
      args.manifest = argv[++i] ?? null;
      continue;
    }
    if (a === "--out-dir") {
      args.outDir = argv[++i] ?? "";
      continue;
    }
    if (a === "--format") {
      args.formats = parseFormats(argv[++i] ?? "");
      continue;
    }
    if (a === "--language") {
      args.language = argv[++i] ?? null;
      continue;
    }
    if (a === "--voice-id" || a === "--voice") {
      args.ttsVoiceId = argv[++i] ?? null;
      continue;
    }
    if (a === "--tts-model") {
      args.ttsModel = argv[++i] ?? null;
      continue;
    }
    if (a === "--tts-speed") {
      args.ttsSpeed = parseNumber(argv[++i], "--tts-speed");
      continue;
    }
    if (a === "--tts-vol" || a === "--tts-volume") {
      args.ttsVol = parseNumber(argv[++i], "--tts-vol");
      continue;
    }
    if (a === "--tts-pitch") {
      args.ttsPitch = parseNumber(argv[++i], "--tts-pitch");
      continue;
    }
    if (a === "--tts-emotion") {
      args.ttsEmotion = argv[++i] ?? null;
      continue;
    }
    if (a === "--tts-format") {
      args.ttsFormat = argv[++i] ?? null;
      continue;
    }
    if (a === "--tts-sample-rate") {
      args.ttsSampleRate = parsePositiveInt(argv[++i], "--tts-sample-rate");
      continue;
    }
    if (a === "--tts-bitrate") {
      args.ttsBitrate = parsePositiveInt(argv[++i], "--tts-bitrate");
      continue;
    }
    if (a === "--media-kind" || a === "--media") {
      args.mediaKind = parseMediaKind(argv[++i]);
      continue;
    }
    if (a === "--r2-prefix") {
      args.r2Prefix = argv[++i] ?? null;
      continue;
    }
    if (a === "--r2-key") {
      args.r2Key = argv[++i] ?? null;
      continue;
    }
    if (a === "--concurrency") {
      args.concurrency = parsePositiveInt(argv[++i], "--concurrency");
      continue;
    }
    if (a === "--poll-interval") {
      args.pollIntervalSeconds = parsePositiveInt(argv[++i], "--poll-interval");
      continue;
    }
    if (a === "--timeout") {
      args.timeoutSeconds = parsePositiveInt(argv[++i], "--timeout");
      continue;
    }
    if (a === "--api-base") {
      args.apiBase = (argv[++i] ?? "").replace(/\/$/, "");
      continue;
    }
    if (a === "--api-key") {
      args.apiKey = argv[++i] ?? null;
      continue;
    }
    if (a === "--minimax-api-host") {
      args.minimaxApiHost = (argv[++i] ?? "").replace(/\/$/, "");
      continue;
    }
    if (a === "--minimax-api-key") {
      args.minimaxApiKey = argv[++i] ?? null;
      continue;
    }
    if (a.startsWith("-")) throw new Error(`Unknown option: ${a}`);
    args.inputs.push(a);
  }

  if (!args.outDir) throw new Error("--out-dir cannot be empty.");
  return args;
}

async function loadEnvFile(filePath: string, override = false): Promise<void> {
  try {
    const content = await readFile(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (override || !process.env[key]) process.env[key] = value;
    }
  } catch {
    // Missing env files are expected.
  }
}

async function findUp(startDir: string, relativeFile: string): Promise<string | null> {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, relativeFile);
    try {
      await access(candidate);
      return candidate;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
}

async function loadEnv(): Promise<void> {
  const home = homedir();
  const cwd = process.cwd();
  await loadEnvFile(path.join(home, ".skills", ".env"));
  await loadEnvFile(path.join(home, ".baoyu-skills", ".env"));

  for (const rel of [".env", path.join(".skills", ".env"), path.join(".baoyu-skills", ".env")]) {
    const found = await findUp(cwd, rel);
    if (found) await loadEnvFile(found);
  }
  const r2Env = await findUp(cwd, ".env.r2");
  if (r2Env) await loadEnvFile(r2Env, true);
}

function resolveApiKey(args: Args): string {
  const key =
    args.apiKey ||
    process.env.MEDIAKIT_API_KEY ||
    process.env.AI_MEDIAKIT_API_KEY ||
    process.env.VOLCENGINE_MEDIAKIT_API_KEY;
  if (!key) {
    throw new Error("MediaKit API key is missing. Set MEDIAKIT_API_KEY, AI_MEDIAKIT_API_KEY, or VOLCENGINE_MEDIAKIT_API_KEY.");
  }
  return key;
}

function envNumber(name: string): number | null {
  const value = process.env[name];
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveTtsSettings(args: Args, entry: ManifestEntry): TtsSettings {
  const apiKey = args.minimaxApiKey || process.env.MINIMAX_API_KEY || process.env.MINIMAX_TTS_API_KEY;
  if (!apiKey) {
    throw new Error("MiniMax API key is missing. Set MINIMAX_API_KEY or MINIMAX_TTS_API_KEY.");
  }

  return {
    apiKey,
    apiHost: (args.minimaxApiHost || process.env.MINIMAX_API_HOST || "https://api.minimax.io").replace(/\/$/, ""),
    voiceId: entry.voiceId || args.ttsVoiceId || process.env.MINIMAX_VOICE_ID || process.env.MINIMAX_TTS_VOICE_ID || "female-shaonv",
    model: entry.ttsModel || args.ttsModel || process.env.MINIMAX_TTS_MODEL || "speech-02-hd",
    speed: entry.ttsSpeed ?? args.ttsSpeed ?? envNumber("MINIMAX_TTS_SPEED") ?? 1.0,
    vol: entry.ttsVol ?? args.ttsVol ?? envNumber("MINIMAX_TTS_VOL") ?? envNumber("MINIMAX_TTS_VOLUME") ?? 1.0,
    pitch: entry.ttsPitch ?? args.ttsPitch ?? envNumber("MINIMAX_TTS_PITCH") ?? 0,
    emotion: entry.ttsEmotion || args.ttsEmotion || process.env.MINIMAX_TTS_EMOTION || "happy",
    format: entry.ttsFormat || args.ttsFormat || process.env.MINIMAX_TTS_FORMAT || "mp3",
    sampleRate: args.ttsSampleRate ?? envNumber("MINIMAX_TTS_SAMPLE_RATE") ?? 32000,
    bitrate: args.ttsBitrate ?? envNumber("MINIMAX_TTS_BITRATE") ?? 128000,
  };
}

async function textToAudio(text: string, outputPath: string, settings: TtsSettings): Promise<{ filePath: string; duration?: unknown; traceId?: unknown }> {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const payload = {
    model: settings.model,
    text,
    stream: false,
    voice_setting: {
      voice_id: settings.voiceId,
      speed: settings.speed,
      vol: settings.vol,
      pitch: settings.pitch,
      emotion: settings.emotion,
    },
    audio_setting: {
      format: settings.format,
      sample_rate: settings.sampleRate,
      bitrate: settings.bitrate,
    },
  };

  const response = await fetch(`${settings.apiHost}/v1/t2a_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(async () => ({ base_resp: { status_msg: await response.text() } })) as TtsResponse;
  const audioHex = data.data?.audio;
  if (!response.ok || !audioHex) {
    const message = data.base_resp?.status_msg || JSON.stringify(data);
    throw new Error(`MiniMax TTS failed: ${response.status} ${response.statusText} ${message}`);
  }

  await writeFile(outputPath, Buffer.from(audioHex, "hex"));
  return {
    filePath: outputPath,
    duration: data.data?.duration,
    traceId: data.trace_id,
  };
}

function isHttpUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

function getExtension(input: string): string {
  if (isHttpUrl(input)) {
    try {
      return path.extname(new URL(input).pathname).toLowerCase();
    } catch {
      return "";
    }
  }
  return path.extname(input).toLowerCase();
}

function detectMediaKind(input: string, forced: MediaKind): "audio" | "video" {
  if (forced === "audio" || forced === "video") return forced;
  const ext = getExtension(input);
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  return "audio";
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeKeyPart(value: string): string {
  const ext = path.extname(value).toLowerCase();
  const base = path.basename(value, ext);
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${cleaned || "media"}${ext || ".bin"}`;
}

function buildR2Key(input: string, prefix: string | null, keyOverride: string | null, totalJobs: number): string {
  if (keyOverride) {
    if (totalJobs !== 1) throw new Error("--r2-key can only be used with one local input.");
    return keyOverride.replace(/^\/+/, "");
  }

  const defaultPrefix = process.env.R2_AUDIO_KEY_PREFIX || process.env.AUDIO_SUBTITLES_R2_PREFIX || `audio/${dateStamp()}`;
  const normalizedPrefix = (prefix || defaultPrefix).replace(/^\/+|\/+$/g, "");
  const unique = randomUUID().slice(0, 8);
  return `${normalizedPrefix}/${Date.now()}-${unique}-${sanitizeKeyPart(input)}`;
}

function baseNameForOutput(entry: ManifestEntry, index: number): string {
  if (entry.outputName) return sanitizeOutputName(entry.outputName);
  if (entry.inputType === "text") {
    if (entry.sourcePath) {
      return sanitizeOutputName(path.basename(entry.sourcePath, path.extname(entry.sourcePath))) || `tts-${index + 1}`;
    }
    return `tts-${index + 1}`;
  }
  if (isHttpUrl(entry.input)) {
    try {
      const fromUrl = path.basename(new URL(entry.input).pathname);
      if (fromUrl) return sanitizeOutputName(path.basename(fromUrl, path.extname(fromUrl)));
    } catch {
      // Fall through.
    }
    return `media-${index + 1}`;
  }
  return sanitizeOutputName(path.basename(entry.input, path.extname(entry.input))) || `media-${index + 1}`;
}

function sanitizeOutputName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function normalizeManifestEntry(value: unknown): ManifestEntry {
  if (typeof value === "string") return { input: value, inputType: "media" };
  if (!value || typeof value !== "object") throw new Error("Manifest entries must be strings or objects.");

  const record = value as Record<string, unknown>;
  const text = record.text;
  const textFile = record.textFile || record.text_file;
  const common = {
    language: typeof record.language === "string" ? record.language : null,
    speaker: typeof record.speaker === "boolean" ? record.speaker : null,
    outputName: typeof record.outputName === "string" ? record.outputName : typeof record.output_name === "string" ? record.output_name : null,
    subtitles: typeof record.subtitles === "boolean" ? record.subtitles : null,
    voiceId: typeof record.voiceId === "string" ? record.voiceId : typeof record.voice_id === "string" ? record.voice_id : null,
    ttsModel: typeof record.ttsModel === "string" ? record.ttsModel : typeof record.tts_model === "string" ? record.tts_model : null,
    ttsSpeed: typeof record.ttsSpeed === "number" ? record.ttsSpeed : typeof record.tts_speed === "number" ? record.tts_speed : null,
    ttsVol: typeof record.ttsVol === "number" ? record.ttsVol : typeof record.tts_vol === "number" ? record.tts_vol : null,
    ttsPitch: typeof record.ttsPitch === "number" ? record.ttsPitch : typeof record.tts_pitch === "number" ? record.tts_pitch : null,
    ttsEmotion: typeof record.ttsEmotion === "string" ? record.ttsEmotion : typeof record.tts_emotion === "string" ? record.tts_emotion : null,
    ttsFormat: typeof record.ttsFormat === "string" ? record.ttsFormat : typeof record.tts_format === "string" ? record.tts_format : null,
  };

  if (typeof text === "string") {
    return {
      input: text,
      inputType: "text",
      ...common,
    };
  }
  if (typeof textFile === "string") {
    return {
      input: textFile,
      inputType: "text",
      textFile,
      sourcePath: textFile,
      ...common,
    };
  }

  const input = record.input || record.file || record.url;
  if (typeof input !== "string" || !input.trim()) throw new Error("Manifest object needs input, file, or url.");

  const mediaKind = record.mediaKind || record.media_kind || record.kind;
  return {
    input: input.trim(),
    inputType: "media",
    language: common.language,
    speaker: common.speaker,
    mediaKind: mediaKind === "audio" || mediaKind === "video" || mediaKind === "auto" ? mediaKind : null,
    outputName: common.outputName,
  };
}

async function readManifest(filePath: string): Promise<ManifestEntry[]> {
  const content = await readFile(filePath, "utf8");
  if (path.extname(filePath).toLowerCase() === ".json") {
    const parsed = JSON.parse(content) as unknown;
    const inputs = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).inputs)
        ? (parsed as Record<string, unknown>).inputs as unknown[]
        : null;
    if (!inputs) throw new Error("JSON manifest must be an array or an object with an inputs array.");
    return inputs.map(normalizeManifestEntry);
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((input) => ({ input }));
}

async function buildJobs(args: Args): Promise<ManifestEntry[]> {
  const entries: ManifestEntry[] = args.inputs.map((input) => ({ input, inputType: "media" }));
  entries.push(...args.texts.map((input) => ({ input, inputType: "text" as const })));
  for (const textFile of args.textFiles) {
    if (!textFile) throw new Error("--text-file cannot be empty.");
    entries.push({
      input: await readFile(textFile, "utf8"),
      inputType: "text",
      sourcePath: textFile,
    });
  }
  if (args.manifest) entries.push(...await readManifest(args.manifest));
  for (const entry of entries) {
    if (entry.inputType === "text" && entry.textFile) {
      entry.input = await readFile(entry.textFile, "utf8");
      entry.sourcePath = entry.textFile;
    }
  }
  if (entries.length === 0) throw new Error("No input files or URLs provided.");
  for (const entry of entries) {
    if (entry.inputType === "text" && !entry.input.trim()) throw new Error("Text input cannot be empty.");
  }
  return entries;
}

async function submitTask(apiBase: string, apiKey: string, mediaUrl: string, mediaKind: "audio" | "video", language: string | null, speaker: boolean): Promise<string> {
  const body: Record<string, unknown> = {
    [mediaKind === "video" ? "video_url" : "audio_url"]: mediaUrl,
  };
  if (language) body.language = normalizeLanguage(language);
  if (speaker) body.enable_speaker_info = true;

  const response = await fetch(`${apiBase}/api/v1/tools/asr-subtitles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(async () => ({ message: await response.text() })) as TaskResponse;
  if (!response.ok || data.success === false || !data.task_id) {
    throw new Error(`MediaKit submit failed: ${response.status} ${response.statusText} ${JSON.stringify(data)}`);
  }
  return data.task_id;
}

function normalizeLanguage(language: string): string {
  const normalized = language.trim();
  if (normalized === "zh-CN" || normalized === "zh" || normalized.toLowerCase() === "chinese") {
    return "cmn-Hans-CN";
  }
  return normalized;
}

async function getTask(apiBase: string, apiKey: string, taskId: string): Promise<TaskResponse> {
  const response = await fetch(`${apiBase}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await response.json().catch(async () => ({ message: await response.text() })) as TaskResponse;
  if (!response.ok || data.success === false) {
    throw new Error(`MediaKit task query failed: ${response.status} ${response.statusText} ${JSON.stringify(data)}`);
  }
  return data;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFailedStatus(status: string): boolean {
  return ["failed", "error", "cancelled", "canceled", "rejected"].includes(status.toLowerCase());
}

function isCompletedStatus(status: string): boolean {
  return ["completed", "succeeded", "success"].includes(status.toLowerCase());
}

async function pollTask(apiBase: string, apiKey: string, taskId: string, intervalSeconds: number, timeoutSeconds: number): Promise<TaskResponse> {
  const started = Date.now();
  while (Date.now() - started <= timeoutSeconds * 1000) {
    const data = await getTask(apiBase, apiKey, taskId);
    const status = data.status || "";
    if (isCompletedStatus(status)) return data;
    if (isFailedStatus(status)) throw new Error(`MediaKit task failed: ${taskId} status=${status} ${JSON.stringify(data)}`);
    await delay(intervalSeconds * 1000);
  }
  throw new Error(`MediaKit task timed out after ${timeoutSeconds}s: ${taskId}`);
}

function secondsToTimestamp(seconds: number, separator: "," | "."): string {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMs = Math.round(safeSeconds * 1000);
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(ms, 3)}`;
}

function speakerLabel(speaker: string | undefined, speakerMap: Map<string, number>): string {
  if (!speaker) return "";
  if (!speakerMap.has(speaker)) speakerMap.set(speaker, speakerMap.size + 1);
  return `[说话人 ${speakerMap.get(speaker)}] `;
}

function segmentFields(segment: SubtitleSegment): { start: number; end: number; text: string; speaker?: string } {
  const start = typeof segment.start_time === "number" ? segment.start_time : typeof segment.startTime === "number" ? segment.startTime : 0;
  const end = typeof segment.end_time === "number" ? segment.end_time : typeof segment.endTime === "number" ? segment.endTime : start;
  const text = typeof segment.subtitle_text === "string" ? segment.subtitle_text : typeof segment.text === "string" ? segment.text : "";
  return { start, end, text: text.trim(), speaker: segment.speaker };
}

function getSubtitles(task: TaskResponse): SubtitleSegment[] {
  const subtitles = task.result?.subtitles;
  if (!Array.isArray(subtitles)) throw new Error("Completed task does not contain result.subtitles.");
  return subtitles;
}

function formatSrt(subtitles: SubtitleSegment[]): string {
  const speakerMap = new Map<string, number>();
  return subtitles
    .map((segment, index) => {
      const { start, end, text, speaker } = segmentFields(segment);
      const line = `${speakerLabel(speaker, speakerMap)}${text}`;
      return `${index + 1}\n${secondsToTimestamp(start, ",")} --> ${secondsToTimestamp(end, ",")}\n${line}`;
    })
    .join("\n\n") + "\n";
}

function formatVtt(subtitles: SubtitleSegment[]): string {
  const speakerMap = new Map<string, number>();
  return "WEBVTT\n\n" + subtitles
    .map((segment) => {
      const { start, end, text, speaker } = segmentFields(segment);
      const line = `${speakerLabel(speaker, speakerMap)}${text}`;
      return `${secondsToTimestamp(start, ".")} --> ${secondsToTimestamp(end, ".")}\n${line}`;
    })
    .join("\n\n") + "\n";
}

async function writeOutputs(outDir: string, baseName: string, formats: Set<OutputFormat>, payload: Record<string, unknown>, subtitles: SubtitleSegment[]): Promise<Record<OutputFormat, string>> {
  await mkdir(outDir, { recursive: true });
  const outputs: Partial<Record<OutputFormat, string>> = {};

  if (formats.has("json")) {
    const jsonPath = path.join(outDir, `${baseName}.json`);
    await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");
    outputs.json = jsonPath;
  }
  if (formats.has("srt")) {
    const srtPath = path.join(outDir, `${baseName}.srt`);
    await writeFile(srtPath, formatSrt(subtitles), "utf8");
    outputs.srt = srtPath;
  }
  if (formats.has("vtt")) {
    const vttPath = path.join(outDir, `${baseName}.vtt`);
    await writeFile(vttPath, formatVtt(subtitles), "utf8");
    outputs.vtt = vttPath;
  }

  return outputs as Record<OutputFormat, string>;
}

function jobNeedsSubtitles(entry: ManifestEntry, args: Args): boolean {
  if (entry.inputType === "text") return entry.subtitles ?? args.ttsSubtitles;
  return true;
}

function audioExtension(format: string): string {
  const normalized = format.toLowerCase().replace(/^\./, "");
  return normalized || "mp3";
}

async function processJob(entry: ManifestEntry, index: number, totalJobs: number, args: Args, apiKey: string | null): Promise<JobResult> {
  const input = entry.input;
  const inputType = entry.inputType || "media";
  const mediaKind = inputType === "text" ? "audio" : detectMediaKind(input, entry.mediaKind || args.mediaKind);
  const language = entry.language ?? args.language;
  const speaker = entry.speaker ?? args.speaker;
  const outputBase = baseNameForOutput(entry, index);
  const outputs: Record<string, string> = {};

  let mediaUrl: string | undefined = input;
  let uploaded: JobResult["uploaded"];
  let audioPath: string | undefined;
  let tts: JobResult["tts"];

  if (inputType === "text") {
    const settings = resolveTtsSettings(args, entry);
    audioPath = path.resolve(args.outDir, `${outputBase}.${audioExtension(settings.format)}`);
    const generated = await textToAudio(input, audioPath, settings);
    outputs.audio = generated.filePath;
    tts = {
      voiceId: settings.voiceId,
      model: settings.model,
      duration: generated.duration,
      traceId: generated.traceId,
    };

    if (!jobNeedsSubtitles(entry, args)) {
      return {
        input: entry.sourcePath || input.slice(0, 120),
        inputType,
        audioPath,
        tts,
        status: "tts_completed",
        outputs,
      };
    }
    mediaUrl = audioPath;
  }

  if (!apiKey) {
    throw new Error("MediaKit API key is required for subtitle generation.");
  }

  if (!mediaUrl || !isHttpUrl(mediaUrl)) {
    const localPath = path.resolve(mediaUrl || input);
    await access(localPath);
    const r2Key = buildR2Key(localPath, args.r2Prefix, args.r2Key, totalJobs);
    uploaded = await uploadToR2(localPath, r2Key);
    mediaUrl = uploaded.url;
  }

  const taskId = await submitTask(args.apiBase, apiKey, mediaUrl, mediaKind, language, speaker);
  const completed = await pollTask(args.apiBase, apiKey, taskId, args.pollIntervalSeconds, args.timeoutSeconds);
  const subtitles = getSubtitles(completed);
  const payload = {
    input: inputType === "text" ? entry.sourcePath || input : input,
    inputType,
    audioPath,
    tts,
    mediaUrl,
    mediaKind,
    language,
    speaker,
    uploaded,
    taskId,
    task: completed,
  };
  Object.assign(outputs, await writeOutputs(path.resolve(args.outDir), outputBase, args.formats, payload, subtitles));

  return {
    input: inputType === "text" ? entry.sourcePath || input.slice(0, 120) : input,
    inputType,
    mediaUrl,
    audioPath,
    uploaded,
    tts,
    taskId,
    status: completed.status || "completed",
    outputs,
  };
}

async function runPool<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<Array<{ ok: true; value: R } | { ok: false; error: Error; index: number }>> {
  const results: Array<{ ok: true; value: R } | { ok: false; error: Error; index: number }> = new Array(items.length);
  let next = 0;

  async function runWorker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { ok: true, value: await worker(items[index]!, index) };
      } catch (error) {
        results[index] = { ok: false, error: error instanceof Error ? error : new Error(String(error)), index };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  await loadEnv();
  const jobs = await buildJobs(args);
  const needsMediaKit = jobs.some((entry) => jobNeedsSubtitles(entry, args));
  const apiKey = needsMediaKit ? resolveApiKey(args) : null;

  if (!args.json) {
    console.error(`Processing ${jobs.length} input(s), concurrency=${args.concurrency}`);
  }

  const results = await runPool(jobs, args.concurrency, async (entry, index) => {
    if (!args.json) console.error(`[${index + 1}/${jobs.length}] ${entry.input}`);
    return processJob(entry, index, jobs.length, args, apiKey);
  });

  const successes = results.filter((r): r is { ok: true; value: JobResult } => r.ok).map((r) => r.value);
  const failures = results
    .filter((r): r is { ok: false; error: Error; index: number } => !r.ok)
    .map((r) => ({ input: jobs[r.index]?.input, error: r.error.message }));

  if (args.json) {
    console.log(JSON.stringify({ success: failures.length === 0, results: successes, failures }, null, 2));
  } else {
    for (const result of successes) {
      const files = Object.values(result.outputs).join(", ");
      console.log(`${result.input} -> ${files}`);
    }
    for (const failure of failures) {
      console.error(`FAILED ${failure.input}: ${failure.error}`);
    }
  }

  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
