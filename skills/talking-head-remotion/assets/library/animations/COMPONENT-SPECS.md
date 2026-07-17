# 待沉淀组件设计规格

对应 `LIBRARY.md`「待沉淀组件」清单的详细设计说明，供手工实现时参考。

**通用约定**（沿用库的沉淀规则）：

- 每个组件是单个自包含 `.tsx`，只依赖 `remotion` 和 React，文件头部注释写清用法。
- 所有 props 有默认值；默认皮肤走 Studio 主题变量（见 `references/visual-guide.md`），但颜色/圆角/字体开成 props，方便别的调性的片子 fork 改皮。
- 动画全部用 `useCurrentFrame()` + `interpolate()`/`spring()` 帧驱动，不用 CSS animation/transition 或浏览器计时器。
- 时间 cue 统一用 `appearAt`（组件挂载后的相对秒数），对齐字幕时间。
- **复用前先看 `LIBRARY.md` 的「复用判断原则」**：这些组件是备选货架，不是默认答案；调性不合就改造或新写。

---

## 1. 仿真聊天窗 `ChatWindow.tsx`

**用途**：演示 AI 对话——用户提问、AI 回答、多轮往返。对应经验 L1 里「AI 对话界面」这个最高频的具象需求。

**视觉结构**：一个细线框住的窗口（Studio 风格：白底、1px 细线 `rgba(28,38,54,0.14)`、小圆角，**不要**厚阴影卡片），顶部一条极简标题栏（左侧三个小圆点或一个模型名标签），下面是消息流。用户消息右对齐、浅灰底；AI 消息左对齐、白底细线框或淡蓝底。

**Props**：

- `messages: { role: 'user' | 'ai'; text: string; appearAt: number }[]` — 核心数据，`appearAt` 对齐字幕 cue
- `typingDuration?: number`（默认 0.8）— AI 消息弹出前显示「打字中」指示的时长
- `width?`、`title?`、`theme?: { bg, border, userBubble, aiBubble, text, accent }` — 全部有 Studio 默认值

**动效行为**：

- **进场**：每条气泡在自己的 `appearAt` 弹入——透明度 0→1 + 从下方 16px 位移 + spring 轻微过冲（约 0.35 秒）。新气泡进入时，上方已有消息整体平滑上移（模拟真实聊天滚动），这个滚动本身就是一层动效。
- **持续**：AI 消息弹出前的 `typingDuration` 内显示三个小圆点，用 `Math.sin(frame/n)` 错相位做波浪跳动——这是天然的持续动效，画面永远不死。
- **SFX 卡点**：每条气泡的 `appearAt` 帧适合放轻 pop（库里 `sfx-hard-pop-click.mp3`）。

**坑**：长文本要限定气泡 `max-width` 并允许换行；消息很多时窗口内容会溢出，要么限制同屏条数（旧消息淡出上移），要么整体做 clip + translateY。

---

## 2. 仿真终端 `Terminal.tsx`

**用途**：命令执行、安装依赖、脚本跑起来、「代码在跑」的证据感。

**视觉结构**：深色面板（即便在暖白 Studio 片里，终端保持深色是合理的，它本身就是「证据物件」）——`#1a1d24` 底、顶部左侧三个 mac 圆点、等宽字体（Space Grotesk 或 fork 时换真等宽字体）。行首 `$` 提示符用弱色。

**Props**：

- `lines: { text: string; appearAt: number; kind?: 'cmd' | 'output' | 'success' | 'error' }[]` — `cmd` 带 `$` 前缀，`success` 绿色、`error` 红色
- `typewriter?: boolean`（默认 true，仅对 `cmd` 行生效）— 命令逐字符打出，output 整行出现（符合真实终端行为）
- `cursorBlink?: boolean`（默认 true）

**动效行为**：

- **进场**：`cmd` 行按 `appearAt` 开始逐字符打出（用 `interpolate` 把帧映射到字符数再 `slice`）；`output` 行整行淡入，可以几行连续快速出现模拟刷屏。
- **持续**：最后一行末尾的方块光标用帧取模做闪烁（约 0.5 秒周期）——终端永远「活着」。
- **强调**：`error` 行出现时整个面板可以横向抖 2-3 帧（±4px），给翻车情绪一个物理反应。
- **SFX 卡点**：命令回车帧、error 行出现帧。

**坑**：逐字符打字的速度要可配（默认约 25 字符/秒），太快像 bug、太慢拖节奏；行数超出面板高度时整体上滚。

---

## 3. 仿真代码编辑器 `CodeEditor.tsx`

**用途**：讲「这段代码/这个提示词的哪一部分是关键」，逐行高亮扫过，配合口播指哪打哪。

**视觉结构**：细线框面板，左侧行号栏（弱色 `#b6bbb5`），代码区等宽字体。**不做真语法高亮**（自包含组件不能带 highlight 库），用 props 里手工标注的着色段代替——演示代码是写死的，标几个关键 token 足够。

**Props**：

- `lines: string[]` — 代码内容，一次性全部在场（代码是「静物」，不逐行进场，这点和终端不同）
- `highlights: { fromLine: number; toLine: number; appearAt: number; color?: string }[]` — 核心：按 cue 依次点亮的行高亮
- `tokens?: { line: number; match: string; color: string }[]` — 手工标注的关键 token 着色
- `fileName?: string` — 顶部标签页显示的文件名

**动效行为**：

- **进场**：整个面板一次淡入 + 上移；代码文字可以做一个很快的自上而下逐行显现（每行错 1-2 帧，总共约 0.4 秒），像文件刚打开。
- **强调**（本组件的主角）：每个 highlight 在 `appearAt` 时从左向右扫入一条半透明底色（宽度 `interpolate` 0→100%，约 0.3 秒），同时之前的高亮降为更淡的驻留色——观众永远知道「现在在讲哪几行」。
- **持续**：当前高亮行左侧放一个 2px 竖条，做轻微辉光呼吸。
- **SFX 卡点**：每次高亮扫入帧，适合很轻的 sweep。

**坑**：高亮切换时旧高亮要淡出而不是瞬间消失；行数别超过约 15 行，超了说明该拆两个场景而不是缩字号。

---

## 4. 报错弹窗 `ErrorPopup.tsx`

**用途**：翻车、风险、警告的情绪点（经验 L6：情绪点要有画面反应）。它不是一个「场景」，是**砸在别的场景之上的一层**。

**视觉结构**：系统弹窗式样——白底、红色左边缘条或红色圆形感叹号图标、粗体标题（如 `Error: context length exceeded`）、一行弱色详情、右下一个灰色按钮。整体尺寸克制（约 480px 宽），不要满屏。

**Props**：

- `title`、`detail`、`buttonText?`（默认 "OK"）
- `appearAt: number`、`dismissAt?: number` — 出现和（可选）消失的 cue
- `shake?: boolean`（默认 true）— 落地时是否带震动
- `variant?: 'error' | 'warning'` — 红/橙两套色

**动效行为**：

- **进场**：scale 0.85→1 + 透明度，spring 带明显过冲（弹窗要有「砸出来」的冲击感）；`shake` 开启时落地后 3-4 帧内做 ±5px 递减横向抖动。
- **持续**：感叹号图标做慢速红色辉光呼吸——警告在场期间压迫感不消失。
- **离场**：`dismissAt` 时 scale 缩回 + 淡出（约 0.25 秒），可以模拟按钮被「点击」（按钮先暗一下再整体消失）。
- **SFX 卡点**：落地帧配重音（库里 `sfx-deep-impact.mp3` 或更轻的变体，看片子调性）。

**坑**：它叠在别的内容上，注意别压字幕安全区和右下 PIP；连续弹多个错误时错开位置层叠（每个偏移 24px），比同位置替换更有「崩了」的叙事感。

---

## 5. 流程连线图 `FlowDiagram.tsx`

**用途**：示意动画的主力——流程、管线、因果链、架构关系。「输入 → 处理 → 输出」这类逻辑让连线自己长出来讲。

**视觉结构**：节点是细线框圆角矩形（白底黑字，激活时蓝色 `#2f6fff` 描边），连线是 1.5px 细线 + 末端小箭头。布局不做自动排版——**props 里直接给坐标**，自包含组件别去实现布局引擎，横向三五个节点的坐标手写完全可控。

**Props**：

- `nodes: { id: string; label: string; x: number; y: number; appearAt: number; icon?: ReactNode }[]`
- `edges: { from: string; to: string; appearAt: number }[]` — 连线用 SVG path，从 from 节点边缘到 to 节点边缘
- `emphasize?: { nodeId: string; at: number }[]` — 口播回头提到某节点时的强调 cue
- `flowDots?: boolean`（默认 true）— 已生长完成的连线上是否跑流光

**动效行为**：

- **进场**：节点在 `appearAt` 弹入（scale 0.9→1 + 淡入）；连线用 `strokeDashoffset` 从 0 长到 100%（约 0.4 秒），箭头在线长完的瞬间出现。节点和连线的 cue 交替排，就是一段完整的示意动画。
- **持续**：`flowDots` 让每条已完成的连线上有 1-2 个小圆点沿 path 匀速滑动（`offset-path` 或手算 path 上的点）——整张图永远在「运转」。
- **强调**：`emphasize` cue 触发节点描边变蓝 + scale 1→1.06→1 的回弹。
- **SFX 卡点**：每个节点落位帧（轻 pop）、关键连线长完帧（轻 sweep）。

**坑**：SVG 的 `strokeDasharray` 生长要先知道 path 总长（直线/折线可以手算）；节点文字要短（≤6 字），长说明信息该放字幕。

---

## 6. 数据条/计数器 `StatCounter.tsx`

**用途**：数字证据——「token 涨了 10 倍」「返工率 60% → 12%」、耗时对比。

**视觉结构**：两种形态放同一个组件里用 `mode` 切换：

- `counter`：巨型数字（Space Grotesk 等宽数字，120-180px）+ 上方弱色小标签 + 可选单位/前后缀
- `bars`：横向对比条，每条 = 左侧短标签 + 色条 + 右端数字

**Props**：

- `mode: 'counter' | 'bars'`
- counter 模式：`value: number`、`appearAt`、`duration?`（默认 1.2 秒滚到位）、`prefix?`、`suffix?`、`label?`、`decimals?`
- bars 模式：`items: { label: string; value: number; max: number; appearAt: number; color?: string }[]`
- `emphasizeAt?: number` — 数字到位后再强调一次的 cue

**动效行为**：

- **进场**：counter 数字用 `interpolate` + easeOut 从 0（或起始值）滚到目标值，快起慢收，最后 20% 时间走最后 5% 数值——「落定感」就在这里；bars 每条按各自 cue 从左向右长出，右端数字跟着条同步滚。
- **持续**：数字落定后不完全死掉——做极轻的辉光呼吸，或数字后跟一个闪烁的下划线光标；bars 的色条内可以有一层缓慢移动的高光。
- **强调**：`emphasizeAt` 触发数字 scale 1→1.08→1 + 变蓝一下，配合口播「注意，是十倍」这种回点。
- **SFX 卡点**：数字落定帧（全组件最重要的一帧，配 pop 或轻 hit）。

**坑**：滚动中数字位数变化（99→100）会抖版面，必须用等宽数字 + 按目标值预留宽度；`decimals` 控制滚动中显示的小数位，别让中间过程出现一长串小数。
