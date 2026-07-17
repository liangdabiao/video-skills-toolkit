# 视觉规范（WeChat Article Remotion）

继承自 [talking-head-remotion 视觉规范](../../talking-head-remotion/references/visual-guide.md)。本页只列出本文档特有的补充。

## 核心差异

| 维度 | talking-head-remotion | wechat-article-remotion |
|---|---|---|
| 主舞台 | 文字 + 右下 PIP | **文字 + 大图（公众号原文图）** |
| 字幕安全区 | 避开右下 PIP | 不需要避；caption bottom 88px |
| 主画面非文字主体 | 图示/录屏/数据 | **公众号原文图本身**（article-image 场景） |

## 铁律：object-fit: contain

**任何 article image 永远完整显示**，绝不裁切。理由：

- 公众号图片带文字（截图、表格、流程图）
- 裁切后文字不可读
- 文章本质是图文信息载体，丢图 = 丢原文

实现见 `src/sceneTypes.tsx` 的 `articleImageImgStyle`：

```ts
const articleImageImgStyle: CSSProperties = {
  objectFit: "contain",  // 铁律
  borderRadius: 12,
  boxShadow: "0 30px 90px rgba(28,38,54,0.18), 0 4px 16px rgba(28,38,54,0.08)",
  backgroundColor: colors.white,
};
```

## 图片布局规则

`imageAspect = width / height`，由 PIL 预读。组件按下面规则决定 max-width 还是 max-height 优先：

| 宽高比 | 场景 | 布局策略 |
|---|---|---|
| `imageAspect >= 1.78`（宽图） | 横屏截图、宽流程图 | `maxWidth: 88%, maxHeight: 70vh` |
| `imageAspect < 1.78`（长图/方图） | 长截图、表格、方图 | `maxHeight: 78vh, maxWidth: 88%` |

**为什么按宽高比切换策略**：保证图片始终在主舞台内且不裁切。横屏看宽图，竖屏/方屏看高图。

## 动效词汇（沿用 talking-head-remotion 四类）

| 类型 | article-image 场景里怎么用 |
|---|---|
| **进场** | 图片 scale 0.96→1 + opacity + 16px 上移（0.6s）；eyebrow / 标题 / caption 各错开 0.18s 进场 |
| **持续** | PremiumGridBackground 的 wash / 格子呼吸；图源标签 6s 呼吸一次（`Math.sin((frame/fps) * π/3) * 0.4 + 0.6`） |
| **强调** | 关键信息点用 1.0x→1.04x→1.0x spring，0.25s；口播再次提到时触发 |
| **示意** | 多图场景（article-image-stack，未来版本）按口播顺序展开 |

## 抽帧检查清单

至少抽 cover / 第一个 article-image / list / outro 四帧：

- [ ] 背景接近 `#f7f8f3`，全画幅，上下格子镜像一致
- [ ] 没有白色圆角容器包住画面
- [ ] 顶栏、字幕、品牌标在固定位置
- [ ] **article image `object-fit: contain`，完整显示，未被裁切**（最关键）
- [ ] **图源标签在图片右下角，呼吸动效正常**
- [ ] 主画面只有关键词或短语（≤ 5 个文字元素）
- [ ] 关键词不先于字幕（口播说"图片"时图已进场）

## 音画对词审计

每个概念元素（eyebrow、标题、caption、图源）做 cue 验证：

1. 列出 `画面文字 -> 对应口播短语 -> 预计源时间`
2. 每个关键词至少渲染「出现前 0.5~1 秒」和「出现后 0.5 秒」两帧
3. 前一帧不能露出该词，后一帧只能露出已经说到的词

## 共享素材库

字体和 SFX 来自 [talking-head-remotion 公共素材库](../../talking-head-remotion/assets/library/)：

| 子目录 | 用途 | 命名约定 |
|---|---|---|
| `fonts/` | Noto Sans SC（中）、Space Grotesk（英/数） | 全部播种 |
| `sfx/` | 短 pop / sweep / impact / beep | 按需 |
| `animations/` | 仿真 UI、流程图等通用组件 | 按需 import |

新动效组件（如 article-image-stack 多图展开）按 talking-head-remotion 沉淀规则回流到 `talking-head-remotion/assets/library/animations/`。
