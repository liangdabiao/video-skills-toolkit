# Sketch Story Remotion · 小白学 AI 手绘风

把系列故事脚本变成统一手绘风格的 Remotion 视频。米白纸底 + 火柴人角色 + Q 萌 AI 小智 + 手绘抖动线框 / 箭头 / 红圈动画。全部代码绘制，零图片素材。

> 手绘风的灵魂不是"画得歪"，而是"被画出来"的感觉——每一根线都有自己的出场顺序。

---

## 这是什么

「小白学 AI」系列手绘故事视频的 Remotion 工程模板，适合做：

- 👨‍💻 职场 / 学习类系列故事
- 🎓 知识科普类动画（人物 + 概念图解）
- 📖 任何需要"火柴人画风 + 持续更新"的系列视频

**核心优势：风格资产全部代码生成**，只要复用 4 个风格锁定文件（`theme.ts` / `sketch.tsx` / `characters.tsx` / `ui.tsx`），任何模型做出来的新集数都和第一集一致。

## 核心原理：种子化抖动 + 逐笔描边

手绘风最怕的两件事：
1. 线条太平直 → 像矢量图，不像手绘
2. 每帧线条都在抖 → 像癫痫，看着难受

**解法：**

- **种子化抖动（wobbly）**：每条线的抖动由一个固定 seed 决定——同一根线每一帧都一样，不会乱抖。但不同的线 seed 不同，所以整体看起来是手绘的。
- **strokeDash 描边动画**：元素不是"淡入"，而是"被画出来"——线条从左到右、从上到下逐渐显现，像真的有人在画。

```
不是：元素 → 透明度 0→1（淡入）
而是：路径 → stroke-dashoffset 从 100% 到 0（被画出来）
```

## 新一集工作流

```
故事脚本（markdown）
    │
    ▼
列 beat checklist（人物动作 / 因果转折 / 道具 / 笑点 / 金句）
    │
    ▼
拆 8~12 个场景，每个场景一个视觉主意
    │
    ▼
脚手架生成项目 → 写动画草版（只改 scenes.tsx + Root.tsx）
    │
    ▼
多音色 TTS 生成配音（旁白 / 小白 / 老吴 各不同音色）
    │
    ▼
用真实音频时长回写每场 frames，调整同步
    │
    ▼
逐场景静帧检查 → 独立视觉审核 → 渲染出片
```

## 快速开始

```bash
cp -R skills/sketch-story-remotion/templates/remotion-project ./demo-sketch-story
cd demo-sketch-story
npm install
npx remotion still Episode out/check.png
```

## 风格 DNA（不可变）

| 项 | 值 |
|---|---|
| 画布 | 1920×1080 @ 30fps，米白纸底 `#fbfaf5` |
| 墨色 | `#161616`（INK），线宽 3~4 |
| 强调色 | 红 `#d0402b` / 蓝 `#3a6bc9` / 橙 `#e8862e` / 绿 `#3f8a3a` |
| 字体 | macOS 手写体栈：`HanziPen SC` / `Hannotate SC` / `Wawati SC` / `Kaiti SC` |
| 线条 | 全部用 `sketch.tsx` 的 wobbly 系列生成，禁止平直 SVG / CSS border |
| 动画 | strokeDash 描边渐进 + 填充延迟 + 文字淡入微上移；**没有**滑入、弹跳、旋转 |
| 素材 | 全部代码绘制，不用任何位图 / 图标库 / emoji |

## 角色档案（系列不变）

| 角色 | 组件 | 特征 |
|---|---|---|
| 小白（新人主角） | `StickMan` | 无眼镜，size 170~190，常用 mood：worried / shocked / happy |
| 老吴（导师） | `StickMan` | `glasses` 必开，size 大一号（200~210），旁边配保温杯 `ThermosCup` |
| 客户 / 路人 | `StickMan` | `hair={false}` 光头区分，生气时 `armsUp` + 头顶三根怒气线 |
| AI 小智（独立形态） | `CuteAi` | Q 萌小电脑：天线 + 腮红 + 大眼 |
| AI 小智（桌面形态） | `AiScreen` | 桌上显示器，显示内容时不开脸 |

## 三角色配音音色（固定）

| 角色 | MiniMax voice_id |
|---|---|
| 旁白 | `moss_audio_2ecaeaac-5e5a-11f1-99fb-96e792fde6a1` |
| 小白 | `Chinese_playful_streamer_nv1` |
| 老吴 | `Chinese_casual_instructor_nv1` |

## 更多资源

- 完整工作流、故事忠实度原则、验证清单 → [`SKILL.md`](SKILL.md)
- 第一集规范样板 → 参考 `xiaobai-ai-ep01` 成品工程的 `src/scenes.tsx`
