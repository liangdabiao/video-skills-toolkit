---
name: talking-head-remotion
description: 用 Remotion 制作可复用的口播视频工程：支持口播音频/视频、右下角圆形 PIP、底部同步字幕、顶部章节进度条、Studio 现代主题、SFX/BGM 规划和可运行 React composition。当用户要创建或修改口播视频工程、把现有 HyperFrames 口播模板迁移到 Remotion、搭建 Remotion 视频项目目录、或把脚本和素材变成 Remotion 成片时，必须使用这个 skill。
---

# Talking Head Remotion

一个 Studio 风格的 Remotion 口播视频模板：脚手架一键生成可运行的 demo 项目，配一个跨项目公共素材库（字体、SFX、BGM、可复用动效组件）。

## 输入要求

- **最终口播音频或口播视频（必须）**：它是整条时间轴的唯一真相，字幕、元素进场、SFX 全部从它推导。用户只给内容/主题没给音频时，先帮用户写脚本并生成 TTS，再走同样流程；不要凭空排时间。
- **脚本/逐字稿（强烈建议）**：不用来定时间，用来校对转写出的字幕、标出关键词和章节切分。
- 录屏、截图、SFX、BGM 简报可选，随时后补。

## 新项目：先跑脚手架

```bash
python3 ./skills/talking-head-remotion/scripts/scaffold_talking_head_remotion_project.py \
  --project-dir "/path/to/new-project" \
  --title "视频标题" \
  --script "/path/to/script.md" \
  --talking-head "/path/to/koubo.mp4" \
  --screen-recording "/path/to/recording1.mp4" \
  --screenshot "/path/to/screenshot1.png"
```

只有 `--project-dir` 是必需的；素材可以后补。生成的项目开箱即可 `npm install && npm run still && npm run render:preview`，并已播种字体和常用 SFX。

## 项目目录约定

| 素材 | 位置 |
|---|---|
| 口播人像视频 | `public/media/talking-head/talking-head.mp4` |
| 录屏 | `public/media/screen-recordings/` |
| 图片/截图素材 | `public/assets/screenshots/` |
| 人声音频 | `public/assets/audio/voice.m4a` |
| 音效 SFX | `public/assets/audio/` |
| BGM | `public/assets/music/` |
| 字体 | `public/assets/fonts/` |
| 从素材库拷来的动效组件 | `src/library/` |
| 脚本/字幕/规划文档 | `work/` |

Remotion 入口是 `src/index.ts`，composition 在 `src/Root.tsx` 注册，demo 数据在 `src/demoData.ts`，设计变量和非阻塞字体注册在 `src/theme.ts`。

### 生成素材归档

如果先在 notes vault 里生成了 TTS 或字幕，交付前要归档回对应视频工程项目。当前《两个提示词让 AI 少返工》项目目录是：

```text
<VIDEO_WORKSPACE>/your-talking-head-project
```

归档时使用这些固定位置：

- 最终配音：`public/assets/audio/voice.m4a`；同时保留 `public/assets/audio/voice.mp3` 给 ASR、剪辑软件或快速试听。
- TTS 分段和拼接清单：`work/audio/generated/`。
- TTS 专用稿：`work/tts/`。
- 原始逐字稿或来源稿：`work/source/`。
- 主字幕：`work/captions/captions.srt`、`work/captions/captions.vtt`。
- 原始 ASR 和对齐数据：`work/captions/captions.raw.srt`、`work/captions/captions.raw.vtt`、`work/captions/asr-result.json`、`work/captions/captions_aligned.json`。

## 公共素材库

跨项目复用的素材放在本 skill 的 `assets/library/`，清单和沉淀规则见 [assets/library/LIBRARY.md](assets/library/LIBRARY.md)。

- 字体和 SFX 由脚手架自动播种进项目。
- 动效组件（如大字砸落 `TitleSlam.tsx`）按需拷进项目 `src/library/` 后 import 使用。**合适才用**：库组件和项目里已建好的组件都只是省成本手段，不是必须消化的库存——规格/分镜要求新画面时就新做，不许拿现成组件凑合替代（判断口径：假如没有这个现成组件，你会做出同样的画面吗）。
- 项目里验证好用的新动效/音效，交付后拷回库里并在 LIBRARY.md 登记一行（适合什么、不适合什么），让素材库不断长大。

## 工作流

1. **对齐音频**：只有口播视频时先提取人声 `ffmpeg -y -i public/media/talking-head/talking-head.mp4 -vn -c:a aac public/assets/audio/voice.m4a`。检查开头静音/偏移，必要时先生成对齐后的 voice 和 PIP 资产，再转写字幕；不要在字幕或动画代码里零碎补偿。
2. **字幕驱动时间线**：校正后的字幕写入 `work/captions/captions_aligned.json`，再同步到 `src/demoData.ts`。章节切换、关键词出现、录屏进入、CTA 都对齐到对应字幕的起点。
3. **实现画面**：按 [references/visual-guide.md](references/visual-guide.md) 的设计变量和固定层写 Remotion 代码。**先找 `work/制作规格.md`**（video-script 对动画管线项目的必交付物）：有则逐表还原——组件按规格节实现、每镜内容按"逐镜状态表/内容表"配置、具象图形按"绘制配方"画，**不自行发挥、不简化、不合并状态**；规格里没写的细节才自己补，补完回写进规格。没有这份文件而场景里有仿真 UI/具象图形/随剧情演进的组件时，先停下来把规格补出来（按 video-script 的 `references/production-spec.md`），不要直接凭分镜表的文字描述写代码——历史教训是"仿真 UI 做成空框、面板静态剧透、鹦鹉画成墨团"（J-space 第一版）。
4. **校验**：`npm run typecheck` + `npm run still`；然后先跑低清 proof（默认 `npm run render:preview`）检查整条时间线、字幕、音频、场景节奏。对 proof 抽帧自查（每章节 + 高密度镜头各一帧）：对照 `work/制作规格.md` 的验收清单逐项核；两条必查——多元素场景开场 0.3s 帧与中段帧元素数量必须不同；任一概念元素不得在其剧情点之前出现在任何帧（防剧透）。**渲染前先跑音画对词审计**：概念元素的 cue 必须按字幕文本查找（`cueByText` 式），禁止句序索引和固定延迟 fallback（那是"鹦鹉先于'鹦鹉'出现"的根因，装饰性骨架除外）；逐元素核对 `appearAt` 落在 `[字幕开始-0.3s, 字幕开始+1s]` 窗口内；渲染后对每个概念首次出现行抽"前 1s / 后 0.5s"双帧，分别验证不在场/已在场。全片恒定偏移则查音频源头（开头静音、对齐音频与成片音频是否同一文件），不要在动画代码里零碎补偿。只有用户明确要求"生成最终版/正式导出"或低清 proof 已确认后，才跑 `npm run render`。
5. **最后加声音**：画面和动画节拍稳定后再锁 SFX 和 BGM（见下）。
6. **沉淀**：好用的动效/音效回流素材库；能防止下次犯错的经验记进项目 `work/lessons/LESSONS.md`。

## 渲染调试节奏

- 默认先出低清 proof，不要一上来跑 1920x1080 全片正式渲染。低清 proof 用 `renders/preview-low.mp4`，通常 `--scale=0.5 --crf=28 --concurrency=2` 足够发现字幕错位、画面空帧、音量问题和场景节奏问题。
- 正式渲染前至少做三类检查：`npm run typecheck`、关键帧 still、低清全片 proof。用户没有明确说"最终版/正式导出"时，停在 proof，不要主动消耗时间跑 full-res。
- 长渲染把输出重定向到 `work/render.log`，只 `tail` 日志尾部；不要把几千行逐帧进度刷进对话上下文。
- 不要用模糊的 CLI 探测命令，例如在项目里直接跑 `remotion render --help`。这个命令在某些版本/上下文会被当成默认 render 启动。要查参数时优先看 `package.json` 里已有脚本、项目 README、或官方文档；需要试命令时先确保它不会启动渲染。
- 用户打断后先检查后台进程：`pgrep -fl "remotion|chrome-headless|Google Chrome for Testing|Chromium"`。中断误启动的渲染，等待或清理 Remotion/Chrome headless，不要留下吃 CPU/GPU 的进程。

## 不能妥协的规则

- 字幕、PIP 嘴型、动画节拍、SFX 必须对同一个最终对齐的音频源检查。
- **禁止 PPT 式整页出现**：一个场景切进来时不能把内容全部铺好。每个可见元素（一行标题、一个列表项、一个数字、一个图标、一张截图）都要有自己的进场动画和进场时刻，进场顺序由字幕顺序驱动——口播说到哪个内容，哪个元素才蹦出来。场景切换只是换舞台，元素仍然逐个进场。
- 主画面文字宁少勿多（一屏 ≤5 个文字元素，可以无字）：只放关键词、短语、数字、证据截图或短 CTA；完整句子只放字幕，禁止把逐字稿搬上画面。
- **丰富度靠非文字层，不靠加字**：每屏至少一个非文字视觉主体（图示/仿真 UI/录屏/数据可视化/图形动画）；任一时刻至少一层持续动效在动；同一版式连续不超过 2 个场景；讲到能截图/录屏的具体东西必须给真实或仿真界面。动效要覆盖进场/持续/强调/示意四类，不能只有进场（详见 visual-guide 的"画面丰富度硬规则"和"动效词汇表"）。
- 口播人像是右下角圆形 PIP（看到头和肩膀）；没有视频时用中性占位。
- **默认画幅是 16:9 横屏（1920x1080）**；模板的固定层（顶部进度条、右下 PIP、字幕安全区、透视格子）都按横屏设计，做竖屏（9:16）需要单独调整这些层，不是开箱即用。默认 1920x1080 全画幅 Studio 主题：暖白画布 + 上下双层镜像透视格子背景；不要把内容包进白色圆角卡片、缩小画板或网页 preview 容器。`PremiumGridBackground` 必须实际调用 `PerspectiveGrid`。
- 动画只用 `useCurrentFrame()` + `interpolate()` + `Sequence` 帧驱动；不要 CSS animation/transition 或浏览器计时器（HyperFrames 的 GSAP timeline 不能照搬）。
- 资产放 `public/` 用 `staticFile()` 引用；字体默认用本地 `@font-face` 非阻塞注册或稳定系统字体栈。不要默认用 `@remotion/fonts/loadFont()` 阻塞全片渲染，因为它依赖 `delayRender()`，字体加载偶发卡住会让长视频在任意帧超时失败。只有确实需要阻塞字体一致性时才使用，并先用低清 proof 验证。
- 初始模板的中间舞台刻意留空（只有背景、顶栏、PIP 框和字幕样式示例）；制作时按字幕逐元素填充场景，空间系统、固定层和背景结构不变。

## 音效和 BGM

放在画面完成之后。SFX 和 BGM 不是装饰，是防止节奏太平：每个声音都要能回答"解决了什么节奏问题"，不要给每条字幕都加音效。

- 先填 `work/audio/audio_cue_sheet.md`（音效、开始、时长、视觉事件、节奏目的、音量），再在 composition 里用 `Sequence` 包 `<Audio>` 放置，音量保守起步。
- 人声 `volume={1}` 永远第一优先级；BGM 预听 `0.06-0.10`，始终在人声下方。
- BGM 用纯音乐（110-128 BPM 常见于科技/讲解），简报写 `work/music/bgm_brief.md`，生成后存 `public/assets/music/` 并补 `SOURCES.md`；最终混音优先渲染后用 `work/music/mix_bgm.sh` 做 ducking。
