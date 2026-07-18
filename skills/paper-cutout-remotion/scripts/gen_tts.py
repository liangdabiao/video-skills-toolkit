"""gen_tts.py — MiniMax 配音（apiz speak 优先，直连 API fallback）

纸片风第 8 步：按场景生成旁白 mp3 + timeline.json（含每段时长，供回写 Root.tsx frames）。

双路径设计：
  1. 优先 apiz speak（统一鉴权，内置下载，model=speech-2.8-hd）
  2. apiz 失败（余额不足等）→ fallback 到直连 api.minimaxi.com/v1/t2a_v2
     （复用 poem-video-template 的鉴权：从 .env 读 minimaxi=KEY，model=speech-02-hd）

输入 narration.yaml：
  voice: female-shaonv
  speed: 1.0
  scenes:
    - id: s01
      text: "盛唐长安，万邦来朝……"
    - id: s02
      text: "..."

输出：
  public/audio/narration/s01.mp3 s02.mp3 ...
  public/audio/narration/timeline.json  # [{id, file, seconds, frames_source, frames_playback}]

frames 计算（对齐 SKILL.md 的回写公式）：
  sourceFrames = ceil(时长秒 × 30) + 15
  playbackFrames = ceil(sourceFrames / 1.2)   # 1.2x 交付节奏
"""
from __future__ import annotations
import argparse
import json
import math
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_apiz import speak as apiz_speak  # noqa: E402

FPS = 30
PLAYBACK_RATE = 1.2  # 交付节奏（对齐 sketch-story 系列默认）


# ============================================================================
# 路径 2：直连 MiniMax API（fallback）
# ============================================================================

def find_minimax_key() -> str:
    """从 .env 读 minimaxi=KEY（和 poem-video-template/gen_tts.py 一致）。"""
    candidates = [
        Path.cwd() / ".env",
        Path.cwd().parent / ".env",
        Path.cwd().parent.parent / ".env",  # video-spec-builder-main/.env
    ]
    for p in candidates:
        if p.exists():
            text = p.read_text(encoding="utf-8")
            m = re.search(r"minimaxi\s*=\s*(\S+)", text)
            if m:
                return m.group(1)
    raise RuntimeError(
        f"找不到 minimaxi=KEY，tried: {[str(p) for p in candidates]}"
    )


def call_tts_direct(
    text: str, out_path: Path, voice: str, speed: float,
    model: str = "speech-02-hd",
) -> Path:
    """直连 api.minimaxi.com/v1/t2a_v2（apiz 不可用时的 fallback）。"""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    api_key = find_minimax_key()
    payload = json.dumps({
        "model": model,
        "text": text,
        "stream": False,
        "voice_setting": {"voice_id": voice, "speed": speed, "vol": 1.0, "pitch": 0},
        "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
        "output_format": "url",
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.minimaxi.com/v1/t2a_v2",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data.get("base_resp", {}).get("status_code") != 0:
        raise RuntimeError(f"MiniMax 错误: {data.get('base_resp')}")
    audio = data["data"]["audio"]
    if audio.startswith("http"):
        with urllib.request.urlopen(audio, timeout=60) as r:
            out_path.write_bytes(r.read())
    else:
        out_path.write_bytes(bytes.fromhex(audio))
    return out_path


# ============================================================================
# 公共：时长测量 + timeline
# ============================================================================

def ffprobe_duration(path: Path) -> float:
    """用 ffprobe 量音频时长（秒）。"""
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe 失败: {proc.stderr}")
    return float(proc.stdout.strip())


def gen_tts_with_fallback(
    text: str, out_path: Path, voice: str, speed: float,
) -> str:
    """apiz speak 优先，失败 fallback 直连。返回用了哪条路径。"""
    try:
        apiz_speak(text, out_path, voice=voice, speed=speed)
        return "apiz"
    except RuntimeError as e:
        print(f"  apiz speak 失败 ({e})，fallback 到直连 MiniMax API ...", file=sys.stderr)
        call_tts_direct(text, out_path, voice, speed)
        return "direct"


# ============================================================================
# 主流程
# ============================================================================

def load_narration(path: Path) -> dict:
    import yaml  # type: ignore
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(
        description="MiniMax 旁白配音（apiz speak 优先，直连 fallback）+ 生成 timeline.json",
    )
    parser.add_argument("narration_yaml", help="narration.yaml 路径")
    parser.add_argument(
        "--out-dir", default="public/audio/narration",
        help="输出目录（默认 public/audio/narration/）",
    )
    parser.add_argument("--dry-run", action="store_true", help="只打印不生成")
    args = parser.parse_args()

    spec = load_narration(Path(args.narration_yaml))
    voice = spec.get("voice", "female-shaonv")
    speed = float(spec.get("speed", 1.0))
    scenes = spec["scenes"]
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    timeline = []
    for sc in scenes:
        sid = sc["id"]
        text = sc["text"].strip()
        out_path = out_dir / f"{sid}.mp3"
        print(f"[{sid}] {text[:30]}...")

        if args.dry_run:
            print(f"  (dry-run) voice={voice} speed={speed}")
            continue

        if out_path.exists():
            print(f"  已存在，跳过（删掉可重新生成）")
        else:
            path_used = gen_tts_with_fallback(text, out_path, voice, speed)
            print(f"  生成完成 ({path_used})")

        seconds = ffprobe_duration(out_path)
        # 帧数计算（对齐 SKILL.md 公式）
        source_frames = math.ceil(seconds * FPS) + 15
        playback_frames = math.ceil(source_frames / PLAYBACK_RATE)
        timeline.append({
            "id": sid,
            "file": str(out_path.relative_to(out_dir.parent.parent.parent)) if out_path.parent.parent.parent in out_path.parents else str(out_path),
            "text": text,
            "seconds": round(seconds, 2),
            "frames_source": source_frames,
            "frames_playback": playback_frames,
        })
        print(f"  时长 {seconds:.2f}s → source {source_frames}帧 / playback {playback_frames}帧")

    timeline_path = out_dir / "timeline.json"
    timeline_path.write_text(
        json.dumps(timeline, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\ntimeline 写入 {timeline_path}")
    print("下一步：用 frames_playback 回写 Root.tsx 的 SCENES 表 frames 字段")


if __name__ == "__main__":
    main()
