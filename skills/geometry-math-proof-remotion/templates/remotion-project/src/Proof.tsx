/**
 * Proof.tsx — 主合成组件骨架。
 *
 * 这是占位实现,演示如何把通用组件拼起来。
 * 实际证明请:
 *   1. 在 work/source/script.md 拆好章节
 *   2. 跑 scripts/generate_tts.py 拿到 captions_aligned.json
 *   3. 把 F 的帧数、CAPTIONS、steps、几何坐标全部替换为本证明的内容
 */
import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame, staticFile} from 'remotion';
import {
  C, FONT_SANS, FONT_MATH, F,
  fadeIn, drawIn, pt, poly, pathLen,
} from './geometry';
import {FormulaPanel, FormulaStep} from './formula-panel';
import {CaptionStrip, Caption} from './caption-strip';
import {HookOverlay, EndingOverlay} from './hooks-overlay';

/* ---- 几何坐标 (示例: 单位三角形) ---- */
const A = pt(0, 0);
const B = pt(3, 0);
const D = pt(0, 4);
const LEN1 = pathLen(A, B, D);

/* ---- 字幕 (示例占位) ---- */
const CAPTIONS: Caption[] = [
  {start: 0, end: 90, parts: [
    {text: '示例字幕 '},
    {text: 'a² + b² = c²', tone: 'accent'},
    {text: '。'},
  ]},
];

/* ---- 公式步骤 (示例占位) ---- */
const STEPS: FormulaStep[] = [
  {from: 60, label: '面积一', expr: <span>{'S₁ = ab / 2'}</span>},
  {from: 120, label: '结论', tone: 'result', expr: <span>{'a² + b² = c²'}</span>},
];

const BackgroundGrid: React.FC<{frame: number}> = ({frame}) => {
  const op = fadeIn(frame, 0, 30, 1);
  return (
    <AbsoluteFill style={{opacity: op}}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke={C.grid} strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>
    </AbsoluteFill>
  );
};

const FigurePanel: React.FC<{frame: number}> = ({frame: f}) => {
  const triDraw = drawIn(f, 30, 36);
  const triFill = fadeIn(f, 66, 30, 1);
  return (
    <div style={{position: 'absolute', left: 30, top: 100, width: 1140, height: 870}}>
      <svg width="100%" height="100%" viewBox="0 0 1100 860">
        <polygon points={poly(A, B, D)} fill={C.redSoft} opacity={triFill}/>
        <polygon
          points={poly(A, B, D)} fill="none" stroke={C.red} strokeWidth={4}
          strokeLinejoin="round" strokeDasharray={LEN1}
          strokeDashoffset={LEN1 * (1 - triDraw)}
        />
      </svg>
    </div>
  );
};

export const Proof: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, color: C.text}}>
      <Audio src={staticFile('assets/audio/voice.mp3')}/>
      <BackgroundGrid frame={frame}/>
      <FigurePanel frame={frame}/>
      <FormulaPanel frame={frame} steps={STEPS}/>
      <HookOverlay
        frame={frame} start={F.hook} end={120}
        title={'a² + b² = c²'}
        subtitle="示例证明副标题"
        caption="EXAMPLE PROOF"
      />
      <EndingOverlay
        frame={frame} start={1400}
        qedLabel="Q.E.D. · 证毕"
        result={'a² + b² = c²'}
        attribution="示例署名"
      />
      <CaptionStrip frame={frame} captions={CAPTIONS}/>
    </AbsoluteFill>
  );
};
