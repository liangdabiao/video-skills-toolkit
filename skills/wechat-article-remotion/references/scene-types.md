# 场景类型详解

wechat-article-remotion 的 6 个场景。每个场景对应一个 TypeScript 数据模型，对应 `sceneTypes.tsx` 里的一个 View 组件。

## 1. `cover` —— 开场标题

```ts
type CoverScene = {
  kind: "cover";
  start: number;        // 场景开始时间（秒）
  eyebrow: string;      // 上方小标（如 "公众号文章"）
  titleLines: RichTextPart[][];  // 多行标题，可分段强调
  subtitle: string;     // 副标题
};
```

**视觉**：居中布局，eyebrow 蓝小标 + 大标题（112px）+ 弱副标题（38px）。

**进场节奏**：
- 0.14s eyebrow 淡入上移
- 0.25s 标题淡入上移（0.56s）
- 0.52s 副标题淡入上移

**什么时候用**：视频开场第一帧。`<titleLines>` 用来做"标题前半段白字 + 后半段蓝字"的强调组合。

## 2. `list` —— 步骤、要点、清单

```ts
type ListScene = {
  kind: "list";
  start: number;
  eyebrow: string;
  heading: string;
  items: Array<{
    index: string;      // "01" "02" "03"
    label: string;      // 短标签
    value: string;      // 主要内容
    tone?: "accent" | "white" | "muted";
    appearAt?: number;  // 该行进场时刻（场景内相对秒数）
  }>;
};
```

**视觉**：左侧标题栏（小标 + 大标题）+ 右侧 3-5 行编号清单，每行用细线分隔。

**进场节奏**：标题栏 0.16~0.24s 进场，每行 0.28+0.1n s 错开进场。

**什么时候用**：文章里"三大要点""四个步骤""五个坑"这类结构化内容。

## 3. `stat` —— 数据、金句

```ts
type StatScene = {
  kind: "stat";
  start: number;
  eyebrow: string;
  number: string;       // 巨型数字 "95.7"
  unit: string;         // 单位 "%"
  title: RichTextPart[];// 解释标题
  metrics: Array<{
    label: string;
    value: string;
    tone?: Tone;
    appearAt?: number;
  }>;
};
```

**视觉**：左侧 420px 巨型数字（420px Mono 字体）+ 右侧细线分隔 + 解释标题 + 下方 mini 数据行。

**什么时候用**：文章里有"95.7% 的用户""增长了 3 倍"这类有数字的内容。

## 4. `compare` —— 对比、选 A/B

```ts
type CompareScene = {
  kind: "compare";
  start: number;
  eyebrow: string;
  heading: string;
  choices: Array<{
    code: string;       // "A" "B"
    title: string;
    subtitle: string;
    tone?: Tone;
    appearAt?: number;
  }>;
};
```

**视觉**：顶部小标 + 大标题 + 下方两栏对比，中间一条竖细线分隔。

**什么时候用**：文章里"方法 A vs 方法 B""开源 vs 闭源"这类对比内容。

## 5. `outro` —— 结尾 CTA

```ts
type OutroScene = {
  kind: "outro";
  start: number;
  eyebrow: string;     // "谢谢观看"
  title: string;       // "下期见"
  subtitle: string;    // 引导关注/转发
};
```

**视觉**：居中布局，大标题 172px + 副标题。

**什么时候用**：视频最后一帧。引导关注、转发、原文链接。

## 6. `article-image` —— 公众号原文图完整展示（核心新增）

```ts
type ArticleImageScene = {
  kind: "article-image";
  start: number;
  eyebrow: string;
  imageSrc: string;     // staticFile() 路径，如 "assets/article-images/img-03.jpg"
  imageAspect: number;  // 由 PIL 预读（width/height）
  title: RichTextPart[];
  caption?: string;     // 解读短句（≤ 14 字）
  source?: string;      // 图源标注，如 "图源：公众号 / 性能对比章节"
  appearAt?: number;    // 图片进场时刻
  titleAppearAt?: number;  // 标题进场时刻（错开 0.18s）
  captionAppearAt?: number;
};
```

**视觉**：上方居中 eyebrow + 标题（64px），中间公众号原文图（contain 完整显示），下方解读短句（26px 弱色），图片右下角图源标签（呼吸动效）。

**铁律**：
- `object-fit: contain`，永不 `cover`
- 宽高比决定 `max-width` 还是 `max-height` 优先（≥1.78 用 max-width，否则 max-height）
- `imageAspect` 由 `scripts/fetch_article.py` 用 PIL 预读后写入 `work/source/images.json`

**进场节奏**（推荐）：
- 0.08s eyebrow 淡入
- 0.16s 图片 scale 0.96→1 + opacity（0.6s）
- 0.24s 标题淡入
- 0.5s caption 淡入
- 图源标签持续呼吸

**什么时候用**：文章里出现截图、表格、流程图、信息图等任何带文字的图。

## 数据驱动约定

- `src/demoData.ts` 里的 `scenes` 是唯一真相
- 场景顺序由 `scenes[i].start` 决定
- `start` 单位是秒（不是帧）
- `appearAt` 单位是场景内相对秒数
- 改 scene 数据时只改 `demoData.ts`，不动 component

## 动效对齐

每个 scene 内元素的 `appearAt` 应对齐到对应字幕 cue 的起点。例如 list 场景里第 3 行在 `0.5s` 进场，对应字幕"我们来看第三个要点"应在 0.5s 之前开始。

`scripts/fetch_article.py` 和 LLM 拆稿配合时，每个 list item / stat metric / compare choice 的 `appearAt` 都从对应口播短语的字幕起点推导。
