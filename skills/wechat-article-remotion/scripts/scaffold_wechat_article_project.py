#!/usr/bin/env python3
"""创建 WeChat Article Remotion 视频项目脚手架。

从 skills/wechat-article-remotion/templates/remotion-project 复制一份新工程，
并从 talking-head-remotion 公共素材库播种字体和 SFX。
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = SKILL_DIR / "templates/remotion-project"
# 跨 skill 共享 talking-head-remotion 的字体和 SFX 库
LIBRARY_DIR = (SKILL_DIR / "../talking-head-remotion/assets/library").resolve()


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
        if not path.is_file() or path.suffix.lower() in {
            ".mp3", ".mp4", ".m4a", ".png", ".jpg", ".jpeg", ".ttf", ".webp",
        }:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for key, value in replacements.items():
            text = text.replace(key, value)
        path.write_text(text, encoding="utf-8")


def seed_from_library(subdir: str, dest_dir: Path) -> list[str]:
    """从 talking-head-remotion 公共素材库的某个子目录播种全部文件。"""
    source_dir = LIBRARY_DIR / subdir
    copied: list[str] = []
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
    parser = argparse.ArgumentParser(
        description="创建 WeChat Article Remotion 视频项目脚手架。",
    )
    parser.add_argument("--project-dir", required=True, help="新项目目录")
    parser.add_argument("--title", default="WeChat Article Video", help="视频标题")
    parser.add_argument(
        "--article-url",
        default="",
        help="（可选）公众号文章 URL，写入 manifest，后续 fetch_article.py 读取",
    )
    parser.add_argument(
        "--audio",
        default="",
        help="（可选）已生成好的 voice.m4a 路径",
    )
    parser.add_argument("--duration", type=float, default=18.0, help="目标时长（秒）")
    parser.add_argument(
        "--force",
        action="store_true",
        help="目标目录非空时强制覆盖模板文件",
    )
    args = parser.parse_args()

    project = Path(args.project_dir).expanduser().resolve()
    if project.exists() and any(project.iterdir()) and not args.force:
        raise SystemExit(
            f"{project} 已存在且非空。用 --force 覆盖模板文件。"
        )

    project.mkdir(parents=True, exist_ok=True)
    copy_tree(TEMPLATE_DIR, project)

    copied_audio: str = ""
    if args.audio:
        audio_src = Path(args.audio).expanduser().resolve()
        audio_dst_dir = project / "public/assets/audio"
        audio_dst_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(audio_src, audio_dst_dir / "voice.m4a")
        shutil.copy2(audio_src, audio_dst_dir / "voice.mp3")
        copied_audio = str(audio_dst_dir / "voice.m4a")

    duration = args.duration
    if copied_audio:
        probed = ffprobe_duration(copied_audio)
        if probed:
            duration = probed
    duration = round(float(duration), 3)

    seeded_fonts = seed_from_library("fonts", project / "public/assets/fonts")
    seeded_sfx = seed_from_library("sfx", project / "public/assets/audio")

    replacements = {
        "__PROJECT_TITLE__": args.title,
        "__DURATION_SECONDS__": str(duration),
        "__ARTICLE_URL__": args.article_url or "TODO",
        "__AUDIO_PATH__": copied_audio or "TODO",
    }
    replace_placeholders(project, replacements)

    manifest = {
        "title": args.title,
        "duration": duration,
        "article_url": args.article_url or "",
        "paths": {
            "audio": copied_audio,
            "seeded_fonts": seeded_fonts,
            "seeded_sfx": seeded_sfx,
        },
    }
    (project / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(project)


if __name__ == "__main__":
    main()
