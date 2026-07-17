#!/usr/bin/env python3
"""为 WeChat Article Remotion 项目生成 TTS 配音 + 对齐字幕。

调用 skills/audio-to-subtitles 的 bun CLI：
    bun scripts/main.ts --text-file <script.md> --subtitles --out-dir audio

依赖：
    bun（npx -y bun）
    audio-to-subtitles 的环境变量（MINIMAX_* / MEDIATKIT_* / R2_*）
"""
import argparse
import shutil
import subprocess
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
AUDIO_TO_SUBTITLES_DIR = (SKILL_DIR / "../audio-to-subtitles").resolve()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="调 audio-to-subtitles 生成 voice.m4a + captions.srt",
    )
    parser.add_argument(
        "--script",
        required=True,
        help="脚本 markdown 路径（每行一段口播文本）",
    )
    parser.add_argument(
        "--out-dir",
        default=".",
        help="项目根目录（默认当前目录）",
    )
    parser.add_argument(
        "--voice-id",
        default="female-shaonv",
        help="MiniMax voice_id（默认 female-shaonv）",
    )
    parser.add_argument(
        "--language",
        default="cmn-Hans-CN",
        help="字幕识别语言（默认 cmn-Hans-CN）",
    )
    args = parser.parse_args()

    project = Path(args.out_dir).expanduser().resolve()
    script_path = Path(args.script).expanduser().resolve()
    if not script_path.exists():
        raise SystemExit(f"脚本文件不存在：{script_path}")

    audio_out_dir = project / "public/assets/audio"
    captions_out_dir = project / "work/captions"
    audio_out_dir.mkdir(parents=True, exist_ok=True)
    captions_out_dir.mkdir(parents=True, exist_ok=True)

    cli_path = AUDIO_TO_SUBTITLES_DIR / "scripts/main.ts"
    if not cli_path.exists():
        raise SystemExit(
            f"未找到 audio-to-subtitles CLI：{cli_path}\n"
            "请确认 skills/audio-to-subtitles/scripts/main.ts 存在。"
        )

    tmp_audio_dir = project / "work/audio/tts-tmp"
    tmp_audio_dir.mkdir(parents=True, exist_ok=True)

    # 探测 bun / npx 是否可用；不可用就 graceful 退出，不影响后续渲染
    import shutil as _sh
    has_bun = _sh.which("bun") is not None
    has_npx = _sh.which("npx") is not None
    if not (has_bun or has_npx):
        print("[1/2] ! 未找到 bun / npx，跳过 TTS 步骤。")
        print("      视频仍可渲染（无声版），稍后配置环境后重跑。")
        return

    cmd = [
        "npx" if has_npx else "bun",
        "-y", "bun",
        str(cli_path),
        "--text-file", str(script_path),
        "--subtitles",
        "--voice-id", args.voice_id,
        "--language", args.language,
        "--out-dir", str(tmp_audio_dir),
        "--format", "mp3,srt,vtt,json",
    ]
    print(f"[1/2] 调 audio-to-subtitles：")
    print("  $ " + " ".join(cmd))
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"  ! TTS 失败（exit {e.returncode}），可能是 API key 未配置。")
        print("    视频仍可渲染（无声版），稍后配置后重跑。")
        return
    except FileNotFoundError as e:
        print(f"  ! 调起进程失败：{e}")
        print("    视频仍可渲染（无声版），稍后配置后重跑。")
        return

    print("[2/2] 把产物归档到项目目录")
    produced_mp3 = next(tmp_audio_dir.rglob("*.mp3"), None)
    produced_srt = next(tmp_audio_dir.rglob("*.srt"), None)
    produced_json = next(tmp_audio_dir.rglob("*.json"), None)

    if produced_mp3:
        shutil.copy2(produced_mp3, audio_out_dir / "voice.mp3")
        print(f"  ✓ voice.mp3  ← {produced_mp3.name}")
    if produced_srt:
        shutil.copy2(produced_srt, captions_out_dir / "captions.srt")
        shutil.copy2(produced_srt, captions_out_dir / "captions.raw.srt")
        print(f"  ✓ captions.srt  ← {produced_srt.name}")
    if produced_json:
        shutil.copy2(produced_json, captions_out_dir / "captions.raw.json")
        print(f"  ✓ captions.raw.json")

    if produced_mp3:
        try:
            import subprocess as _sp
            _sp.run(
                ["ffmpeg", "-y", "-i", str(audio_out_dir / "voice.mp3"),
                 "-c:a", "aac", str(audio_out_dir / "voice.m4a")],
                check=True,
                capture_output=True,
            )
            print(f"  ✓ voice.m4a  ← 转码")
        except Exception as e:
            print(f"  ! voice.m4a 转码失败（可选步骤）：{e}")

    print("完成。下一步：用 ASR 对齐字幕回写到 src/demoData.ts 的 captions time。")


if __name__ == "__main__":
    main()
