# Video Skills Toolkit

这是一个把短视频生产流程沉淀成可复用 agent skills 的工具包。它不是单个成片项目，而是五类常用视频能力的模板和工作流集合：

- `talking-head-remotion`：口播视频 Remotion 工程模板，包含 16:9 Studio 风格、顶部章节进度、右下角圆形 PIP、字幕安全区、音效/BGM 规划和脚手架。
- `wechat-article-remotion`：**微信公众号文章转视频** Remotion 工程模板，把任意一篇 mp.weixin.qq.com 文章转成 Studio 风格视频，完整保留公众号原文图（object-fit: contain 永不裁切）。无 PIP，主舞台给足空间给图片和文字。
- `geometry-math-proof-remotion`：**数学证明 / 几何动画** Remotion 工程模板，深底高饱和 + 精准 SVG 几何 + 公式逐步揭示，3Blue1Brown / 可汗学院风格。勾股定理、欧拉公式、积分、算法可视化都能做。
- `sketch-story-remotion`：小白学 AI 系列手绘故事视频模板，包含米白纸底、火柴人、Q 萌 AI 小智、手绘线框、箭头和红圈动画。
- `audio-to-subtitles`：把音频/视频转成字幕和逐字稿的工具流，支持 SRT、VTT、JSON，也支持先生成 TTS 再转字幕。

## 核心心法

> 原文：[用AI做了一个月视频，想跟你分享这套没人讲的心法](https://waytoagi.feishu.cn/wiki/DRK4waBfIi41B1k2eOLcpDbwnRY)

### 一句话心法

**先写逐字稿，生成音频，拿到字幕文件，用字幕文件驱动所有动画，最后配音效和 BGM，低画质调试，确认没问题再出高画质。**

那些教程做出来的视频为什么烂，原因就藏在这句话里。它们把视频当成"生成画面"来做，但视频其实是一条**以声音为轴的时间线**。字幕文件是整条视频的唯一基准，画面、动画、音效全部要对齐到它。没有这条轴，你做出来的就是一堆各自为政的画面。

### 简单使用

首先配置好 minimax key ，用来生成语音。

❯ wechat-article-remotion skill 制作短视频：https://mp.weixin.qq.com/s/hMNI7upW8AGmii-VVNiknw

❯  talking-head-remotion skill 制作： 介绍github项目 https://github.com/liangdabiao/Reddit_Business_Idea_Validator

❯  sketch-story-remotion skill 制作： 制作一个手绘故事视频： 罗小福学skill遇到困难的故事

❯ 数学证明视频：反证法证明√2是无理数



### 音频是整条视频的骨架

大部分人做 AI 视频，声音是最后才想起来配的。这个顺序就错了。**声音应该是第一步。**

一切从逐字稿开始——不管做什么视频，先把逐字稿写完，口语化的也行。它决定了整条时间线的长度和节奏，后面所有东西都从它推导。

整条流水线：

```
逐字稿 → TTS 音频 → 字幕文件 → 画面动画 → 音效 / BGM → 低清 proof → 高清出片
         ↑
       一切的起点
```

![Talking Head Remotion template start](动画.gif)

## 实际生成效果

公众号文章转视频：https://www.bilibili.com/video/BV1LMKJ6cEwb/?vd_source=86926e418c83af75f6850b5546388a79

github项目转视频介绍： https://www.bilibili.com/video/BV15uKJ68Etq/?vd_source=86926e418c83af75f6850b5546388a79

## What's Inside

```text
video-skills-toolkit/
├── examples/
│   └── talking-head-template-start.png
└── skills/
    ├── talking-head-remotion/
    ├── wechat-article-remotion/
    ├── geometry-math-proof-remotion/
    ├── sketch-story-remotion/
    └── audio-to-subtitles/
```

## Quick Start

### Talking Head Remotion

```bash
python3 skills/talking-head-remotion/scripts/scaffold_talking_head_remotion_project.py \
  --project-dir ./demo-talking-head \
  --title "Demo Talking Head"

cd demo-talking-head
npm install
npm run still
```

这个模板的初始状态会刻意留空中间舞台，只保留背景、顶栏、PIP 框和字幕样式。真正制作视频时，再按字幕和口播节奏逐个填入画面元素。

### WeChat Article Remotion

```bash
python3 skills/wechat-article-remotion/scripts/fetch_article.py \
  --url "https://mp.weixin.qq.com/s/xxxxx" \
  --out-dir ./demo-wx-article

cd demo-wx-article
npm install
npm run still
```

核心特点：

- 6 个场景类型：`cover` / `list` / `stat` / `compare` / `outro` / **`article-image`**
- 公众号原文图 `object-fit: contain` 永不裁切，保留图片里的文字信息
- 无 PIP，主舞台完全给图片和文字
- 与 `talking-head-remotion` 共用字体 / SFX 公共素材库

### Geometry Math Proof Remotion

```bash
cp -R skills/geometry-math-proof-remotion/templates/remotion-project ./demo-math-proof
cd demo-math-proof
npm install
npx remotion still src/index.ts Proof out/check.png
```

核心特点：

- **深底高饱和**：`#0d0d12` 深色画布 + 红蓝绿黄四色（黄=最终结论）
- **精准 SVG 几何**：全部代码绘制，`stroke-dasharray` 做"被画出来"动画
- **公式逐步揭示**：右侧 700×820 面板，一步一步推导，最终结论黄框大字
- **字幕驱动时间轴**：先跑 TTS 拿真实时长，再回写 `F` 关键帧对象
- **章节版式**：钩子(H) → 准备(P) → 推导 1~N → 消项/合成(E) → 收尾(F)
- 适用：勾股定理、欧拉公式、积分、算法可视化、3Blue1Brown 风格视频

### Sketch Story Remotion

```bash
cp -R skills/sketch-story-remotion/templates/remotion-project ./demo-sketch-story
cd demo-sketch-story
npm install
npx remotion still Episode out/check.png
```

这个模板适合做“小白学 AI”这种手绘故事视频，全部图形由代码绘制，不依赖图片素材。

### Audio To Subtitles

```bash
SKILL_DIR="$(pwd)/skills/audio-to-subtitles"
npx -y bun "$SKILL_DIR/scripts/main.ts" audio.mp3 --language zh-CN --out-dir subtitles
```

本工具会调用外部服务生成字幕。你需要自己提供 MediaKit、R2 或 MiniMax 等 API 环境变量；仓库里不包含任何真实密钥。

## Article Blurb

如果要在文章里介绍，可以这样写：

> 这套 Video Skills Toolkit 是我做视频时沉淀出来的一组 agent skills：口播视频、公众号文章转视频、数学证明几何动画、手绘故事视频、音频转字幕。它们把脚本、配音、字幕、画面节奏和 Remotion 工程结构串成了一条可复用的视频生产线。

## Notes

- 公开版已把本机绝对路径替换为占位路径，例如 `<VIDEO_WORKSPACE>` 和 `<NOTES_VAULT>`。
- 仓库只保留来源明确的字体和音效素材；真实项目里的私有素材、API key 和 `.env` 文件不应提交。
- `audio-to-subtitles` 只提交脚本和说明，运行时需要你自己的服务凭证。

- 特别感谢 https://linux.do 社区佬友