"""split_sheet_green.py — 绿幕 chroma key 抠图 + 按网格拆独立透明 PNG

纸片风的核心脚本。对应需求原文里的：
    python scripts/split_sheet.py input.png out_dir close 6

工作原理：
  1. 读入带纯绿背景的素材表 PNG（gen_characters.py 用提示词强制纯绿底生成）
  2. 转 HSV，按绿色范围（hue 90-150, sat>0.3, val>0.2）生成掩码
  3. 掩码取反 → alpha 通道（绿区透明，人物区不透明）
  4. 边缘羽化 + 杂点清理（避免绿边和噪点）
  5. 按网格切分：把整图按 cols×rows 切成 N 个独立透明 PNG
  6. 每个子图自动裁剪到非透明区域的包围盒（trim），去掉四周空白

用法：
    python scripts/split_sheet_green.py <input.png> <out_dir> <prefix> <count>
    python scripts/split_sheet_green.py input.png out_dir close 6 --cols 3 --rows 2
    python scripts/split_sheet_green.py single.png out_dir char 1  # 单人物，不切分只抠图

依赖：Pillow + NumPy（项目已确认安装）。
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


# —— 绿幕检测参数（HSV，numpy 归一化到 0-1） ——
# 提示词强制生成 #00FF00 纯绿，但模型常有色偏/压缩，所以给个宽容范围。
# hue: 绿色在 0.25-0.42（90-150度）；sat/val 阈值排除接近灰/黑的暗区。
GREEN_HUE_MIN, GREEN_HUE_MAX = 0.20, 0.45
GREEN_SAT_MIN = 0.25
GREEN_VAL_MIN = 0.15

# 边缘羽化半径（px）。去绿后人物边缘可能有绿残留，轻微羽化+阈值化清理。
EDGE_FEATHER = 2
# 杂点清理：alpha 图做形态学开运算的最小核大小
DESPACLE_KERNEL = 3


def chroma_key_green(img: Image.Image) -> Image.Image:
    """把纯绿背景变成透明 alpha。返回 RGBA。

    步骤：
      RGB → HSV → 绿色掩码 → 取反为 alpha → 边缘清理 → 合成 RGBA
    """
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.float32) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    # 转 HSV（手算，避免依赖 colorsys 逐像素太慢）
    # 标准 HSV 公式：H 用色相扇区基准（红0/绿2/蓝4）+ 段内偏移，结果归一化到 0-1。
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    delta = mx - mn
    safe_delta = np.where(delta == 0, 1, delta)
    hue = np.zeros_like(mx)
    # 红色扇区（mx==r）
    red_mask = (mx == r) & (delta > 0)
    hue[red_mask] = (((g - b) / safe_delta)[red_mask] % 6.0) / 6.0
    # 绿色扇区（mx==g）：基准 2 + (b-r)/delta，纯绿(0,255,0) → (2+0)/6=0.333 ✓
    green_sector = (mx == g) & (delta > 0)
    hue[green_sector] = (2.0 + ((b - r) / safe_delta)[green_sector]) / 6.0
    # 蓝色扇区（mx==b）：基准 4 + (r-g)/delta
    blue_sector = (mx == b) & (delta > 0)
    hue[blue_sector] = (4.0 + ((r - g) / safe_delta)[blue_sector]) / 6.0
    hue = hue % 1.0
    sat = np.where(mx == 0, 0, delta / np.where(mx == 0, 1, mx))
    val = mx

    # 绿幕判定：hue 在绿色范围 + 饱和度足够 + 不太暗
    # 纯绿 (0,255,0) 的理论 hue=0.333(120°)，给宽容范围应对色偏/压缩
    is_green = (
        (hue >= GREEN_HUE_MIN)
        & (hue <= GREEN_HUE_MAX)
        & (sat >= GREEN_SAT_MIN)
        & (val >= GREEN_VAL_MIN)
    )

    # alpha = 非绿区
    alpha = np.where(is_green, 0.0, 1.0)

    # 边缘清理：对 alpha 做轻微模糊再阈值化，去掉绿边和单像素噪点
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8), mode="L")
    if EDGE_FEATHER > 0:
        alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=EDGE_FEATHER))
        # 模糊后再二值化（阈值 128），保持硬边缘但去掉半透明绿残留
        alpha_arr = np.array(alpha_img, dtype=np.float32) / 255.0
        alpha_arr = np.where(alpha_arr > 0.5, 1.0, 0.0).astype(np.float32)
    else:
        alpha_arr = alpha

    # 形态学开运算去小杂点（用最小核腐蚀再膨胀）
    alpha_arr = _morph_open(alpha_arr, DESPACLE_KERNEL)

    # 合成 RGBA：原 RGB + 新 alpha。用 ndarray 操作再转回 Image。
    out_arr = np.array(rgba, dtype=np.uint8).copy()
    out_arr[..., 3] = (alpha_arr * 255).astype(np.uint8)
    return Image.fromarray(out_arr, mode="RGBA")


def _morph_open(alpha: np.ndarray, ksize: int) -> np.ndarray:
    """简易形态学开运算（腐蚀→膨胀），去掉 alpha 里的小白点/小黑点。

    用 PIL 的 MinFilter/MaxFilter 实现，避免依赖 scipy/scikit-image。
    """
    if ksize <= 1:
        return alpha
    img = Image.fromarray((alpha * 255).astype(np.uint8), mode="L")
    # 腐蚀（取邻域最小）→ 去掉零星白点（人物区的绿杂点残留）
    img = img.filter(ImageFilter.MinFilter(ksize))
    # 膨胀（取邻域最大）→ 恢复人物主体
    img = img.filter(ImageFilter.MaxFilter(ksize))
    return np.array(img, dtype=np.float32) / 255.0


def trim_to_alpha(img: Image.Image) -> Image.Image:
    """裁剪到非透明区域的包围盒（trim），去掉四周透明空白。

    避免拆出来的角色 PNG 带一大圈透明 padding，影响 Remotion 里的尺寸控制。
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    alpha = img.split()[3]
    bbox = alpha.getbbox()  # (left, upper, right, lower)，全透明时返回 None
    if bbox is None:
        # 整张透明（抠图失败的信号），原样返回让调用方发现
        return img
    return img.crop(bbox)


def split_grid(img: Image.Image, cols: int, rows: int) -> list[Image.Image]:
    """把图片按 cols×rows 网格切成 N 块（从左到右、从上到下）。"""
    w, h = img.size
    cell_w = w // cols
    cell_h = h // rows
    pieces = []
    for r in range(rows):
        for c in range(cols):
            box = (c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h)
            pieces.append(img.crop(box))
    return pieces


def process_sheet(
    input_path: Path,
    out_dir: Path,
    prefix: str,
    count: int,
    cols: int | None = None,
    rows: int | None = None,
) -> list[Path]:
    """主流程：抠图 → 拆分 → trim → 保存。

    Args:
        input_path: 输入素材表 PNG（纯绿背景）
        out_dir: 输出目录
        prefix: 文件名前缀（如 "close"、"emperor"）
        count: 期望拆出的人物数（决定 cols×rows）
        cols/rows: 显式指定网格；不填则自动推算（尽量接近正方形）
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    img = Image.open(input_path)
    print(f"输入: {input_path}  尺寸: {img.size}")

    # 1. 绿幕抠图
    cutout = chroma_key_green(img)
    # 中间产物：保存完整抠图结果供检查（debug 用，可删）
    debug_path = out_dir / f"{prefix}-full-alpha.png"
    cutout.save(debug_path)
    print(f"  抠图完成 → {debug_path}")

    # 2. 决定网格
    if count <= 1:
        # 单人物：只抠图不拆分
        trimmed = trim_to_alpha(cutout)
        out_path = out_dir / f"{prefix}-1.png"
        trimmed.save(out_path)
        print(f"  单人物 → {out_path}  尺寸: {trimmed.size}")
        return [out_path]

    if cols is None or rows is None:
        cols, rows = _auto_grid(count)
    total_cells = cols * rows
    if total_cells < count:
        print(
            f"  ⚠️ 网格 {cols}×{rows}={total_cells} 小于 count={count}，"
            f"扩到 {total_cells} 格（会有空格）"
        )

    # 3. 拆分
    pieces = split_grid(cutout, cols, rows)
    # 4. 逐块 trim + 保存
    results = []
    for i, piece in enumerate(pieces, 1):
        trimmed = trim_to_alpha(piece)
        # 跳过全透明的空格（网格多于实际人物时）
        alpha = trimmed.split()[3]
        if alpha.getbbox() is None:
            print(f"  跳过空格 #{i}")
            continue
        out_path = out_dir / f"{prefix}-{i}.png"
        trimmed.save(out_path)
        print(f"  → {out_path.name}  尺寸: {trimmed.size}")
        results.append(out_path)

    print(f"完成：{len(results)} 个独立 PNG")
    return results


def _auto_grid(count: int) -> tuple[int, int]:
    """根据人物数推算尽量接近正方形的网格。"""
    import math

    cols = math.ceil(math.sqrt(count))
    rows = math.ceil(count / cols)
    return cols, rows


def main():
    parser = argparse.ArgumentParser(
        description="绿幕 chroma key 抠图 + 网格拆分（纸片风角色素材处理）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
示例：
  # 6 个人物的素材表，自动推算网格
  python split_sheet_green.py source/close-six-alpha.png layers close 6

  # 显式 3 列 2 行
  python split_sheet_green.py source/sheet.png layers char 6 --cols 3 --rows 2

  # 单人物（只抠图不拆）
  python split_sheet_green.py source/emperor.png layers emperor 1
""",
    )
    parser.add_argument("input", help="输入素材表 PNG（纯绿背景）")
    parser.add_argument("out_dir", help="输出目录")
    parser.add_argument("prefix", help="输出文件名前缀（如 close/emperor）")
    parser.add_argument("count", type=int, help="期望拆出的人物数（1=只抠图）")
    parser.add_argument("--cols", type=int, default=None, help="网格列数（不填自动推算）")
    parser.add_argument("--rows", type=int, default=None, help="网格行数（不填自动推算）")
    args = parser.parse_args()

    results = process_sheet(
        Path(args.input),
        Path(args.out_dir),
        args.prefix,
        args.count,
        args.cols,
        args.rows,
    )
    if not results:
        print("⚠️ 没有产出任何 PNG——检查输入图是否真的是纯绿背景，或调整 GREEN_* 阈值", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
