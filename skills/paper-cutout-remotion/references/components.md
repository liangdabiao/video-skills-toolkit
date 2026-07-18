# 组件 API 速查

风格锁定文件（勿改视觉参数）：`theme.ts`、`ui.tsx`、`cutout.tsx`。
每集只改：`scenes.tsx`（场景组件）和 `Root.tsx`（SCENES 表）。
所有 progress 参数接受 0..1，内部自动 clamp；配合 `prog(frame, start, duration)` 使用。

## theme.ts

| 常量 | 值 | 用途 |
|---|---|---|
| `WIDTH` / `HEIGHT` / `FPS` | 1920 / 1080 / 30 | 画布规格（不可变） |
| `PAPER` | `#f3ead6` | 宣纸米白（底板默认底色） |
| `PAPER_DEEP` | `#e8d9bd` | 深档纸色（章节分块/暗角） |
| `INK` | `#1f1a14` | 暖墨黑（描边/标题） |
| `RED` | `#b8322a` | 朱砂红（标题/印章/警示） |
| `BLUE` / `ORANGE` / `GREEN` / `GOLD` | — | 副强调色 |
| `PAPER_EDGE` | `#f5eedc` | 剪纸白边色（drop-shadow 用） |
| `FONT_TITLE` / `FONT_BODY` | 宋体栈 | 标题/正文（剪纸字感） |
| `FONT_CAPTION` | 黑体栈 | 字幕（小字可读性） |
| `DEFAULT_IMAGE_MODEL` | `fal-ai/nano-banana-pro` | apiz 生图默认模型 |
| `DEFAULT_VOICE_ID` | `female-shaonv` | MiniMax 默认音色 |

## ui.tsx — 文字层 + 容器（都在 `<Svg>` 外、`<Paper>` 内）

| 组件/函数 | 关键 props | 用途 |
|---|---|---|
| `prog(frame, start, dur)` | — | 进度 helper，返回 0..1，自动 clamp。**整套模板的动画时钟** |
| `Paper` | `children, bg?` | 场景根容器：宣纸底 + 字体 + 开场淡入。每个场景最外层 |
| `Svg` | `children` | 全屏 1920×1080 SVG 图层（位图角色也放这里统一 z 轴） |
| `Plate` | `src, zoom?` | 背景底板 PNG（gen_plates 生成，无人物） |
| `BodyText` | `x, y, text, size?, color?, start, align?, weight?, font?, edge?` | 通用文字，淡入+上移。`edge` 开剪纸白边 |
| `Title` | `x?, y, text, size?, color?, start` | 大标题（宋体粗 + 白边） |
| `Eyebrow` | `x?, y, text, start` | 顶部红字章节标签 |
| `Caption` | `text, start?, y?` | 底部字幕（单层，黑体，半透明底） |
| `Seal` | `x, y, text, start, size?` | 右下红印章装饰（古风题材） |

**坐标约定**：`x` 默认是中心点；`align="left"` 时 x 是左缘，`align="right"` 时 x 是右缘。`y` 是顶部。

## cutout.tsx — 纸片分层动画原语（核心）

| 组件/常量 | 关键 props | 用途 |
|---|---|---|
| `roleMotion` | — | 三档角色动画参数（primary/secondary/tertiary），**勿改成统一值** |
| `PAPER_FILTER` | — | drop-shadow 白边+深投影配方（4 向白边 + 1 向阴影），**勿删任何一项** |
| `PaperActor` | `src, x, y, width, role, delay, zIndex, seed, flip?` | 独立角色 PNG。x/y 是**脚底中心** |
| `PaperLayer` | `src, x?, y?, width?, zIndex, start, drift?, driftDur?, filter?` | 静态装饰层（撕纸/胶带/纸屑/远景） |
| `BackgroundPan` | `children, durationFrames, startScale?, endScale?` | 背景慢速推镜（1% 呼吸感） |
| `WIDTH_REF` | — | 角色宽度参考量级（唐朝片实测值） |

### PaperActor 详解（最常用）

```tsx
<PaperActor
  src="assets/layers/emperor.png"   // staticFile 相对路径
  x={960}                             // 脚底中心 x
  y={920}                             // 脚底 y（地面位置）
  width={650}                         // 显示宽度（参考 WIDTH_REF）
  role="primary"                      // 决定入场动画档位
  delay={4}                           // 入场延迟帧（错峰）
  zIndex={5}                          // 层级（遮挡关系）
  seed="s2emp"                        // 漂浮相位（场景前缀+编号）
  flip={false}                        // 朝向反了设 true
/>
```

**role 三档行为**：
- `primary`：distance 78 / rise 55 / scale 0.86→1 / 入场 22 帧 / 漂浮幅度 2.4。最大、最有分量。
- `secondary`：distance 58 / rise 38 / scale 0.90→1 / 入场 18 帧 / 漂浮 1.8。中等。
- `tertiary`：distance 38 / rise 22 / scale 0.95→1 / 入场 14 帧 / 漂浮 1.2。最小、避免抢戏。

**zIndex 层级规范**（四层遮挡，从后到前）：
- 背景层：0（Plate 自身）
- 后排层：1-2（tertiary 角色）
- 前景层：3-4（secondary 角色，遮挡主体制造纵深）
- 主体层：5（primary 角色，最大最醒目）
- 装饰/字幕：6+（最上层）

**delay 错峰规范**（避免同时入场）：
- primary：4（先出场）
- secondary：16-22（主角到位后补充）
- tertiary：30-40（最后填充群像）

## Root.tsx — 场景拼装（只改 SCENES 表）

```tsx
const SCENES: {comp: React.FC; frames: number; audio?: string}[] = [
  {comp: S1Title, frames: 140, audio: 'audio/narration/s01.mp3'},
  // ...
];
```

- `frames`：无配音版按"屏上文字慢速读一遍+1-2秒"估；配音版用 timeline.json 的 `frames_playback` 回写
- `audio`：旁白 mp3 的 staticFile 相对路径；无配音阶段删掉或注释
- `FadeScene`：首尾各 12 帧淡入淡出（自动 clamp），勿改
- `TOTAL_FRAMES`：由 SCENES 自动累加，Composition 直接用

## 帧数回写公式（配音版）

```
sourceFrames  = ceil(音频时长秒 × 30) + 15
playbackFrames = ceil(sourceFrames / 1.2)   # 1.2x 交付节奏
```
gen_tts.py 产出的 timeline.json 同时给两个字段，回写时用 `frames_playback`。
