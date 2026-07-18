"""gen_characters.py — 用 apiz (nano-banana-pro) 生成角色素材表（纯绿背景）

纸片风第 4 步：生成角色。关键约束（需求原文）：
  - 提示词必须强制：朝向、完整全身、白色剪纸描边、纯色背景（绿）、无文字水印
  - 人物必须独立生成，不能画进背景
  - 一组人物可生成一张素材表（多人排列），再用 split_sheet_green.py 拆成独立 PNG

流程：
  读 assets_spec.yaml（角色清单）→ 循环调 apiz generate → 下载到 public/assets/source/
  → 提示用户跑 split_sheet_green.py 拆分

用法：
  python scripts/gen_characters.py assets_spec.yaml public/assets/source/
  python scripts/gen_characters.py assets_spec.yaml out/ --model fal-ai/nano-banana-pro

assets_spec.yaml 格式：
  - name: emperor           # 文件名（不带扩展名）
    role: primary           # primary/secondary/tertiary（仅记录用，不影响生图）
    prompt: |
      唐代皇帝全身，坐龙椅，身体朝右，右手抬起。
      中国古籍线描与复古纸片拼贴风，金色龙袍。
  - name: ministers
    role: tertiary
    sheet: 6                # 一张图放 6 个人（素材表），生成后用 split_sheet 拆
    prompt: |
      六名唐代群臣站成一排，朝向正面。
      ...
  # 所有 prompt 会自动追加统一的"纯绿背景+描边+无文字"约束（见 ENFORCE_SUFFIX）
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

# lib_apiz 在同目录
sys.path.insert(0, str(Path(__file__).parent))
from lib_apiz import generate_image, DEFAULT_IMAGE_MODEL  # noqa: E402

# 统一追加的视觉约束（保证能抠图 + 风格一致）
# 这是纸片风能成立的硬条件——没有纯绿底就没法 chroma key，没有白描边就没有剪纸感。
ENFORCE_SUFFIX = (
    "\n\n视觉风格约束（必须遵守）："
    "白色剪纸描边（粗白边勾轮廓），复古纸片拼贴质感，扁平纯色块。"
    "纯绿色背景 #00FF00（pure solid green screen，方便抠图），"
    "不要场景，不要道具环境，不要其他人物（除非指定多人素材表），"
    "不要文字，不要水印，不要签名。"
    "人物必须完整，不要裁掉头、手、脚。"
)

# 多人素材表的额外约束
SHEET_SUFFIX = (
    " 人物横向均匀排列，互相不重叠，留出足够间距便于裁切。"
)


def load_spec(spec_path: Path) -> list[dict]:
    """读 assets_spec.yaml。手写一个极简 yaml 解析，避免依赖 PyYAML（虽然项目里有）。"""
    try:
        import yaml  # type: ignore
        data = yaml.safe_load(spec_path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError("assets_spec.yaml 顶层应为列表（每项一个角色）")
        return data
    except ImportError:
        print("⚠️ 未装 PyYAML，请 pip install pyyaml", file=sys.stderr)
        raise


def build_prompt(item: dict) -> str:
    """组装完整提示词 = 用户 prompt + 统一约束。"""
    prompt = item["prompt"].strip()
    full = prompt + ENFORCE_SUFFIX
    if item.get("sheet"):  # 多人素材表
        full += SHEET_SUFFIX
    return full


def main():
    parser = argparse.ArgumentParser(
        description="用 apiz 生成纸片风角色素材（纯绿背景，待 split_sheet_green 抠图）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
生成完成后，用 split_sheet_green.py 拆分：
  python scripts/split_sheet_green.py out/ministers.png public/assets/layers minister 6
""",
    )
    parser.add_argument("spec", help="assets_spec.yaml 路径")
    parser.add_argument("out_dir", help="输出目录（建议 public/assets/source/）")
    parser.add_argument(
        "--model", default=DEFAULT_IMAGE_MODEL,
        help=f"apiz 模型 id（默认 {DEFAULT_IMAGE_MODEL}）",
    )
    parser.add_argument(
        "--image-size", default="portrait_4_3",
        help="单人用 portrait_4_3；多人素材表用 landscape_16_9",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="只打印提示词不实际生成（省积分，用来检查 spec）",
    )
    args = parser.parse_args()

    spec = load_spec(Path(args.spec))
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"共 {len(spec)} 个角色/素材表待生成")
    if args.dry_run:
        print("=" * 60)
        for item in spec:
            print(f"\n[{item['name']}] ({item.get('role', '?')})")
            print(build_prompt(item))
        print("=" * 60)
        print("(dry-run，未实际生成)")
        return

    for i, item in enumerate(spec, 1):
        name = item["name"]
        prompt = build_prompt(item)
        # 多人素材表用横图，单人用竖图
        image_size = "landscape_16_9" if item.get("sheet") else args.image_size
        out_path = out_dir / f"{name}.png"
        if out_path.exists():
            print(f"[{i}/{len(spec)}] {name} 已存在，跳过（删掉可重新生成）")
            continue
        print(f"[{i}/{len(spec)}] 生成 {name} ... (size={image_size})")
        try:
            generate_image(
                prompt=prompt,
                out_path=out_path,
                model=args.model,
                image_size=image_size,
            )
            print(f"    → {out_path}")
        except RuntimeError as e:
            print(f"    ✗ 失败: {e}", file=sys.stderr)
            print(f"      （apiz 余额不足？跑 `apiz account balance` 查看）", file=sys.stderr)

    print(f"\n完成。下一步对多人素材表跑：")
    print(f"  python scripts/split_sheet_green.py <sheet>.png public/assets/layers <prefix> <count>")


if __name__ == "__main__":
    main()
