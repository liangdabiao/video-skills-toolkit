---
name: wechat-article-remotion
description: 用 Remotion 把任意一篇微信公众号文章（mp.weixin.qq.com）转成 Studio 风格的视频：暖白画布 + 上下镜像透视格子 + 顶部章节进度 + 底部无底色黑字字幕 + 公众号原文图完整保留（object-fit: contain 永不裁切）。6 个场景类型（cover/list/stat/compare/outro + article-image），与 talking-head-remotion 共用字体和 SFX 公共素材库。当用户要转一篇公众号文章、把公众号链接变成可发布的视频、或复刻任意一篇微信文章为 Remotion 工程时，必须使用这个 skill。
---

# WeChat Article Remotion

把任意一篇微信公众号文章转成 Studio 风格的 Remotion 视频。主舞台给足空间给图片和文字，**完全没有 PIP**。

## 视觉核心

- 暖白画布 `#f7f8f3` + 上下镜像透视格子背景
- 顶部黑色章节进度条（白色填充）
- 底部无底色黑字字幕，关键词蓝色 `#2f6fff` 强调
- 默认画幅 1920×1080 @ 30fps 横屏
- **公众号图片永远 `object-fit: contain`，永不裁切**（铁律）

与 [talking-head-remotion](../talking-head-remotion/SKILL.md) 的差异：

| 维度 | talking-head-remotion | wechat-article-remotion |
|---|---|---|
| 场景 | 5（cover/list/stat/compare/outro） | 6（+ article-image） |
| PIP | 右下圆形 206px | **无** |
| 视觉调性 | Studio 暖白 | Studio 暖白（一致） |
| 公共素材库 | 字体/SFX/动效组件 | **完全共用** |

## 输入要求

- **公众号文章 URL（必填）**：`https://mp.weixin.qq.com/s/xxx`
- TTS 配音、字幕可选；脚本与音频按需由 pipeline 生成

## 新项目：先跑脚手架

```bash
python3 skills/wechat-article-remotion/scripts/scaffold_wechat_article_project.py \
  --project-dir ./demo-wx-article \
  --title "示例公众号文章" \
  --article-url "https://mp.weixin.qq.com/s/xxxxx"

cd demo-wx-article
npm install
npm run still
```

脚手架自动从 [talking-head-remotion 公共素材库](../talking-head-remotion/assets/library/) 播种字体（Noto Sans SC / Space Grotesk）和 SFX。

## 端到端 pipeline

```text
用户：https://mp.weixin.qq.com/s/xxx
   │
   ▼
[1] scripts/fetch_article.py
    · ideaflow API → markdown
    · 提取 ![](url) + 下载原文图到 public/assets/article-images/img-NN.jpg
    · PIL 读每张图 WxH → imageAspect
    · 写 work/source/article.md 和 work/source/images.json
   │
   ▼
[2] 运行时 LLM 拆稿（在本会话里执行）
    · 按 references/beat-checklist.md 拆 6-12 个 scene
    · 输出 scenes[]、captions[]、chapters[] 到 src/demoData.ts
   │
   ▼
[3] scripts/generate_tts.py
    · 调 audio-to-subtitles 的 bun CLI
    · 输出 voice.m4a、voice.mp3、captions.srt
   │
   ▼
[4] 用真实音频时长回写 demoData.ts 的 captions time
   │
   ▼
[5] npm run typecheck / still / render:preview
   │
   ▼
[6] Subagent 独立视觉审核
    · 每场景抽"开始 0.3s"和"中段"两帧
    · 重点：图片 contain 不裁切、关键词不先于字幕、每场景元素数 ≤ 5
   │
   ▼
[7] npm run render → 最终 mp4
```

## 6 个场景类型

| kind | 用途 | 数据关键字段 |
|---|---|---|
| `cover` | 开头标题 | `eyebrow, titleLines, subtitle` |
| `list` | 步骤、要点、清单 | `eyebrow, heading, items[]` |
| `stat` | 数据、金句 | `eyebrow, number, unit, title, metrics[]` |
| `compare` | 对比、选 A/B | `eyebrow, heading, choices[]` |
| `outro` | 结尾 CTA | `eyebrow, title, subtitle` |
| **`article-image`** | **公众号原文图完整展示** | `eyebrow, imageSrc, imageAspect, title, caption?, source?` |

详见 [references/scene-types.md](references/scene-types.md)。

## 不能妥协的硬规则

1. **公众号图片永远 `object-fit: contain`**，永不裁切 —— Code Review 看到 `object-fit: cover` 用在 article image 上即 fail。
2. **每屏 ≤ 5 个文字元素 + 至少一个非文字视觉主体**（沿用 talking-head-remotion 硬规则）。`article-image` 场景的非文字主体就是那张图。
3. **逐元素进场**：`article-image` 场景里图片 / 标题 / 解读 / 图源各有 `appearAt`，错开 0.18s 进场。
4. **数据驱动**：`demoData.ts` 是唯一真相，component 内不写死画面。
5. **音画强同步**：用「前 1s / 后 0.5s 双帧」抽帧审计，关键词不能先于字幕。
6. **共用 talking-head-remotion 公共素材库** —— 字体/SFX 用 `seed_from_library()` 复制，新动效回流到 `talking-head-remotion/assets/library/animations/`。
7. **国际化（i18n）先不处理**，按 user_profile 偏好默认中文。

## 常用命令

```bash
npm install
npm run typecheck         # tsc --noEmit
npm run still             # 渲 1 帧静态图（校对场景布局）
npm run render:preview    # 低清 proof（先出这个）
npm run render            # 正式 1080p
```

## 渲染调试节奏

- 默认先出低清 proof（`npm run render:preview`），不要一上来跑 1920×1080 全片。
- 长渲染把输出重定向到 `work/render.log`，只 tail 日志尾部。
- 用户打断后先检查后台进程：`pgrep -fl "remotion|chrome-headless|Google Chrome for Testing|Chromium"`。
- 不要用模糊的 CLI 探测命令（如 `remotion render --help`），优先看 `package.json` 里已有脚本或官方文档。

## 相关 references

- [references/visual-guide.md](references/visual-guide.md) —— 视觉规范、动效词汇表、抽帧检查清单
- [references/scene-types.md](references/scene-types.md) —— 6 个场景的详细数据模型和动效配方
- [references/beat-checklist.md](references/beat-checklist.md) —— 拆稿 beat checklist 模板
