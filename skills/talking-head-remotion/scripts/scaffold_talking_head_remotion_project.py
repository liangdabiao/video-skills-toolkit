#!/usr/bin/env python3
import argparse
import json
import shutil
import subprocess
from pathlib import Path


SKILL_DIR = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = SKILL_DIR / "templates/remotion-project"
LIBRARY_DIR = SKILL_DIR / "assets/library"


def copy_tree(src: Path, dst: Path) -> None:
    for item in src.rglob("*"):
        rel = item.relative_to(src)
        target = dst / rel
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)


def replace_placeholders(project: Path, replacements: dict[str, str]) -> None:
    for path in project.rglob("*"):
        if not path.is_file() or path.suffix.lower() in {".mp3", ".mp4", ".m4a", ".png", ".jpg", ".jpeg", ".ttf"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for key, value in replacements.items():
            text = text.replace(key, value)
        path.write_text(text, encoding="utf-8")


def copy_optional(src: str | None, dst_dir: Path, name: str | None = None) -> str:
    if not src:
        return ""
    src_path = Path(src).expanduser().resolve()
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / (name or src_path.name)
    shutil.copy2(src_path, dst)
    return str(dst)


def seed_from_library(subdir: str, dest_dir: Path) -> list[str]:
    """把素材库某个子目录下的全部文件播种到项目里。"""
    source_dir = LIBRARY_DIR / subdir
    copied = []
    if not source_dir.exists():
        return copied
    dest_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted(source_dir.iterdir()):
        if src.is_file():
            shutil.copy2(src, dest_dir / src.name)
            copied.append(src.name)
    return copied


def ffprobe_duration(path: str) -> float | None:
    if not path:
        return None
    try:
        out = subprocess.check_output(
            [
                "ffprobe",
                "-hide_banner",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=nw=1:nk=1",
                path,
            ],
            text=True,
        ).strip()
        return round(float(out), 3)
    except Exception:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="创建口播 Remotion 视频项目脚手架。")
    parser.add_argument("--project-dir", required=True)
    parser.add_argument("--script")
    parser.add_argument("--talking-head")
    parser.add_argument("--audio")
    parser.add_argument("--screen-recording", action="append", default=[])
    parser.add_argument("--screenshot", action="append", default=[])
    parser.add_argument("--title", default="Talking Head Remotion Video")
    parser.add_argument("--duration", type=float)
    parser.add_argument("--force", action="store_true", help="Overwrite an existing project directory.")
    args = parser.parse_args()

    project = Path(args.project_dir).expanduser().resolve()
    if project.exists() and any(project.iterdir()) and not args.force:
        raise SystemExit(f"{project} already exists and is not empty. Re-run with --force to overwrite template files.")

    project.mkdir(parents=True, exist_ok=True)
    copy_tree(TEMPLATE_DIR, project)

    copied = {"screen_recordings": [], "screenshots": []}
    copied["script"] = copy_optional(args.script, project / "work", "script.md")
    copied["talking_head"] = copy_optional(args.talking_head, project / "public/media/talking-head", "talking-head.mp4")
    copied["audio"] = copy_optional(args.audio, project / "public/assets/audio", "voice.m4a")

    for i, src in enumerate(args.screen_recording, 1):
        dst = copy_optional(src, project / "public/media/screen-recordings", f"screen-{i:02d}{Path(src).suffix}")
        copied["screen_recordings"].append(dst)

    for i, src in enumerate(args.screenshot, 1):
        dst = copy_optional(src, project / "public/assets/screenshots", f"screenshot-{i:02d}{Path(src).suffix}")
        copied["screenshots"].append(dst)

    duration = (
        args.duration
        or ffprobe_duration(copied.get("audio", ""))
        or ffprobe_duration(copied.get("talking_head", ""))
        or 18
    )
    duration = round(float(duration), 3)

    seeded_fonts = seed_from_library("fonts", project / "public/assets/fonts")
    seeded_sfx = seed_from_library("sfx", project / "public/assets/audio")

    replacements = {
        "__PROJECT_TITLE__": args.title,
        "__DURATION_SECONDS__": str(duration),
        "__SCRIPT_PATH__": copied.get("script") or "TODO",
        "__TALKING_HEAD_PATH__": copied.get("talking_head") or "TODO",
        "__AUDIO_PATH__": copied.get("audio") or "TODO",
    }
    replace_placeholders(project, replacements)

    manifest = {
        "title": args.title,
        "duration": duration,
        "paths": {
            "script": copied.get("script") or "",
            "talking_head": copied.get("talking_head") or "",
            "audio": copied.get("audio") or "",
            "screen_recordings": copied["screen_recordings"],
            "screenshots": copied["screenshots"],
            "seeded_fonts": seeded_fonts,
            "seeded_sfx": seeded_sfx,
        },
    }
    (project / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(project)


if __name__ == "__main__":
    main()
