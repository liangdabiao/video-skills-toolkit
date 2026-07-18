// ============================================================================
// ui.tsx — 文字层 + 容器 + prog 进度 helper（风格锁定文件，勿改视觉参数）
// 所有文字层（Title/BodyText/Caption）在 <Svg> 外、<Paper> 内。
// 所有图形/角色在 <Svg> 内（见 cutout.tsx）。
// ============================================================================
import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile} from 'remotion';
import {
  PAPER, INK, RED, PAPER_EDGE, FONT_TITLE, FONT_BODY, FONT_CAPTION,
} from './theme';

// —— 进度 helper（整套模板的动画时钟） ——
// 输入当前帧、元素开始帧、动画持续帧数，返回 0..1，自动 clamp。
// 所有图形/文字组件的入场都走它，保证节奏可预测、可复现。
export const prog = (frame: number, start: number, dur: number) =>
  Math.max(0, Math.min(1, (frame - start) / dur));

// ============================================================================
// 容器
// ============================================================================

// Paper：每个场景最外层。铺宣纸底色 + 默认字体 + 开场淡入。
export const Paper: React.FC<{children: React.ReactNode; bg?: string}> = ({
  children,
  bg = PAPER,
}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: bg}}>
      <AbsoluteFill style={{opacity: fade}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Svg：全屏 1920×1080 图层容器。所有位图角色（PaperActor）和图形都画在里面。
// 注意：纸片风大量用 <Img>，所以这里和 sketch-story 不同——位图也放 Svg 内方便统一 z 轴。
export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 1920 1080"
    style={{position: 'absolute', top: 0, left: 0}}
  >
    {children}
  </svg>
);

// 背景底板：直接铺一张全屏 PNG（由 gen_plates.py 生成，无人物）。
// 这是纸片风四层里的"背景层"，最慢，只在外面再做轻微推镜。
export const Plate: React.FC<{src: string; zoom?: number}> = ({src, zoom = 1}) => (
  <Img
    src={staticFile(src)}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: 1920 * zoom,
      height: 1080 * zoom,
      objectFit: 'cover',
    }}
  />
);

// ============================================================================
// 文字层（都在 Svg 外、Paper 内）
// ============================================================================

// BodyText：通用文字，淡入 + 轻微上移。剪纸字效果靠 drop-shadow 白边。
export const BodyText: React.FC<{
  x: number;            // 默认中心 x；align="left" 时是左缘
  y: number;
  text: string;
  size?: number;
  color?: string;
  start: number;        // 入场帧
  align?: 'left' | 'center' | 'right';
  weight?: number;
  font?: string;
  edge?: boolean;       // 是否加剪纸白边（标题/金句开，正文关）
}> = ({
  x, y, text, size = 40, color = INK, start, align = 'center',
  weight = 400, font = FONT_BODY, edge = false,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, 12);
  if (p <= 0) return null;
  const pos =
    align === 'left'
      ? {left: x, transform: `translateY(${(1 - p) * 14}px)`}
      : align === 'right'
        ? {right: 1920 - x, transform: `translateY(${(1 - p) * 14}px)`}
        : {left: x, transform: `translateX(-50%) translateY(${(1 - p) * 14}px)`};
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        fontSize: size,
        color,
        fontFamily: font,
        fontWeight: weight,
        opacity: p,
        whiteSpace: 'pre-line',
        textAlign: align,
        lineHeight: 1.5,
        textShadow: edge
          ? `2px 0 0 ${PAPER_EDGE}, -2px 0 0 ${PAPER_EDGE}, 0 2px 0 ${PAPER_EDGE}, 0 -2px 0 ${PAPER_EDGE}`
          : 'none',
        ...pos,
      }}
    >
      {text}
    </div>
  );
};

// Title：大标题（宋体粗 + 剪纸白边 + 红色下划线感）
export const Title: React.FC<{
  x?: number;
  y: number;
  text: string;
  size?: number;
  color?: string;
  start: number;
}> = ({x = 960, y, text, size = 78, color = INK, start}) => (
  <BodyText
    x={x}
    y={y}
    text={text}
    size={size}
    color={color}
    start={start}
    align="center"
    weight={700}
    font={FONT_TITLE}
    edge
  />
);

// Caption：底部字幕（单层，跟随旁白逐句）。纸片风字幕用黑体而非宋体，保证小字可读。
export const Caption: React.FC<{
  text: string;
  start?: number;       // 默认整场常驻；配音版按 utterance 时间挂多个
  y?: number;
}> = ({text, start = 0, y = 1000}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, 8);
  if (p <= 0 || !text) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: y,
        transform: `translateX(-50%) translateY(${(1 - p) * 10}px)`,
        fontSize: 40,
        color: '#fff',
        fontFamily: FONT_CAPTION,
        fontWeight: 500,
        opacity: p,
        textAlign: 'center',
        whiteSpace: 'pre-line',
        textShadow: '0 2px 4px rgba(0,0,0,.8), 0 0 2px rgba(0,0,0,.9)',
        maxWidth: 1600,
        padding: '8px 24px',
        borderRadius: 8,
        background: 'rgba(31,26,20,.55)',
      }}
    >
      {text}
    </div>
  );
};

// Eyebrow：小字章节标签（顶部，红字，如"第一章 · 长安"）
export const Eyebrow: React.FC<{x?: number; y: number; text: string; start: number}> = ({
  x = 960,
  y,
  text,
  start,
}) => (
  <BodyText
    x={x}
    y={y}
    text={text}
    size={36}
    color={RED}
    start={start}
    align="center"
    weight={500}
    font={FONT_CAPTION}
  />
);

// 红色印章：右下角小方章（纸片风/古风题材装饰，可选）
export const Seal: React.FC<{x: number; y: number; text: string; start: number; size?: number}> = ({
  x, y, text, start, size = 90,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `scale(${0.7 + p * 0.3}) rotate(${(1 - p) * 8}deg)`,
        opacity: p,
        background: RED,
        color: '#fff',
        fontFamily: FONT_TITLE,
        fontWeight: 700,
        fontSize: size * 0.34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        lineHeight: 1.1,
        borderRadius: 6,
        boxShadow: '0 0 0 3px rgba(255,255,255,.4) inset',
        whiteSpace: 'pre-line',
      }}
    >
      {text}
    </div>
  );
};
