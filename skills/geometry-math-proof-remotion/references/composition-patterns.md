# 几何证明 Remotion 合成模式

完整范例参考 `<VIDEO_WORKSPACE>/pythagorean-garfield-proof/src/GarfieldProof.tsx`。这里讲通用模式。

## 1. SVG 坐标变换

`pt(gx, gy)` 把数学坐标(gx 右正,gy 上正)转 SVG 像素坐标。原点默认 `(OX=100, OY=760)`,单位 `SCALE=130px`。

```ts
import {pt, poly, pathLen} from './geometry';
const A = pt(0, 0);   // SVG (100, 760)
const B = pt(3, 0);   // SVG (490, 760)
const D = pt(0, 4);   // SVG (100, 240)
```

`viewBox="0 0 1100 860"` 是固定画布。需要调整比例时改 SCALE/OX/OY,不要改 viewBox(否则影响文字/标签布局)。

## 2. 描边渐进 ("被画出来")

`stroke-dasharray = pathLen`,`stroke-dashoffset = pathLen * (1 - progress)`。`progress` 用 `drawIn(f, from, dur)` 从 0→1。

```tsx
const LEN1 = pathLen(A, B, D);
const triDraw = drawIn(f, 269, 36);

<polygon
  points={poly(A, B, D)}
  fill="none"
  stroke={C.red}
  strokeWidth={4}
  strokeLinejoin="round"
  strokeDasharray={LEN1}
  strokeDashoffset={LEN1 * (1 - triDraw)}
/>
```

填充用 `fadeIn` 延后 30 帧淡入,让描边完成后再"上色":

```tsx
const triFill = fadeIn(f, 305, 30, 1);
<polygon points={poly(A, B, D)} fill={C.redSoft} opacity={triFill}/>
```

## 3. 章节聚焦暗化

证明本章只看一个元素,其他元素 opacity 降到 0.45 暗化:

```tsx
const tri1Op = (f >= F.tri3 && f < F.trapArea) ? 0.45 : 1;
<g opacity={tri1Op}>...</g>
```

聚焦元素描边加粗:`strokeWidth={activeStroke(f >= F.tri12 && f < F.tri3) ? 6 : 4}`。

## 4. FormulaPanel 逐步揭示

`steps: FormulaStep[]` 按出现顺序排列。每条 `{from, label, expr, tone?}`。

```tsx
const STEPS: FormulaStep[] = [
  {from: F.tri12 + 30, label: '三角形 ①', expr: <span style={{color: C.red}}>{'S₁ = ab / 2'}</span>},
  {from: F.tri12 + 110, label: '相加', tone: 'accent',
   expr: <span>{'S₁ + S₂ = '}<span style={{color: C.yellow}}>ab</span></span>},
  {from: F.cancel + 160, label: '消 2ab', tone: 'result',
   expr: <span style={{color: C.yellow, fontSize: 56}}>{'a² + b² = c²'}</span>},
];

<FormulaPanel frame={frame} steps={STEPS}/>
```

`tone` 三档:
- `normal`(默认):普通推导行
- `accent`:中间强调,黄色突出关键变量(在 expr 内手动给变量加 `<span style={{color: C.yellow}}>`)
- `result`:最终结论,整行黄框大字

每步间隔 30~50 帧。`from` 锚到对应章节中段,不要堆在章节开头一次铺满。

## 5. CAPTIONS accent 拆词

每条字幕按口播节奏把关键词拆出来,标 `tone: 'accent'`:

```tsx
const CAPTIONS: Caption[] = [
  {start: 307, end: 438, parts: [
    {text: '直角边是 '},
    {text: 'a 和 b', tone: 'accent'},
    {text: ',斜边是 '},
    {text: 'c', tone: 'accent'},
    {text: ',这里用 '},
    {text: '3-4-5', tone: 'accent'},
    {text: ' 做例子。'},
  ]},
];
```

原则:变量字母、关键数字、概念名词(等腰直角三角形/直角梯形/优雅证法)标 accent;连接词、量词(整个/这个/这样)普通色。

## 6. HookOverlay / EndingOverlay

```tsx
<HookOverlay
  frame={frame}
  start={F.hook}
  end={F.prep}            // 第二章节开始处淡出
  title={'a² + b² = c²'}  // 大字公式
  subtitle="你真的会证吗?"
  caption="GARFIELD TRAPEZOID PROOF · 1876"
/>

<EndingOverlay
  frame={frame}
  start={F.ending}
  qedLabel="Q.E.D. · 证毕"
  result={'a² + b² = c²'}
  attribution={<>1876 年由后来的美国总统<br/><span style={{color: C.yellow, fontSize: 32}}>詹姆斯 · 加菲尔德</span> 发表</>}
/>
```

`title`/`result` 是 string,内部已包好字符串表达式;调用方传 `'a² + b²'` 即可,不要再嵌 JSX。

## 7. 章节末 30 帧节奏

每章最后 30 帧不要再上新元素。检查方法:渲染 `frame = F.<章名> + (下一章 - 本章) - 30` 的静帧,对照该章口播最后一句话,确认字幕、公式、几何都已经画到位。

## 8. 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│ TopBar (h=90): 系列名 · 子标题          章节名  黄色公式     │
├──────────────────────────────────┬──────────────────────────┤
│                                  │                          │
│   SVG Figure (左 1140×870)        │  FormulaPanel (右 700)   │
│   - 坐标轴(淡)                    │  - DERIVATION 标题        │
│   - 三角形①②③                    │  - 步骤列表(逐步揭示)    │
│   - 梯形外框                       │  - 最终结论黄框          │
│   - 边标签 a/b/c, 3-4-5 tag      │                          │
│                                  │                          │
├──────────────────────────────────┴──────────────────────────┤
│ CaptionStrip (h=110): 居中字幕 + accent 高亮                │
└─────────────────────────────────────────────────────────────┘
```

宽 1920,左 SVG(30~1170)+ 右公式(1190~1890),底字幕 110,顶栏 90。

## 9. 主合成装配

```tsx
export const Proof: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, color: C.text}}>
      <Audio src={staticFile('assets/audio/voice.mp3')}/>
      <BackgroundGrid frame={frame}/>
      <TopBar frame={frame}/>
      <FigurePanel frame={frame}/>
      <FormulaPanel frame={frame} steps={STEPS}/>
      <HookOverlay frame={frame} start={F.hook} end={F.prep} .../>
      <EndingOverlay frame={frame} start={F.ending} .../>
      <CaptionStrip frame={frame} captions={CAPTIONS}/>
    </AbsoluteFill>
  );
};
```
