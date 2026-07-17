import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {FONT, INK, PAPER, RED} from './theme';
import {SketchUnderline} from './sketch';

// clamp-progress helper: 0..1 between start and start+dur
export const prog = (frame: number, start: number, dur: number) =>
  Math.max(0, Math.min(1, (frame - start) / dur));

export const Paper: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: PAPER, fontFamily: FONT}}>
      <AbsoluteFill style={{opacity: fade}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// hand-written text that fades/rises in
export const HandText: React.FC<{
  x: number;
  y: number;
  size?: number;
  color?: string;
  start: number;
  weight?: number;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}> = ({x, y, size = 40, color = INK, start, weight = 400, align = 'center', children}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        ...(align === 'left'
          ? {left: x, transform: `translateY(${(1 - p) * 14}px)`}
          : align === 'right'
            ? {right: 1920 - x, transform: `translateY(${(1 - p) * 14}px)`}
            : {left: x, transform: `translateX(-50%) translateY(${(1 - p) * 14}px)`}),
        top: y,
        fontSize: size,
        color,
        fontFamily: FONT,
        fontWeight: weight,
        opacity: p,
        whiteSpace: 'pre-line',
        textAlign: align,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
};

// red hand-drawn title with underline, like "两个断点" in the reference
export const RedTitle: React.FC<{
  x: number;
  y: number;
  width: number;
  start: number;
  size?: number;
  color?: string;
  children: React.ReactNode;
}> = ({x, y, width, start, size = 56, color = RED, children}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, 14);
  const up = prog(frame, start + 8, 16);
  return (
    <>
      <HandText x={x} y={y} size={size} color={color} start={start} weight={700}>
        {children}
      </HandText>
      <svg
        style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
      >
        <SketchUnderline
          x1={x - width / 2}
          x2={x + width / 2}
          y={y + size * 1.45}
          seed={`ul${x}${y}`}
          progress={up}
          stroke={color}
        />
      </svg>
      {p > 0 ? null : null}
    </>
  );
};

// bottom narration line (the "storyteller" voice)
export const Narration: React.FC<{
  start: number;
  color?: string;
  children: React.ReactNode;
  y?: number;
  size?: number;
}> = ({start, color = INK, children, y = 960, size = 42}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        textAlign: 'center',
        fontSize: size,
        color,
        fontFamily: FONT,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {children}
    </div>
  );
};

// speech bubble with a hand-drawn feel (CSS approximation + wobbly border radius)
export const Bubble: React.FC<{
  x: number;
  y: number;
  w: number;
  start: number;
  size?: number;
  tail?: 'left' | 'right';
  color?: string;
  children: React.ReactNode;
}> = ({x, y, w, start, size = 34, tail = 'left', color = INK, children}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, 10);
  if (p <= 0) return null;
  const scale = 0.85 + 0.15 * p;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        opacity: p,
        transform: `scale(${scale})`,
        transformOrigin: tail === 'left' ? 'bottom left' : 'bottom right',
      }}
    >
      <div
        style={{
          border: `3px solid ${INK}`,
          borderRadius: '48% 52% 50% 50% / 55% 48% 52% 45%',
          padding: '20px 30px',
          fontSize: size,
          fontFamily: FONT,
          color,
          background: '#fff',
          lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -16,
          [tail === 'left' ? 'left' : 'right']: 44,
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: `20px solid ${INK}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -10,
          [tail === 'left' ? 'left' : 'right']: 47,
          width: 0,
          height: 0,
          borderLeft: '9px solid transparent',
          borderRight: '9px solid transparent',
          borderTop: '16px solid #fff',
        }}
      />
    </div>
  );
};

// full-screen svg layer helper
export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg
    style={{position: 'absolute', left: 0, top: 0}}
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
  >
    {children}
  </svg>
);
