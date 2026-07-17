# WeChat Article Remotion

把任意一篇微信公众号文章（`https://mp.weixin.qq.com/s/...`）转成 Studio 风格的 Remotion 视频。

## 视觉规范

- 暖白画布 `#f7f8f3` + 上下镜像透视格子背景
- 顶部黑色章节进度条（白色填充）
- 底部无底色黑字字幕，关键词蓝色 `#2f6fff` 强调
- **完全不要 PIP**（与 talking-head-remotion 不同）—— 主舞台给足空间给公众号原文图
- 默认画幅 1920×1080 @ 30fps 横屏

## 场景类型

6 个场景（5 基础 + 1 新增）：

| kind | 用途 | 数据模型 |
|---|---|---|
| `cover` | 开头标题 | `{eyebrow, titleLines, subtitle}` |
| `list` | 步骤、要点、清单 | `{eyebrow, heading, items[]}` |
| `stat` | 数据、金句 | `{eyebrow, number, unit, title, metrics[]}` |
| `compare` | 对比、选 A/B | `{eyebrow, heading, choices[]}` |
| `outro` | 结尾 CTA | `{eyebrow, title, subtitle}` |
| **`article-image`** | **公众号原文图完整展示** | `{eyebrow, imageSrc, imageAspect, title, caption?, source?}` |

`article-image` 铁律：**`object-fit: contain`，永不裁切**。`imageAspect` 由 PIL 预读，宽图（≥1.78）按宽度优先，长图按高度优先。

## 公共素材库

与 `talking-head-remotion` 共享 `assets/library/`：
- 字体（Noto Sans SC / Space Grotesk）由脚手架自动播种到 `public/assets/fonts/`
- SFX（`assets/library/sfx/`）按需播种
- 新动效组件按需从 `talking-head-remotion/assets/library/animations/` 拷贝

## 工作流（端到端）

```bash
# 1. 脚手架：复制模板 + 播种字体
python3 skills/wechat-article-remotion/scripts/scaffold_wechat_article_project.py \
  --project-dir ./demo-wx-article \
  --title "示例公众号文章"

cd demo-wx-article
npm install

# 2. 抓公众号文章
python3 ../skills/wechat-article-remotion/scripts/fetch_article.py \
  --url "https://mp.weixin.qq.com/s/xxxxx" \
  --out-dir .

# 3. 运行时 LLM 拆稿（在本会话里执行，按 references/beat-checklist.md）
# → 写到 src/demoData.ts

# 4. TTS + 字幕对齐
python3 ../skills/wechat-article-remotion/scripts/generate_tts.py \
  --script work/script.md \
  --out-dir .

# 5. 渲染
npm run typecheck
npm run still
npm run render:preview   # 先出低清 proof
npm run render           # 正式版
```

## 不能妥协的硬规则

1. **公众号图片永远 `object-fit: contain`**，永不裁切 —— Code Review 看到 `object-fit: cover` 用在 article image 上即 fail。
2. **每屏 ≤ 5 个文字元素 + 至少一个非文字视觉主体**（沿用 talking-head-remotion 硬规则）。`article-image` 场景的非文字主体就是那张图。
3. **逐元素进场**：`article-image` 场景里图片 / 标题 / 解读 / 图源各有 `appearAt`，错开 0.18s 进场。
4. **数据驱动**：`demoData.ts` 是唯一真相，component 内不写死画面。
5. **音画强同步**：用「前 1s / 后 0.5s 双帧」抽帧审计，关键词不能先于字幕。
6. **共用 talking-head-remotion 公共素材库** —— 字体/SFX 用 `seed_from_library()` 复制，新动效回流到 `talking-head-remotion/assets/library/animations/`。

## 目录结构

```text
demo-wx-article/
├── package.json
├── tsconfig.json
├── public/
│   └── assets/
│       ├── fonts/             # 脚手架自动播种
│       ├── audio/
│       │   ├── voice.m4a      # TTS 配音
│       │   └── voice.mp3
│       ├── article-images/    # 抓回来的公众号原文图
│       └── music/             # 可选 BGM
├── renders/
├── work/
│   ├── source/
│   │   ├── article.md
│   │   └── images.json       # 图片宽高比清单
│   ├── audio/generated/      # 分段 TTS
│   ├── captions/             # 字幕文件
│   └── lessons/LESSONS.md
└── src/
    ├── index.ts
    ├── Root.tsx
    ├── ArticleVideo.tsx       # 主组合
    ├── background.tsx         # PremiumGridBackground
    ├── sceneTypes.tsx         # 6 个场景类型
    ├── demoData.ts            # 数据
    ├── shared.ts              # progress / frame / clamp 工具
    └── theme.ts               # 颜色 / 字体 / 版式常量
```

## 常用命令

```bash
npm run typecheck       # tsc --noEmit
npm run still           # 渲 1 帧静态图
npm run render:preview  # 低清 proof（先出这个）
npm run render          # 正式 1080p
```

## 与 talking-head-remotion 的差异

| 维度 | talking-head-remotion | wechat-article-remotion |
|---|---|---|
| 场景 | 5（cover/list/stat/compare/outro） | 6（+ article-image）|
| PIP | 右下圆形 206px | **无** |
| 字幕安全区 | 避开 PIP | 主舞台给足空间 |
| 顶栏 | 章节进度 | 章节进度（一致）|
| 视觉调性 | Studio 暖白 | Studio 暖白（一致）|
