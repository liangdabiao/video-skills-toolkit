---
name: audio-to-subtitles
description: Convert local audio/video files or public media URLs into subtitle files by uploading local files to Cloudflare R2 and calling Volcengine AI MediaKit ASR subtitles API. Also supports MiniMax text-to-speech generation from text or text files, with optional subtitle generation from the produced audio. Supports batch processing, SRT/VTT/JSON output, language selection, speaker labels, configurable MiniMax voice ID and model. Use when the user asks to turn audio/video into subtitles, generate ASR subtitles, create SRT/VTT, batch transcription, or generate TTS audio with optional subtitles.
---

# Audio To Subtitles

Use this skill to:

- turn local audio/video files or public media URLs into subtitle files through AI MediaKit;
- turn text into MiniMax TTS audio;
- optionally generate subtitles from the TTS audio in the same run.

## Workflow

For media inputs:

1. If the input is a local file, upload it to Cloudflare R2 first.
2. Submit the public `audio_url` or `video_url` to AI MediaKit ASR subtitles.
3. Poll the async task until it is completed or failed.
4. Save `.json`, `.srt`, and `.vtt` outputs.

For local video-engine projects:

1. If the media belongs to a `talking-head-remotion` project under `<VIDEO_WORKSPACE>`, save subtitles under that project's `work/captions/`.
2. Use `captions.srt` and `captions.vtt` as the main cleaned files, keep raw ASR backups as `captions.raw.srt` and `captions.raw.vtt`, and keep the MediaKit payload as `asr-result.json`.
3. Also write `captions_aligned.json` parsed from the cleaned SRT so Remotion work can sync `src/demoData.ts`.
4. Current project default for 《两个提示词让 AI 少返工》:

```text
<VIDEO_WORKSPACE>/your-talking-head-project/work/captions
```

For text inputs:

1. Generate audio through MiniMax TTS.
2. Save the audio file.
3. If `--subtitles` is set, upload the audio to R2 and run the same AI MediaKit subtitle workflow.

## CLI

```bash
SKILL_DIR="./skills/audio-to-subtitles"

# Local audio/video: upload to R2, then transcribe
npx -y bun "$SKILL_DIR/scripts/main.ts" audio.mp3 --language zh-CN --out-dir subtitles

# Existing public URL: skip R2 upload
npx -y bun "$SKILL_DIR/scripts/main.ts" "https://example.com/audio.mp3" --out-dir subtitles

# Batch files/URLs
npx -y bun "$SKILL_DIR/scripts/main.ts" a.mp3 b.m4a "https://example.com/video.mp4" --out-dir subtitles

# Batch from manifest
npx -y bun "$SKILL_DIR/scripts/main.ts" --manifest inputs.txt --out-dir subtitles

# Speaker diarization
npx -y bun "$SKILL_DIR/scripts/main.ts" interview.mp3 --speaker --language zh-CN

# Text to audio only
npx -y bun "$SKILL_DIR/scripts/main.ts" --text "你好，欢迎收听。" --voice-id female-shaonv --out-dir audio

# Text file to audio + subtitles
npx -y bun "$SKILL_DIR/scripts/main.ts" --text-file script.md --subtitles --language zh-CN --out-dir audio
```

## Options

| Option | Description |
|--------|-------------|
| `--text <text>` | Generate MiniMax TTS audio from inline text. Can be repeated. |
| `--text-file <path>` | Generate MiniMax TTS audio from a text file. Can be repeated. |
| `--subtitles` | With text input, also generate subtitles from the generated audio. |
| `--manifest <path>` | Batch input manifest. Text files use one input per line; JSON supports an array of strings or objects. |
| `--out-dir <path>` | Output directory. Default: `subtitles`. |
| `--format <all|srt|vtt|json>` | Output format. Comma-separated values are allowed. Default: `all`. |
| `--language <cmn-Hans-CN|zh-CN|eng-US>` | Optional recognition language. `zh-CN` is accepted as an alias for `cmn-Hans-CN`. Omit to let API choose defaults. |
| `--speaker` | Enable speaker info and prefix subtitles with speaker labels when returned. |
| `--voice-id <id>` | MiniMax voice ID. Default: `MINIMAX_VOICE_ID`, then `MINIMAX_TTS_VOICE_ID`, then `female-shaonv`. |
| `--tts-model <model>` | MiniMax TTS model. Default: `MINIMAX_TTS_MODEL`, then `speech-02-hd`. |
| `--tts-speed <n>` | TTS speed. Default: `MINIMAX_TTS_SPEED`, then `1.0`. |
| `--tts-vol <n>` | TTS volume. Default: `MINIMAX_TTS_VOL`, then `1.0`. |
| `--tts-pitch <n>` | TTS pitch. Default: `MINIMAX_TTS_PITCH`, then `0`. |
| `--tts-emotion <emotion>` | TTS emotion. Default: `MINIMAX_TTS_EMOTION`, then `happy`. |
| `--tts-format <mp3|wav|flac|pcm>` | TTS audio format. Default: `MINIMAX_TTS_FORMAT`, then `mp3`. |
| `--tts-sample-rate <n>` | TTS sample rate. Default: `MINIMAX_TTS_SAMPLE_RATE`, then `32000`. |
| `--tts-bitrate <n>` | TTS bitrate. Default: `MINIMAX_TTS_BITRATE`, then `128000`. |
| `--media-kind <auto|audio|video>` | Force API request field. Default: `auto` from extension. |
| `--r2-prefix <prefix>` | R2 object key prefix for uploaded local audio/video. Default: `R2_AUDIO_KEY_PREFIX`, then `audio/YYYY-MM-DD`. |
| `--concurrency <n>` | Batch concurrency. Default: `1`. |
| `--poll-interval <seconds>` | Poll interval. Default: `5`. |
| `--timeout <seconds>` | Per-task timeout. Default: `7200`. |
| `--json` | Print machine-readable run summary to stdout. |

## Manifest

Text manifests (`.txt`) are one media input per line.

JSON manifests can mix media and text jobs:

```json
[
  "local-audio.mp3",
  { "url": "https://example.com/video.mp4", "mediaKind": "video" },
  { "text": "你好，欢迎收听。", "outputName": "intro", "subtitles": true, "voiceId": "female-shaonv" },
  { "textFile": "script.md", "outputName": "script-audio", "subtitles": true }
]
```

## Environment

The script loads environment files in this order. The nearest `.env.r2` is loaded last and overrides global R2 defaults for this vault.

1. `~/.skills/.env`
2. `~/.baoyu-skills/.env`
3. nearest `.env.r2` from current directory upward
4. nearest `.skills/.env` from current directory upward
5. nearest `.baoyu-skills/.env` from current directory upward

Required for MiniMax TTS text input:

| Variable | Description |
|----------|-------------|
| `MINIMAX_API_KEY` | MiniMax API key. |
| `MINIMAX_TTS_API_KEY` | Also accepted. |
| `MINIMAX_API_HOST` | Optional. Default: `https://api.minimax.io`. |
| `MINIMAX_VOICE_ID` | Optional default voice ID. |
| `MINIMAX_TTS_MODEL` | Optional default model. |

Required for MediaKit subtitle generation:

| Variable | Description |
|----------|-------------|
| `MEDIAKIT_API_KEY` | AI MediaKit API key. |
| `AI_MEDIAKIT_API_KEY` | Also accepted. |
| `VOLCENGINE_MEDIAKIT_API_KEY` | Also accepted. |

Required for local-file uploads:

| Variable | Description |
|----------|-------------|
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key. |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key. |
| `R2_ACCOUNT_ID` | Cloudflare account ID. |
| `R2_BUCKET` | R2 bucket name. |
| `R2_PUBLIC_BASE_URL` | Public base URL. `R2_PUBLIC_URL` is also accepted. |
| `R2_AUDIO_KEY_PREFIX` | Optional R2 prefix for uploaded audio/video. Default: `audio/YYYY-MM-DD`. |

## Notes

- AI MediaKit only accepts public HTTP/HTTPS media URLs. Local files must be uploaded first.
- TTS audio only needs MiniMax API credentials.
- TTS + subtitles also needs MediaKit and R2 credentials.
- Supported API languages are currently Simplified Chinese and English.
- Single media duration should not exceed the AI MediaKit limit of 3 hours.
- Do not print API keys or commit real `.env.r2` values.
- Do not leave finished video subtitles only in `<NOTES_VAULT>`; for Remotion video work, copy or write them into the matching `<VIDEO_WORKSPACE>/<project>/work/captions/` directory.
