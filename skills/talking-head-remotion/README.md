# Talking Head Remotion · 口播视频模板

一套 Studio 风格的 Remotion 口播视频工程模板：暖白画布 + 顶部章节进度 + 右下角圆形 PIP + 底部字幕安全区。脚手架一键生成可运行项目，配跨项目公共素材库（字体、SFX、动效组件）。

> 口播视频的时间轴只有一个真相——声音。字幕从声音来，画面从字幕来，音效也从字幕来。顺序倒了，做出来就是一堆各自为政的画面。

---

## 这是什么

一个开箱即用的 Remotion 口播视频脚手架，适合做：

- 🎙️ 知识类口播讲解
- 💻 带录屏 / 截图的教程视频
- 📊 数据 / 观点类视频（配合 stat / compare / list 场景）
- 📺 任何需要"人在画面里讲"的视频

## 核心原理：声音是骨架

很多人做口播视频习惯先排画面再配音。这个顺序是反的。

**正确顺序：逐字稿 → TTS 音频 → 字幕 → 画面动画 → SFX / BGM**

```
逐字稿（决定节奏）
    ↓
TTS 音频（唯一真相）
    ↓
字幕文件（时间轴基准）
    ↓
画面元素进场 / 场景切换 / 关键词强调
    ↓ 全部对齐到字幕
SFX / BGM / 转场
```

**为什么？** 因为人的感知是"先听到、再看到"。画面比声音慢 0.3 秒你会觉得卡，但声音比画面慢 0.1 秒你就觉得不对。所以声音必须是第一性的，所有东西围着它转。

## 工具链

```
口播素材（音频或视频）
    │
    ├─→ audio-to-subtitles skill → 字幕文件（srt / vtt / json）
    │
    ├─→ 脚手架 scaffold 生成项目骨架
    │       └─ 播种字体 / SFX / 公共动效组件
    │
    └─→ Remotion 按字幕排画面
            ├─ cover / list / stat / compare / outro 5 种场景
            ├─ 顶部章节进度条
            ├─ 右下角圆形 PIP（人像）
            └─ 底部字幕 + 关键词高亮
```

## 快速开始

```bash
python3 skills/talking-head-remotion/scripts/scaffold_talking_head_remotion_project.py \
  --project-dir ./demo-talking-head \
  --title "Demo Talking Head"

cd demo-talking-head
npm install
npm run still
```

生成的项目开箱即跑，初始状态只留背景、顶栏、PIP 框和字幕样式——中间舞台空着，等你按字幕节奏填画面。

## 风格 DNA（不可变）

| 项 | 值 |
|---|---|
| 画布 | 1920×1080 @ 30fps，暖白 `#f7f8f3` |
| 背景 | 上下镜像透视格子 + 微渐变 |
| 顶栏 | 黑色章节进度条（白色填充） |
| PIP | 右下角圆形，206px |
| 字幕 | 底部无底色黑字，关键词 `#2f6fff` 蓝色加粗 |
| 字体 | Noto Sans SC（中文） / Space Grotesk（数字英文） |
| 场景 | cover / list / stat / compare / outro 五种 |
| 硬规则 | 每屏 ≤ 5 个文字元素 + 至少一个非文字视觉主体 |

## 公共素材库

跨项目复用的资源放在 [`assets/library/`](assets/library/)：

- **字体**：Noto Sans SC、Space Grotesk（脚手架自动播种）
- **SFX**：whoosh / impact / tick 等入场音效（脚手架自动播种）
- **动效组件**：TitleSlam 大字砸落等（按需拷入项目）

好用的动效/音效验证后回流素材库，让每个新项目都站在上一个项目的肩膀上。

## 更多资源

- 完整工作流、校验清单、音画对词审计方法 → [`SKILL.md`](SKILL.md)
- 视觉设计变量和图层规范 → [`references/visual-guide.md`](references/visual-guide.md)
- 公共素材库清单 → [`assets/library/LIBRARY.md`](assets/library/LIBRARY.md)
