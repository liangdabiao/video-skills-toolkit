"""单旁白 TTS 生成,适配几何证明视频的字幕驱动时间线。

输出:
- public/assets/audio/voice.mp3            单条整段音频
- work/audio/generated/                    分段 mp3
- work/captions/captions.srt               标准 SRT
- work/captions/captions_aligned.json      每条字幕 start/end/parts (Remotion 时间轴来源)

默认 1.2x 语速,30fps。
"""
import json, re, time, subprocess, hashlib
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "assets" / "audio"
WORK_AUDIO = ROOT / "work" / "audio" / "generated"
WORK_CAP = ROOT / "work" / "captions"
for d in (AUDIO_DIR, WORK_AUDIO, WORK_CAP):
    d.mkdir(parents=True, exist_ok=True)

# MiniMax 凭据位置见 reference_minimax_credentials.md
API_KEY = re.search(r"minimaxi\s*=\s*(\S+)", (ROOT.parent.parent / ".env").read_text()).group(1)
URL = "https://api.minimaxi.com/v1/t2a_v2"
HEADERS = {"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"}

SPEED = 1.2
FPS = 30
# 旁白固定音色 (系列锁定)
VOICE_ID = "moss_audio_2ecaeaac-5e5a-11f1-99fb-96e792fde6a1"

# LINES 内容替换为本证明的章节文案
LINES = [
    {"id": "H01", "chapter": "钩子", "text": "示例字幕: 这里替换为钩子台词。"},
    {"id": "P01", "chapter": "准备", "text": "示例字幕: 这里替换为准备台词。"},
    # ...继续添加
]


def hash_text(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:10]


def synthesize(text: str, out_path: Path) -> None:
    payload = {
        "model": "speech-2.8-hd",
        "text": text,
        "stream": False,
        "voice_setting": {"voice_id": VOICE_ID, "speed": SPEED, "vol": 1, "pitch": 0},
        "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
        "output_format": "url",
    }
    r = requests.post(URL, json=payload, headers=HEADERS, timeout=90).json()
    if r.get("base_resp", {}).get("status_code") != 0:
        raise RuntimeError(f"MiniMax error: {r.get('base_resp', {}).get('status_msg')}")
    ad = r["data"]["audio"]
    body = requests.get(ad, timeout=90).content if ad.startswith("http") else bytes.fromhex(ad)
    out_path.write_bytes(body)


def measure(p: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(p)],
        capture_output=True, text=True, timeout=10,
    )
    return float(out.stdout.strip())


def concat_mp3(parts: list[Path], out: Path) -> None:
    listfile = out.parent / f"{out.stem}.list"
    listfile.write_text("\n".join(f"file '{p.as_posix()}'" for p in parts), encoding="utf-8")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
         "-c", "copy", str(out)],
        check=True, capture_output=True,
    )
    listfile.unlink()


def srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main() -> None:
    parts = []
    aligned = []
    srt_entries = []
    cursor = 0.0

    for line in LINES:
        lid = line["id"]
        h = hash_text(f"{lid}|{line['text']}")
        p = WORK_AUDIO / f"{lid}_{h}.mp3"
        if not p.exists():
            preview = line["text"][:32].replace("\n", " ")
            print(f"  {lid} {preview}...")
            synthesize(line["text"], p)
            time.sleep(0.3)
        dur = measure(p)
        parts.append(p)
        aligned.append({
            "id": lid,
            "chapter": line["chapter"],
            "start": round(cursor, 3),
            "end": round(cursor + dur, 3),
            "start_frame": int(round(cursor * FPS)),
            "end_frame": int(round((cursor + dur) * FPS)),
            "text": line["text"],
            "file": p.name,
        })
        srt_entries.append({
            "index": len(srt_entries) + 1,
            "start": cursor,
            "end": cursor + dur,
            "text": line["text"],
        })
        cursor += dur

    voice_mp3 = AUDIO_DIR / "voice.mp3"
    if len(parts) == 1:
        subprocess.run(["cp", str(parts[0]), str(voice_mp3)], check=True)
    else:
        concat_mp3(parts, voice_mp3)
    total = measure(voice_mp3)

    aligned_obj = {
        "fps": FPS,
        "speed": SPEED,
        "voice_mp3": str(voice_mp3.relative_to(ROOT)),
        "total_duration": round(total, 3),
        "total_frames": int(round(total * FPS)),
        "lines": aligned,
    }
    (WORK_CAP / "captions_aligned.json").write_text(
        json.dumps(aligned_obj, ensure_ascii=False, indent=2), encoding="utf-8")

    srt_lines = []
    for e in srt_entries:
        srt_lines.append(str(e["index"]))
        srt_lines.append(f"{srt_time(e['start'])} --> {srt_time(e['end'])}")
        srt_lines.append(e["text"])
        srt_lines.append("")
    (WORK_CAP / "captions.srt").write_text("\n".join(srt_lines), encoding="utf-8")

    print(f"\nTotal: {total:.2f}s ({int(round(total * FPS))} frames @ {FPS}fps)")
    print(f"  voice.mp3          -> {voice_mp3}")
    print(f"  captions_aligned   -> {WORK_CAP / 'captions_aligned.json'}")
    print(f"  captions.srt       -> {WORK_CAP / 'captions.srt'}")


if __name__ == "__main__":
    main()
