import React from 'react';
import {interpolate, random} from 'remotion';
import {INK} from './theme';

// ---------- path generators (deterministic wobble) ----------

export const wobblyLine = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: string,
  jitter = 2.4
): string => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const segments = Math.max(4, Math.round(len / 40));
  let d = '';
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const edge = i === 0 || i === segments ? 0.4 : 1;
    const jx = (random(`${seed}x${i}`) - 0.5) * jitter * 2 * edge;
    const jy = (random(`${seed}y${i}`) - 0.5) * jitter * 2 * edge;
    const x = x1 + (x2 - x1) * t + jx;
    const y = y1 + (y2 - y1) * t + jy;
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
};

export const wobblyRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  seed: string,
  jitter = 2.2
): string => {
  return [
    wobblyLine(x - 2, y, x + w + 3, y, `${seed}t`, jitter),
    wobblyLine(x + w, y - 2, x + w, y + h + 3, `${seed}r`, jitter),
    wobblyLine(x + w + 2, y + h, x - 3, y + h, `${seed}b`, jitter),
    wobblyLine(x, y + h + 2, x, y - 3, `${seed}l`, jitter),
  ].join(' ');
};

// closed smooth blob (for characters / clouds)
export const blobPath = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: string,
  points = 12,
  jitter = 0.055
): string => {
  const pts: {x: number; y: number}[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const j = 1 + (random(`${seed}${i}`) - 0.5) * jitter * 2;
    pts.push({x: cx + Math.cos(a) * rx * j, y: cy + Math.sin(a) * ry * j});
  }
  const mid = (a: {x: number; y: number}, b: {x: number; y: number}) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });
  let d = `M ${mid(pts[0], pts[1]).x.toFixed(1)} ${mid(pts[0], pts[1]).y.toFixed(1)}`;
  for (let i = 1; i <= points; i++) {
    const p = pts[i % points];
    const m = mid(p, pts[(i + 1) % points]);
    d += ` Q ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)}`;
  }
  return d + ' Z';
};

// ---------- drawing components ----------

export const DrawPath: React.FC<{
  d: string;
  progress: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillDelay?: boolean;
}> = ({d, progress, stroke = INK, strokeWidth = 3, fill = 'none', fillDelay = true}) => {
  const p = Math.max(0, Math.min(1, progress));
  const fillOpacity =
    fill === 'none' ? 0 : fillDelay ? interpolate(p, [0.6, 1], [0, 1], {extrapolateLeft: 'clamp'}) : 1;
  return (
    <path
      d={d}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill === 'none' ? 'none' : fill}
      fillOpacity={fillOpacity}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - p}
    />
  );
};

export const SketchRect: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  seed: string;
  progress: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}> = ({x, y, w, h, seed, progress, stroke = INK, strokeWidth = 3, fill = 'none'}) => {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <g>
      {fill !== 'none' && (
        <rect x={x} y={y} width={w} height={h} fill={fill} opacity={Math.min(1, p * 1.4)} />
      )}
      <DrawPath d={wobblyRect(x, y, w, h, seed)} progress={p} stroke={stroke} strokeWidth={strokeWidth} />
    </g>
  );
};

// orange hand-drawn arrow like the reference image
export const SketchArrow: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  seed: string;
  progress: number;
  stroke?: string;
  strokeWidth?: number;
}> = ({x1, y1, x2, y2, seed, progress, stroke = '#e8862e', strokeWidth = 3.5}) => {
  const p = Math.max(0, Math.min(1, progress));
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 16;
  const headP = interpolate(p, [0.7, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ha1 = angle + Math.PI - 0.5;
  const ha2 = angle + Math.PI + 0.5;
  return (
    <g>
      <DrawPath d={wobblyLine(x1, y1, x2, y2, seed)} progress={p} stroke={stroke} strokeWidth={strokeWidth} />
      <DrawPath
        d={wobblyLine(x2, y2, x2 + Math.cos(ha1) * headLen, y2 + Math.sin(ha1) * headLen, `${seed}h1`, 1)}
        progress={headP}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <DrawPath
        d={wobblyLine(x2, y2, x2 + Math.cos(ha2) * headLen, y2 + Math.sin(ha2) * headLen, `${seed}h2`, 1)}
        progress={headP}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};

// rough red circle used to highlight something
export const SketchHighlightCircle: React.FC<{
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  seed: string;
  progress: number;
  stroke?: string;
}> = ({cx, cy, rx, ry, seed, progress, stroke = '#d0402b'}) => {
  const p = Math.max(0, Math.min(1, progress));
  // 1.15 loops around, slightly open like a real hand-drawn circle
  const points = 26;
  let d = '';
  for (let i = 0; i <= points; i++) {
    const a = -Math.PI / 3 + (i / points) * Math.PI * 2.15;
    const j = 1 + (random(`${seed}${i}`) - 0.5) * 0.08;
    const x = cx + Math.cos(a) * rx * j;
    const y = cy + Math.sin(a) * ry * j;
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return <DrawPath d={d} progress={p} stroke={stroke} strokeWidth={4} />;
};

// small cross-out (X) over something rejected
export const SketchCross: React.FC<{
  cx: number;
  cy: number;
  size: number;
  seed: string;
  progress: number;
  stroke?: string;
}> = ({cx, cy, size, seed, progress, stroke = '#d0402b'}) => {
  const p = Math.max(0, Math.min(1, progress));
  const s = size / 2;
  return (
    <g>
      <DrawPath
        d={wobblyLine(cx - s, cy - s, cx + s, cy + s, `${seed}a`, 2)}
        progress={Math.min(1, p * 2)}
        stroke={stroke}
        strokeWidth={4.5}
      />
      <DrawPath
        d={wobblyLine(cx + s, cy - s, cx - s, cy + s, `${seed}b`, 2)}
        progress={Math.max(0, p * 2 - 1)}
        stroke={stroke}
        strokeWidth={4.5}
      />
    </g>
  );
};

// hand-drawn underline (for red titles)
export const SketchUnderline: React.FC<{
  x1: number;
  x2: number;
  y: number;
  seed: string;
  progress: number;
  stroke?: string;
}> = ({x1, x2, y, seed, progress, stroke = '#d0402b'}) => (
  <DrawPath d={wobblyLine(x1, y, x2, y, seed, 2)} progress={progress} stroke={stroke} strokeWidth={3.5} />
);

// tiny paper sheet (like flying documents in the reference)
export const PaperSheet: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotate?: number;
  seed: string;
  progress: number;
  lines?: number;
}> = ({x, y, w = 46, h = 58, rotate = 0, seed, progress, lines = 3}) => {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} opacity={Math.min(1, p * 2)}>
      <rect x={0} y={0} width={w} height={h} fill="#fff" />
      <DrawPath d={wobblyRect(0, 0, w, h, `${seed}r`, 1.4)} progress={p} strokeWidth={2.2} />
      {Array.from({length: lines}).map((_, i) => (
        <DrawPath
          key={i}
          d={wobblyLine(w * 0.16, h * (0.28 + i * 0.22), w * 0.84, h * (0.28 + i * 0.22), `${seed}l${i}`, 1)}
          progress={p}
          strokeWidth={1.8}
          stroke="#555"
        />
      ))}
    </g>
  );
};
