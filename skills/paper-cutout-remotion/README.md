# Paper Cutout Remotion · 纸片风分层动画

把一份分镜脚本变成**纸片分层风格**的视频：背景、主角、配角、前景分别做成独立 PNG 素材，每一层按不同节奏运动，靠前后遮挡制造纵深立体感。

> 真正的纸片动画，核心不是生成一张漂亮的图，而是让每一张图都承担明确的叙事位置。

---

## 这是什么

一套用 AI 生成素材 + Remotion 控制动画的视频生产 **skill**。适合做：

- 🏯 古诗词 / 历史人物 / 朝代叙事（唐宋明清…）
- 📚 知识科普（人物 + 概念图解）
- 💼 商业故事（创始人/产品/用户分层）
- 🌆 城市发展、人物关系、任何能拆成"背景+人物+前景"的画面

**已验证案例**：

| 案例 | 时长 | 场景 | 角色 | 风格 |
|---|---|---|---|---|
| 静夜思（李白） | 62s | 6 | 李白×3 姿态 | 冷蓝夜色·思乡静谧 |
| 念奴娇·赤壁怀古（苏轼） | 104s | 8 | 周瑜×2 / 小乔 / 苏东坡 | 赭红青灰·怀古磅礴 |

成品位于 `D:/video-spec-builder-main/videos/jingyesi-paper/` 和 `videos/chibi-huaigu/`。

---

## 怎样配置使用

首先需要安装好 apiz cli , 这是能够利用生图能力和配音能力，利用世界最好的模型生成图片和配音。
https://apiz.ai/#/  ，然后需要安装好 remotion。

配置好，就可以开始使用了。在codex,claude code, workbuddy:
❯ paper-cutout-remotion skill 制作： 制作一个纸片风分层动画视频：  苏东坡 赤壁怀古



---


## 核心原理：为什么必须"分层"

很多人做纸片风视频，只是把一张完整图片放大、缩小，再加点镜头移动。**这样能动，但没有层次。**

真正的纸片分层动画，把每个镜头拆成四层独立素材：

```
背景层(山水/宫殿)  ← 最慢，轻微推镜
    ↓ zIndex 0
后排层(远处群臣)   ← 小幅移动，避免抢戏
    ↓ zIndex 1-2
主体层(主角)       ← 最大，入场最有力量
    ↓ zIndex 3-4
前景层(近处人物)   ← 稍快，遮挡主体制造纵深
    ↓ zIndex 5-6
文字/字幕          ← 最上层
```

**立体感来自遮挡关系，不是 3D。** 前景故意挡住主体的边缘，观众的大脑会自动脑补出空间前后。这是纸片风的灵魂——详见 [`references/layering.md`](references/layering.md)。

---

## 工具链

一条本地视频流水线，每个工具承担明确职责：

```
分镜脚本(narration.yaml)
        │
        ├─→ apiz (nano-banana-pro) 生成【无人物背景底板】
        │       └─ gen_plates.py
        │
        ├─→ apiz 生成【角色素材表】(纯绿背景)
        │       └─ gen_characters.py
        │            ↓
        │       Python 绿幕抠图 + 拆独立 PNG
        │       └─ split_sheet_green.py  ★核心
        │
        ├─→ MiniMax TTS 生成【旁白配音】
        │       └─ gen_tts.py (apiz speak / 直连 fallback)
        │
        └─→ Remotion (React) 控制图层/动画/字幕 → 渲染 MP4
                └─ scenes.tsx + Root.tsx
```

| 工具 | 职责 | 必需 |
|---|---|---|
| **apiz CLI** | 生成图片（背景底板 + 角色）、TTS 配音 | ✅ 核心 |
| **Python + Pillow + NumPy** | 绿幕抠图、拆素材表 | ✅ 核心 |
| **MiniMax** | 中文旁白配音（apiz speak 优先） | ✅ 核心 |
| **Remotion 4 + React 19** | 控制图层/动画/字幕、渲染 MP4 | ✅ 核心 |
| **FFmpeg / ffprobe** | 检查时长、抽帧验收 | 推荐 |

**前置条件**：
- 安装 apiz CLI 并配置 API key（`apiz auth login`）
- Node.js + Python（Pillow、NumPy、PyYAML）
- 本机已装 Chrome（渲染用，避免下载 113MB 的 Headless Shell）

---

## 快速开始（5 步）

### 1. 脚手架

```bash
cp -R .claude/skills/paper-cutout-remotion/templates/remotion-project videos/my-video/
cd videos/my-video
npm install
mkdir -p public/assets/{plates,layers,source} public/audio/narration
```

### 2. 写分镜脚本

新建 `narration.yaml`（每个场景一段旁白，决定镜头时长）：

```yaml
voice: female-shaonv
speed: 0.9
scenes:
  - id: s01
    text: 你的旁白文案……
  - id: s02
    text: ……
```

新建 `plates_spec.yaml` 和 `assets_spec.yaml`（背景和角色的描述清单，格式见 `videos/chibi-huaigu/` 的实例）。

### 3. 生素材（apiz）

```bash
# 背景底板（无人物纯环境）
python ../../.claude/skills/paper-cutout-remotion/scripts/gen_plates.py \
    --batch plates_spec.yaml public/assets/plates/

# 角色素材表（纯绿背景，待抠图）
python ../../.claude/skills/paper-cutout-remotion/scripts/gen_characters.py \
    assets_spec.yaml public/assets/source/

# 旁白配音
python ../../.claude/skills/paper-cutout-remotion/scripts/gen_tts.py narration.yaml
```

### 4. 抠图 + 写动画

```bash
# 绿幕抠图（单人物）
python ../../.claude/skills/paper-cutout-remotion/scripts/split_sheet_green.py \
    public/assets/source/角色.png public/assets/layers 角色 1
```

然后用真实配音时长（`timeline.json` 的 `frames_source`）回写 `src/Root.tsx` 的 SCENES 表，并在 `src/scenes.tsx` 里按四层模型组装画面。**只改这两个文件**，不要动 `theme.ts` / `ui.tsx` / `cutout.tsx`（风格锁定文件）。

### 5. 预览 + 渲染

```bash
npm run dev                                    # Remotion Studio 逐帧预览
npx tsc --noEmit                               # 类型检查
npx remotion still Episode out/check.png --frame=300   # 抽帧验收
npx remotion render Episode out/my-video.mp4   # 渲染 MP4（⚠️ 一次只跑一个）
```

---

## 目录结构

```
paper-cutout-remotion/
├── README.md                         ← 本文件（入口介绍）
├── SKILL.md                          ← 执行指令（给 agent 看：10步工作流+验收清单+常见坑）
├── references/                       ← 深度参考文档
│   ├── components.md                   组件 API 速查（ui/cutout/Root 怎么用）
│   ├── layering.md                     四层拆分方法论（纸片风灵魂，必读）
│   └── prompt-recipes.md               apiz 生图提示词配方
├── scripts/                          ← Python 工具链
│   ├── lib_apiz.py                     apiz CLI 封装（生图/TTS/上传 + URL 提取）
│   ├── gen_plates.py                   生成无人物背景底板
│   ├── gen_characters.py               生成角色素材表（纯绿背景）
│   ├── split_sheet_green.py  ★         绿幕 chroma key 抠图 + 网格拆分
│   └── gen_tts.py                      MiniMax 配音（apiz speak / 直连 fallback）
└── templates/remotion-project/       ← cp -R 脚手架
    ├── package.json                    remotion 4 + react 19
    ├── remotion.config.ts              Chrome 检测 + concurrency=2（已配好）
    ├── tsconfig.json
    └── src/
        ├── theme.ts          🔒风格锁定  配色 + 字体栈
        ├── ui.tsx            🔒风格锁定  prog/Paper/Title/Caption/PoemVerse
        ├── cutout.tsx        🔒风格锁定  PaperActor + roleMotion + 白边投影
        ├── Root.tsx          ✏️每集改    SCENES 表（场景顺序+时长+音频）
        ├── scenes.tsx        ✏️每集改    场景组件（四层排版+动画）
        └── index.ts                     registerRoot 入口
```

**🔑 关键纪律**：🔒 锁定文件不要改视觉参数（保证不同视频风格一致），✏️ 只改 Root.tsx 和 scenes.tsx。

---

## 关键概念速查

### PaperActor（最常用组件）

加载透明角色 PNG，按角色档位错峰入场：

```tsx
<PaperActor
  src="assets/layers/zhouyu.png"   // 抠好的透明 PNG
  x={960} y={1030}                  // 脚底中心坐标
  width={400}                       // 显示宽度（⚠️ 见下方坐标公式）
  role="primary"                    // primary/secondary/tertiary 三档动画
  delay={10}                        // 入场延迟帧（错峰）
  zIndex={3}                        // 层级（遮挡关系）
  seed="s3zhouyu"                   // 漂浮相位（场景前缀+编号）
/>
```

### ⚠️ 坐标公式（最易犯的错）

`y` 是脚底位置，人物显示高度 = `width × (图片高/宽比)`。竖长条人物（高/宽常 2~2.5）很容易头顶超出 1080 画布：

```
width × 高宽比 ≤ y - 60     （留 60px 头顶余量）
```

设坐标前先用 Python 量真实尺寸：
```python
from PIL import Image
w, h = Image.open('layers/角色.png').size   # trim 后的尺寸
ratio = h / w
max_width = (1030 - 60) / ratio             # y=1030 时的最大 width
```

### frames_source vs frames_playback（第二易犯的错）

`gen_tts.py` 产出的 `timeline.json` 有两个字段：

| 字段 | 含义 | 何时用 |
|---|---|---|
| `frames_source` | `ceil(音频秒×30)+15`，原速实际帧数 | **音频原速播放时**（默认，古诗词推荐） |
| `frames_playback` | `ceil(frames_source/1.2)`，1.2x 加速后 | 仅当音频挂了 `playbackRate={1.2}` 时 |

**用错会导致旁白没说完就被切场。** 详见 SKILL.md「常见坑」。

### roleMotion 三档

| 档位 | 移动距离 | 入场缩放 | 用途 |
|---|---|---|---|
| `primary` | 78px | 0.86→1 | 主角，最大最有分量 |
| `secondary` | 58px | 0.90→1 | 配角，错峰补充 |
| `tertiary` | 38px | 0.95→1 | 后排，避免抢戏 |

---

## FAQ

**Q: 为什么用绿幕抠图而不是 rembg？**
A: 纸片风要求边缘"脆"。绿幕 chroma key 边界最干净、不依赖 170MB 模型。实测 apiz（nano-banana-pro）对"纯绿背景"服从度极高，抠图绿残留 **0.00%**。代价是提示词必须强制纯绿背景——脚本已自动追加此约束。

**Q: 为什么渲染前要 `Config.setConcurrency(2)`？**
A: 实测踩过的坑——默认高并发 + 同时跑多个 render 会导致 Windows temp 目录竞争，音频混合（audio-mixing）失败。模板已配好。⚠️ **绝对不要同时跑多个 `remotion render`**。

**Q: 为什么用本机 Chrome 而不是下载 Headless Shell？**
A: Remotion 用真实 Chrome 逐帧渲染网页截图（保真）。国内网络下载 113MB 的 Headless Shell 经常超时。模板的 `remotion.config.ts` 自动检测本机 Chrome，跳过下载。两者渲染等价。

**Q: 一个视频要花多少 apiz 积分？**
A: 以赤壁怀古（8场景）为例：7 底板×60 + 4 角色×60 + TTS ≈ 700 积分（约 7 元）。静夜思（6场景）约 500 积分。

**Q: 能换别的绘图模型吗？**
A: 能。`gen_plates.py` / `gen_characters.py` 都有 `--model` 参数。apiz 可选 `fal-ai/nano-banana-pro`（默认，纸片插画风最佳）、`openai/gpt-image-2`、`image4.0` 等。

**Q: 角色素材抠出来后比例不对（比如特别宽）怎么办？**
A: 先用 Python 检查 `Image.open(path).size` 的真实高宽比。如果异常宽（< 1.2），可能是生图时把环境/道具画进了人物图。按配角逻辑调小 width，或用更严格的提示词重新生成（强化"只画人物本体，无场景"）。

---

## 进一步阅读

- **执行指令**（给 agent）：[`SKILL.md`](SKILL.md) — 10 步工作流 + 风格 DNA + 验收清单 + 常见坑
- **组件 API**：[`references/components.md`](references/components.md)
- **四层方法论**：[`references/layering.md`](references/layering.md) — 纸片风灵魂，必读
- **提示词配方**：[`references/prompt-recipes.md`](references/prompt-recipes.md)
- **实例工程**：`videos/jingyesi-paper/`（静夜思）、`videos/chibi-huaigu/`（赤壁怀古）
- **灵感来源**：https://waytoagi.feishu.cn/wiki/PDZtwSjt2iycuok37Ptckjgbnnd

---

## 适用范围

只要画面能拆成"背景、主角、配角、前景"，就能用这套流程。不限于古诗——历史叙事、知识科普、商业故事、人物关系、城市发展都适用。真正让纸片动画有层次的，不是多生成几张图，而是让每张图都承担明确的叙事位置。
参考：https://x.com/vbjby3/article/2076530524110369070
