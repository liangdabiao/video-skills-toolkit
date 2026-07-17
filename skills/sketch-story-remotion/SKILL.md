---
name: sketch-story-remotion
description: 用 Remotion 制作「小白学AI」系列的手绘故事视频：米白纸底 + 火柴人角色 + Q萌电脑 AI「小智」+ 手绘抖动线框/箭头/红圈动画。当用户要制作该系列新一集（第2集、第3集…）、把一份故事脚本变成手绘风格视频、修改已有集数、或给这套风格的视频加配音时，必须使用这个 skill。触发词：小白学AI、手绘故事视频、火柴人视频、下一集、sketch story。
---

# Sketch Story Remotion（小白学AI手绘风）

把系列故事脚本（markdown）变成统一手绘风格的 Remotion 视频。风格资产全部是代码生成（无图片素材），只要复用 `templates/remotion-project/src/` 里的四个风格文件，任何模型做出来的新集数都和第一集一致。

**规范样板**：第一集成品工程在 `<VIDEO_WORKSPACE>/xiaobai-ai-ep01/`，遇到拿不准的排版/节奏问题，先看它的 `src/scenes.tsx`。

## 新一集工作流

1. **读最新故事脚本**（通常在 `<NOTES_VAULT>/创作/小白学AI第一季/` 下）。以用户指定的最新 markdown 为准，不要沿用旧版大纲。
2. **列故事检查表**：先把原文里的关键桥段列成 beat checklist，包括人物动作、因果转折、道具、笑点、金句、结尾钩子。后续改写时用这张表防止把故事压成提纲。
3. **拆场景**：把故事拆成 8~12 个场景，每个场景一个视觉主意（见下方「场景语法」）。原文较长时宁可扩到 12~16 场，也不要删掉承上启下的桥段。
4. **脚手架**：
   ```bash
   mkdir "<VIDEO_WORKSPACE>/xiaobai-ai-epNN"
   cp -R "./skills/sketch-story-remotion/templates/remotion-project/" \
         "<VIDEO_WORKSPACE>/xiaobai-ai-epNN/"
   cd "<VIDEO_WORKSPACE>/xiaobai-ai-epNN" && npm install
   ```
   ⚠️ 用原生 `npm install`，不要 `rtk npm install`（rtk 会把它翻译成 `npm run install` 而报错）。
5. **写动画草版**：只改 `src/scenes.tsx` 和 `src/Root.tsx` 的 SCENES 表。**不要改** `theme.ts` / `sketch.tsx` / `characters.tsx` / `ui.tsx`（风格锁定文件；如果确实要加新的通用元素，加组件而不是改已有组件的视觉参数）。
6. **生成配音和字幕**：按场景和角色生成 TTS，产出每场音频、整集 SRT、TTS metadata。见下方「多音色配音和字幕流程」。
7. **回写音画同步版**：用真实 TTS 时长改 `Root.tsx` 的每场 frames，再根据字幕/metadata 调整场景内文字、框线、箭头、表情的出现帧。不要停留在无配音估时版本。
8. **验证循环**（必须做）：
   - `npx tsc --noEmit`
   - 对每个场景渲一张接近结尾的静帧逐一检查：`npx remotion still Episode --frame=<场景末帧-30> out/check-N.png`，用读图检查文字溢出、元素重叠、遮挡。
   - 视频完成后，把每个场景的最终呈现截图交给 Subagent 做独立视觉审核；重点查气泡漂浮/挡人、尾巴没指向说话人、汗滴/怒气线离头太远、文字溢出和误遮挡。按审核结果修改后，重新渲染受影响场景截图复查。
   - 抽查字幕/关键词出现帧：话还没说时不能提前出现，话已经说完时不能还没画出来。
   - 对流程词、列表词、便签词、金句关键词做**关键词级同步抽查**：先列 `画面文字 -> 对应口播短语 -> 预计源时间`，每个关键词至少渲染“出现前 0.5~1 秒”和“出现后 0.5 秒”两帧；前一帧不能露出该词，后一帧只能露出已经说到的词。
   - 全部通过后 `npx remotion render Episode out/epNN-demo.mp4`。

## 故事忠实度

- 原文是故事，不是提纲。改成视频脚本时可以合并相近句子，但不能删掉关键桥段导致因果断裂。
- 保留“动作承接”和“道具承接”。例如角色抽出便签、写下关键词、指向电脑、发送邮件这类动作，是观众理解下一句的桥。
- 旁白可以压短，但必须保留原文的情绪推进：压力来源 → AI 出手 → 误解/担心 → 老吴纠偏 → 定义 → 责任边界 → 人的工作 → 金句/下集。
- 若必须删减，先列出将删掉的 beat，并确认它不是理解后文所必需的连接段。
- TTS 前做一次对照：逐场检查 beat checklist，确认没有漏掉重要句子、动作、转折和金句。

## 风格 DNA（不可变）

| 项 | 值 |
|---|---|
| 画布 | 1920×1080 @ 30fps，米白纸底 `#fbfaf5` |
| 墨色 | `#161616`（INK），线宽 3~4 |
| 强调色 | 红 `#d0402b`（标题/警示/圈叉）、蓝 `#3a6bc9`（标注/人物台词要点）、橙 `#e8862e`（箭头/流程）、绿 `#3f8a3a`（对勾/正面） |
| 字体 | macOS 手写体栈：`'HanziPen SC','Hannotate SC','Wawati SC','Kaiti SC',cursive`（在 `theme.ts` 的 FONT 里；换渲染机器需自带字体） |
| 线条 | 一切线框都用 `sketch.tsx` 的 wobbly 系列生成（种子化抖动），**禁止**用平直的 SVG rect/line 或 CSS border 画图形元素 |
| 动画 | 元素是"被画出来的"：strokeDash 描边渐进 + 填充延迟；文字是淡入+轻微上移；**没有**滑入、弹跳、旋转等现代动效 |
| 素材 | 全部代码绘制，不用任何位图/图标库/emoji |

## 角色档案（系列不变）

| 角色 | 组件 | 参数约定 |
|---|---|---|
| 小白（新人主角） | `StickMan` | 无眼镜，size 170~190，常用 mood：worried / shocked / happy |
| 老吴（老员工导师） | `StickMan` | `glasses` 必开，size 比小白大一号（200~210），旁边常配 `ThermosCup`（保温杯，放在手边 x±55、y 比地面高 50 左右） |
| 客户/路人 | `StickMan` | `hair={false}` 光头以示区分，生气时 `armsUp` + `mood="shocked"` + 头顶三根红色怒气短线 |
| AI 小智（独立形态） | `CuteAi` | Q萌小电脑：天线+腮红+大眼，站立场景用它 |
| AI 小智（桌面形态） | `AiScreen` | 桌上显示器；`faceOn` 开脸（与 CuteAi 同一张 CuteFace），显示邮件等内容时不开脸、用 children 画内容 |

人类一律 StickMan，AI 一律 CuteAi/AiScreen，不要混用或发明新形象。

## 系列配音音色（固定）

| 角色/轨道 | 用途 | MiniMax voice_id |
|---|---|---|
| 旁白 | 叙述、金句、客户/同事等龙套台词转述 | `moss_audio_2ecaeaac-5e5a-11f1-99fb-96e792fde6a1` |
| 小白 | 小白的直接台词 | `Chinese_playful_streamer_nv1` |
| 老吴 | 老吴的直接台词 | `Chinese_casual_instructor_nv1` |

旁白使用上表中的固定 ID；不要使用旧的临时旁白 ID。

## 系列默认节奏和 BGM

- 最终交付版默认按 **1.2 倍速度**处理：配音、字幕、场景 frames 和画面动画要落在同一条 1.2x 时间轴上。若 TTS/后处理支持语速，按 1.2x 生成或处理音频；否则在 Remotion/ffmpeg 中加速音频，同时同步压缩字幕时间和画面时间轴，不能只加速其中一项。
- 系列默认 BGM 使用 `<BGM_FILE>` 的音频轨，时长不够时循环铺满全片。
- BGM 从无 BGM 成片重新混入，默认 `volume=-34dB`，加 `highpass=f=80`、`equalizer=f=500:t=q:w=1.5:g=-3`、人声 sidechain duck、首尾淡入淡出；视频流用 copy，避免重压画质。

## 场景语法（版式约定）

每个场景是一个独立组件，内部 `useCurrentFrame()` 从 0 开始。常用版式：

- **片头卡**：灰色系列名(y300) → 黑色大标题(y400, 78px) → 红色悬念副标题(y530, 54px) + 手绘下划线 → 主角亮相(y910)。
- **对话场景**：`RedTitle` 顶部居中(y70) → `DeskLine` 地面线(y800~880) → 角色站地面线上 → `Bubble` 气泡（左角色 tail="left" 放左上，右角色 tail="right" 放右上）→ `Narration` 底部旁白(y960)。
- **图解场景**：要点用 `SketchRect`+`HandText` 排竖列或横排三格，流程用 `SketchArrow`（橙）串联，强调用 `SketchHighlightCircle`（红圈）或 `SketchUnderline`，否定用 `SketchCross`（红叉）。
- **对比场景**：中间灰色竖分隔线，左右各一个 `RedTitle`（左黑右红），左侧列条目后整体打大红叉。
- **金句卡**：纯文字居中，黑一句 + 红两句(62px) + 长下划线，下面站两个小人做对照。

规则：
- 元素出现顺序 = 讲述顺序，间隔 40~70 帧一个节拍；框先画(18~25帧)，框内文字晚 8~10 帧进。
- 文字不要像 PPT 一样整屏一次性出现。列表、便签、流程词、气泡、金句都要按口播顺序逐条出现。
- 一句台词对应的关键字/气泡，应该在这句开始附近出现，并在这句说完前完成主要动画；不要提前露出后面的包袱。
- 气泡要跟说话人形成明确关系：尾巴尽量指向角色头顶/身体附近，气泡本体不得遮住角色；角色不在画面里时不要硬放对话气泡，先补角色或改成旁白/标注。
- 汗滴、怒气线、惊讶线这类情绪符号必须贴在角色头部附近；不要写死到离头太远的位置，看起来像漂在空中。
- 合理重叠可以保留，例如为了表达压迫、遮挡或强调关系而有意让元素盖住另一个元素；但文字误压在人物脸/身体上、气泡挡住人物、标注无意间穿过角色，都算穿帮，要调整坐标或留出人物安全区。
- 文字层（HandText/Bubble/Narration）在 `<Svg>` 外面；图形都在 `<Svg>` 里。
- 所有 progress 一律 `prog(frame, start, duration)`（自带 clamp）；seed 用场景前缀保证唯一（如 `s3box1`）。
- 一个场景一个概念，别塞第二个。

## 节奏（无配音版）

30fps。场景时长按"把屏上文字慢速读一遍再加 1~2 秒"估：纯标题卡 ~130 帧；对话场景 250~350 帧；图解/对比场景 350~450 帧；收尾总结 ~500 帧。场景间由 Root 的 FadeScene 自动做 12 帧淡入淡出，场景内容在最后 30 帧不要再上新元素。

## 多音色配音和字幕流程

配音按场景分段生成（TTS 见 `tts-skill` / MiniMax），并且必须在生成音频后再改一版动画：

1. 建一个 TTS 脚本（建议放 `scripts/generate_epNN_tts.py`），数据结构按 scene → utterances 拆分，每条 utterance 至少包含 `role`、`text`。
2. 角色映射使用「系列配音音色（固定）」：旁白负责叙述、金句、龙套台词转述；小白只读小白台词；老吴只读老吴台词。
3. 每条 utterance 先单独生成音频，再拼成每个场景一个音频文件，放 `public/audio/scenes/scene-01.mp3` …；同时保留分段音频到 `work/audio/generated/`。
4. 分段音频文件名要包含文本 hash，不要只用行号缓存，避免改了台词却误复用旧音频。
5. 生成 TTS metadata，至少记录每条 utterance 的 scene、role、text、start/end time、start/end frame；由 metadata 生成 SRT，写到 `work/captions/epNN.srt` 并复制到 `public/captions/epNN.srt`。
6. 用 ffprobe 或 metadata 拿每段场景音频时长，先算源时间轴 `sourceFrames = ceil(时长秒 × 30) + 15`，最终交付时间轴按 1.2x 压缩为 `playbackFrames = ceil(sourceFrames / 1.2)`。
7. 在 Sequence 里加音频；若音频文件不是已加速版本，使用 `<Audio src={staticFile('audio/scenes/scene-01.mp3')} playbackRate={1.2} />`，并用同样的 1.2x 映射驱动画面。
8. 按 metadata 回写场景内部动画锚点：台词说到哪，哪个字、便签、框、箭头、红圈就从那附近开始画。
9. 渲染前把 `remotion.config.ts` 保持默认（音频会自动混入 mp4）。
10. 导出无 BGM 版后，再按「系列默认节奏和 BGM」混入通用 BGM，产出最终 BGM 版。

## 音画同步验收

生成配音后，必须检查音频、字幕和动画三者是否对齐：

- 视频总时长要接近音频总时长；音频轨不能明显长出或短于视频轨。
- 每个场景的最后 30 帧不再出现新文字，避免刚出现就切场。
- 抽查每场 2~4 个 utterance 的开始帧：字幕/关键字可以提前 3~6 帧铺垫，但不能提前十几帧把后文全露出来。
- 长 utterance 内的流程词不能只按整句开始时间对齐；必须按短语位置拆开检查。例如“先认笔画，再认字，再认意思”这类递进词，不能在说到“先认笔画”之前把“笔画/字/意思”整组亮出来。
- 抽查每场结尾：最后一句说完前，画面上对应的文字和图形应该已经出现；不能“话说完了，字还没来”。
- 画面文字跟随口播逐步出现，尤其是三词便签、流程图、对比清单、金句卡，不允许整页一次性铺满。
- 渲染接近结尾静帧和必要的中段静帧，检查文字溢出、气泡压头、元素重叠、字幕遮挡。
- 每场最终截图必须过一次 Subagent 视觉审查；审查时区分“有叙事意图的遮挡”和“误挡人物/误压文字”的穿帮镜头，发现问题先改画面，再重新截图确认。
- 最终 BGM 版要从无 BGM 成片重新混音；确认 BGM 已循环铺满、音量不抢人声、首尾有淡入淡出。
- 最终导出后用 ffprobe 检查 mp4 的 video/audio duration，并清理 Remotion/headless 浏览器测试进程。

## 常见坑

- **rtk npm install 会失败**，用原生 `npm install`。
- 文字溢出手绘框：优先减字/换行（HandText 支持 `\n`），其次加大框，不要缩字号到 26 以下。
- `HandText` 默认居中锚点（x 是中心）；`align="left"` 时 x 是左缘。
- `Bubble` 的 x/y 是左上角，宽度 w 固定、高度随内容撑开，注意别压到角色头。
- 抽帧检查时重点看气泡是否“漂在上面”：尾巴没指向人、气泡盖住人、台词角色不在场，都是要改的布局问题。
- 种子重复会让两条线长得一模一样，露馅。
- 长渲染/批量静帧前先 `npx tsc --noEmit`，Remotion 的运行时报错信息不如 tsc 直观。
- 新机器首次渲染会自动下载 Chrome Headless Shell（约 90MB），属正常。
- 不要把先前无配音版的估算 frames 当成最终节奏；真实 TTS 生成后必须回写一版。
- 不要因为追求 8~12 场而删掉故事连接段；场数可增加，连贯性优先。
