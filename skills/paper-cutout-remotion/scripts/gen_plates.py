"""gen_plates.py — 用 apiz 生成无人物的背景底板（纸片风四层里的"背景层"）

纸片风第 3 步：背景底板只保留环境（山水/宫殿/纸纹/撕纸边缘/胶带印章装饰）。
绝对不要把主要人物画进背景——画进去就没法独立飞入、摇摆、调整大小了。

底板命名规范（对应 Remotion scenes.tsx 的 Plate src）：
  public/assets/plates/01-<scene>-bg.png   # 全景底板（偏米白，突出主角）
  public/assets/plates/02-<scene>-bg.png   # 特写底板（深色，突出中央人物）

用法：
  python scripts/gen_plates.py <prompt> <out_path>
  python scripts/gen_plates.py "唐代长安宫殿全景，水墨山脉，宣纸纹理，撕纸边缘" \
      public/assets/plates/01-tang-wide-bg.png

  # 批量：读 plates_spec.yaml（列表，每项 {name, prompt, mood}）
  python scripts/gen_plates.py --batch plates_spec.yaml public/assets/plates/

提示词会自动追加"无人物"约束（见 NO_PERSON_SUFFIX）。
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_apiz import generate_image, DEFAULT_IMAGE_MODEL  # noqa: E402

# 背景底板的核心约束：无人物。
# 这条比任何风格词都重要——人物一旦粘进背景，整个分层动画方案就废了。
NO_PERSON_SUFFIX = (
    "\n\n背景底板约束（必须遵守）："
    "画面中绝对不要出现任何人物（no people, no human figures, no characters）。"
    "只画环境：建筑、山水、纹理、装饰。"
    "复古纸片拼贴质感，宣纸纹理底，扁平色块，轻微纸张阴影层次。"
    "16:9 横幅构图，主体居中略偏下（上方留给标题字幕）。"
)


def gen_one(prompt: str, out_path: Path, model: str, dry_run: bool = False) -> None:
    full_prompt = prompt.strip() + NO_PERSON_SUFFIX
    if dry_run:
        print(f"[dry-run] → {out_path}")
        print(full_prompt)
        print("-" * 60)
        return
    print(f"生成背景底板 → {out_path} ...")
    generate_image(
        prompt=full_prompt,
        out_path=out_path,
        model=model,
        image_size="landscape_16_9",
    )
    print(f"  → {out_path}")


def load_batch(spec_path: Path) -> list[dict]:
    import yaml  # type: ignore
    data = yaml.safe_load(spec_path.read_text(encoding="utf-8"))
    assert isinstance(data, list), "plates_spec.yaml 顶层应为列表"
    return data


def main():
    parser = argparse.ArgumentParser(
        description="用 apiz 生成纸片风背景底板（无人物，纯环境）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
关键：背景底板绝不能含人物。提示词会自动追加无人物约束。
拆成独立 PNG 的角色由 gen_characters.py + split_sheet_green.py 另行处理。
""",
    )
    parser.add_argument("prompt_or_spec", help="提示词（单张）或 plates_spec.yaml（批量）")
    parser.add_argument("out", help="输出路径（单张）或目录（批量）")
    parser.add_argument("--batch", action="store_true", help="批量模式，读 yaml")
    parser.add_argument(
        "--model", default=DEFAULT_IMAGE_MODEL,
        help=f"apiz 模型 id（默认 {DEFAULT_IMAGE_MODEL}）",
    )
    parser.add_argument("--dry-run", action="store_true", help="只打印提示词不生成")
    args = parser.parse_args()

    if args.batch:
        spec = load_batch(Path(args.prompt_or_spec))
        out_dir = Path(args.out)
        out_dir.mkdir(parents=True, exist_ok=True)
        for item in spec:
            name = item["name"]
            out_path = out_dir / f"{name}.png"
            if out_path.exists():
                print(f"{name} 已存在，跳过")
                continue
            gen_one(item["prompt"], out_path, args.model, args.dry_run)
    else:
        gen_one(args.prompt_or_spec, Path(args.out), args.model, args.dry_run)


if __name__ == "__main__":
    main()
