"""lib_apiz.py — apiz CLI 封装（图片生成 / TTS / 上传）

被 gen_plates.py、gen_characters.py、gen_tts.py 共用。
apiz 是已安装的本地 CLI（~/.local/bin/apiz），统一鉴权（~/.config/apiz/config.toml）。

关键设计：
- generate 没有 --output-file，成功后图片 URL 在 JSON 里，需自己 urllib 下载。
- generate 的错误输出是单行 `Error: ...`（非 JSON），returncode!=0 时直接抛 stderr。
- 图片 URL 的确切 JSON 路径因余额不足未能实跑确认，所以 extract_image_url() 用
  多路径兜底（output.images[].url / download_url / cdn_url / video_url ...）。
  首次使用时脚本会把完整 JSON dump 到 .last_generate.json 方便人工校准。
"""
from __future__ import annotations
import json
import os
import subprocess
import urllib.request
from pathlib import Path

# apiz 二进制位置（Windows Git Bash 环境）
APIZ_BIN = os.environ.get("APIZ_BIN", "apiz")

# 默认模型（与 theme.ts 的 DEFAULT_IMAGE_MODEL 对齐）
DEFAULT_IMAGE_MODEL = "fal-ai/nano-banana-pro"

# 默认超时（图片生成可能较慢，特别是 --wait 轮询）
DEFAULT_TIMEOUT = 600  # 10 分钟


def _run_apiz(args: list[str], timeout: int = DEFAULT_TIMEOUT) -> dict:
    """跑 apiz 子命令，返回解析后的 JSON dict。

    apiz 错误时输出单行 `Error: ...` 且 returncode=1，这里直接抛 RuntimeError。
    """
    cmd = [APIZ_BIN] + args + ["--json"]
    proc = subprocess.run(
        cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8"
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(f"apiz 失败 (exit {proc.returncode}): {err or '未知错误'}")
    out = proc.stdout.strip()
    if not out:
        return {}
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        # 某些子命令成功时输出非 JSON（如 speak 的 `Saved X (1.23s)`）
        return {"_raw": out}


def extract_image_url(obj: dict) -> str:
    """从 apiz generate 的返回里多路径兜底取图片 URL。

    已知 apiz 任务结构字段（从 CLI 二进制 struct tag 反编译）：
    task_id/status/progress/result/output/queue_info/video_url/audio_url/
    download_url/cdn_url/public_url/original_url/file_url/cover_url/...

    没有 image_url 字段，所以图片 URL 最可能在：
      1. 顶层 download_url / cdn_url / public_url（apiz 自己的封装）
      2. output.images[].url（fal 系原始返回格式）
      3. result.output.images[].url
    """
    # 路径 1：顶层显式字段
    for k in ("image_url", "download_url", "cdn_url", "public_url", "file_url", "url"):
        v = obj.get(k)
        if isinstance(v, str) and v.startswith("http"):
            return v

    # 路径 2：output / result 容器
    for container_key in ("output", "result"):
        container = obj.get(container_key)
        if isinstance(container, dict):
            # 直接放 url
            for k in ("url", "image_url", "image"):
                v = container.get(k)
                if isinstance(v, str) and v.startswith("http"):
                    return v
            # images 数组（fal 格式）
            imgs = container.get("images")
            if isinstance(imgs, list) and imgs:
                first = imgs[0]
                if isinstance(first, str) and first.startswith("http"):
                    return first
                if isinstance(first, dict):
                    for k in ("url", "image_url"):
                        v = first.get(k)
                        if isinstance(v, str) and v.startswith("http"):
                            return v

    # 兜底失败：抛错并提示 dump 位置
    raise RuntimeError(
        "无法从 apiz 返回里定位图片 URL。完整结构已写入 .last_generate.json，"
        "请检查后更新 extract_image_url() 的兜底顺序。"
    )


def generate_image(
    prompt: str,
    out_path: str | Path,
    model: str = DEFAULT_IMAGE_MODEL,
    image_size: str = "landscape_16_9",
    aspect_ratio: str | None = None,
    image_url: str | None = None,
    params: dict | None = None,
    wait: bool = True,
    dump_raw: bool = True,
) -> Path:
    """调 apiz generate 生成图片并下载到 out_path。

    Args:
        prompt: 生图提示词
        out_path: 本地保存路径（.png/.jpg）
        model: apiz 模型 id（默认 nano-banana-pro，最适合纸片/插画风）
        image_size: square_hd/landscape_16_9/portrait_4_3/landscape_4_3/portrait_16_9
        aspect_ratio: 可选，如 '16:9'/'3:4'（部分模型要求）
        image_url: 若提供，nano-banana-pro 自动切图像编辑模式（图生图）
        params: 额外参数，JSON 合并进请求
        wait: 阻塞到任务完成
        dump_raw: 把完整返回 dump 到 .last_generate.json（首次校准用）

    Returns:
        下载后的本地 Path
    """
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    args = [
        "generate", prompt,
        "--model", model,
        "--image-size", image_size,
    ]
    if aspect_ratio:
        args += ["--aspect-ratio", aspect_ratio]
    if image_url:
        args += ["--image-url", image_url]
    if params:
        args += ["--params", json.dumps(params, ensure_ascii=False)]
    if wait:
        args += ["--wait"]

    data = _run_apiz(args)
    if dump_raw:
        Path(".last_generate.json").write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    img_url = extract_image_url(data)
    _download(img_url, out_path)
    return out_path


def speak(
    text: str,
    out_path: str | Path,
    voice: str = "female-shaonv",
    model: str = "speech-2.8-hd",
    speed: float = 1.0,
) -> Path:
    """调 apiz speak (MiniMax TTS) 生成配音。

    apiz speak 内置 --output-file 直接落盘 mp3，不用自己下载。
    model 名用 apiz 的新命名（speech-2.8-hd）；直连 minimaxi API 的 fallback
    在 gen_tts.py 里，用的是旧名 speech-02-hd。

    若 apiz 余额不足或失败，调用方应 fallback 到 gen_tts.call_tts_direct()。
    """
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    args = [
        "speak", text,
        "--voice", voice,
        "--model", model,
        "--speed", str(speed),
        "--output-file", str(out_path),
    ]
    # speak 成功输出非 JSON（`Saved X (1.23s)`），_run_apiz 会包成 {"_raw": ...}
    # 只要 returncode==0 就算成功
    _run_apiz(args, timeout=120)
    if not out_path.exists():
        raise RuntimeError(f"apiz speak 声称成功但文件不存在: {out_path}")
    return out_path


def upload(local_path: str | Path, folder: str = "paper-cutout") -> str:
    """上传本地文件到 apiz CDN，返回 public_url（给 generate --image-url 用）。"""
    data = _run_apiz(["upload", str(local_path), "--folder", folder])
    for k in ("public_url", "cdn_url", "file_url", "url"):
        v = data.get(k)
        if isinstance(v, str) and v.startswith("http"):
            return v
    raise RuntimeError(f"无法从 upload 返回取 URL: {data}")


def transfer(external_url: str, media_type: str = "image") -> str:
    """把外部 URL 镜像进 apiz CDN（免费），返回 apiz CDN URL。"""
    data = _run_apiz(["transfer", external_url, "--type", media_type])
    for k in ("public_url", "cdn_url", "url"):
        v = data.get(k)
        if isinstance(v, str) and v.startswith("http"):
            return v
    raise RuntimeError(f"无法从 transfer 返回取 URL: {data}")


def _download(url: str, out_path: Path) -> None:
    """下载 URL 到本地（apiz generate 无内置下载）。"""
    req = urllib.request.Request(url, headers={"User-Agent": "paper-cutout-skill"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        out_path.write_bytes(resp.read())


if __name__ == "__main__":
    # 自检：确认 apiz 可用 + 鉴权配置
    import shutil
    loc = shutil.which("apiz") or shutil.which(APIZ_BIN)
    print(f"apiz 位置: {loc or '未找到（请确认在 PATH 或设置 APIZ_BIN）'}")
    try:
        data = _run_apiz(["auth", "status"])
        print("鉴权状态:", json.dumps(data, ensure_ascii=False)[:200])
    except RuntimeError as e:
        print(f"鉴权检查失败: {e}")
