import React from 'react';
import {interpolate} from 'remotion';
import {blobPath, DrawPath, wobblyLine, wobblyRect} from './sketch';
import {INK} from './theme';

export type Mood = 'neutral' | 'worried' | 'shocked' | 'happy' | 'thinking';

// Hand-drawn stick figure person: wobbly circle head + stick body/arms/legs.
// Used for all human characters (小白 / 老吴 / 客户). AI stays as blob/screen.
export const StickMan: React.FC<{
  x: number;
  y: number; // ground position (feet)
  size?: number; // total height
  seed: string;
  progress: number;
  mood?: Mood;
  bob?: number;
  armsUp?: boolean;
  flip?: boolean;
  glasses?: boolean;
  hair?: boolean;
}> = ({
  x,
  y,
  size = 150,
  seed,
  progress,
  mood = 'neutral',
  bob = 0,
  armsUp = false,
  flip = false,
  glasses = false,
  hair = true,
}) => {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return null;
  const bobY = Math.sin(bob * 0.09) * size * 0.015;
  const headR = size * 0.185;
  const headCy = y - size + headR + bobY;
  const neckY = headCy + headR;
  const hipY = y - size * 0.3 + bobY;
  const shoulderY = neckY + size * 0.07;
  const armLen = size * 0.3;
  const legSpread = size * 0.14;

  const faceOpacity = interpolate(p, [0.4, 0.85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const eyeDx = headR * 0.38;
  const eyeY = headCy - headR * 0.08;
  const eyeR = headR * 0.11;
  const mouthY = headCy + headR * 0.45;
  const sw = Math.max(3, size * 0.026);

  return (
    <g transform={flip ? `translate(${2 * x} 0) scale(-1,1)` : undefined}>
      {/* head */}
      <path
        d={blobPath(x, headCy, headR, headR, `${seed}head`, 10, 0.05)}
        fill="#fff"
        fillOpacity={faceOpacity}
        stroke={INK}
        strokeWidth={sw}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - Math.min(1, p * 1.8)}
      />
      {/* hair: a few short strokes on top */}
      {hair && (
        <g opacity={faceOpacity}>
          {[-0.5, -0.15, 0.25].map((t, i) => (
            <path
              key={i}
              d={wobblyLine(
                x + t * headR,
                headCy - headR * 0.92,
                x + t * headR - headR * 0.12,
                headCy - headR * 1.28,
                `${seed}hair${i}`,
                0.8
              )}
              stroke={INK}
              strokeWidth={sw * 0.8}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </g>
      )}
      {/* body */}
      <DrawPath
        d={wobblyLine(x, neckY, x, hipY, `${seed}body`, 1.5)}
        progress={Math.min(1, p * 1.4)}
        strokeWidth={sw}
      />
      {/* arms */}
      {armsUp ? (
        <>
          <DrawPath
            d={wobblyLine(x, shoulderY, x - armLen * 0.75, shoulderY - armLen * 0.85, `${seed}armL`, 1.5)}
            progress={p}
            strokeWidth={sw}
          />
          <DrawPath
            d={wobblyLine(x, shoulderY, x + armLen * 0.75, shoulderY - armLen * 0.85, `${seed}armR`, 1.5)}
            progress={p}
            strokeWidth={sw}
          />
        </>
      ) : (
        <>
          <DrawPath
            d={wobblyLine(x, shoulderY, x - armLen * 0.6, shoulderY + armLen * 0.8, `${seed}armL`, 1.5)}
            progress={p}
            strokeWidth={sw}
          />
          <DrawPath
            d={wobblyLine(x, shoulderY, x + armLen * 0.6, shoulderY + armLen * 0.8, `${seed}armR`, 1.5)}
            progress={p}
            strokeWidth={sw}
          />
        </>
      )}
      {/* legs */}
      <DrawPath
        d={wobblyLine(x, hipY, x - legSpread, y, `${seed}legL`, 1.5)}
        progress={p}
        strokeWidth={sw}
      />
      <DrawPath
        d={wobblyLine(x, hipY, x + legSpread, y, `${seed}legR`, 1.5)}
        progress={p}
        strokeWidth={sw}
      />
      {/* feet */}
      <DrawPath
        d={wobblyLine(x - legSpread, y, x - legSpread - size * 0.09, y, `${seed}ftL`, 1)}
        progress={p}
        strokeWidth={sw}
      />
      <DrawPath
        d={wobblyLine(x + legSpread, y, x + legSpread + size * 0.09, y, `${seed}ftR`, 1)}
        progress={p}
        strokeWidth={sw}
      />
      {/* face */}
      <g opacity={faceOpacity}>
        {glasses && (
          <>
            <circle cx={x - eyeDx} cy={eyeY} r={eyeR * 2.4} fill="none" stroke={INK} strokeWidth={sw * 0.6} />
            <circle cx={x + eyeDx} cy={eyeY} r={eyeR * 2.4} fill="none" stroke={INK} strokeWidth={sw * 0.6} />
            <path
              d={`M ${x - eyeDx + eyeR * 2.4} ${eyeY} L ${x + eyeDx - eyeR * 2.4} ${eyeY}`}
              stroke={INK}
              strokeWidth={sw * 0.6}
            />
          </>
        )}
        {mood === 'shocked' ? (
          <>
            <circle cx={x - eyeDx} cy={eyeY} r={eyeR * 1.6} fill="none" stroke={INK} strokeWidth={sw * 0.7} />
            <circle cx={x + eyeDx} cy={eyeY} r={eyeR * 1.6} fill="none" stroke={INK} strokeWidth={sw * 0.7} />
            <ellipse cx={x} cy={mouthY} rx={eyeR * 1.3} ry={eyeR * 1.7} fill="none" stroke={INK} strokeWidth={sw * 0.7} />
          </>
        ) : mood === 'worried' ? (
          <>
            <circle cx={x - eyeDx} cy={eyeY} r={eyeR} fill={INK} />
            <circle cx={x + eyeDx} cy={eyeY} r={eyeR} fill={INK} />
            <path
              d={wobblyLine(x - eyeDx - eyeR * 1.6, eyeY - eyeR * 2.2, x - eyeDx + eyeR, eyeY - eyeR * 3.2, `${seed}bw1`, 0.5)}
              stroke={INK}
              strokeWidth={sw * 0.6}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={wobblyLine(x + eyeDx - eyeR, eyeY - eyeR * 3.2, x + eyeDx + eyeR * 1.6, eyeY - eyeR * 2.2, `${seed}bw2`, 0.5)}
              stroke={INK}
              strokeWidth={sw * 0.6}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${x - eyeR * 2} ${mouthY} q ${eyeR} ${-eyeR * 1.2} ${eyeR * 2} 0 q ${eyeR} ${eyeR * 1.2} ${eyeR * 2} 0`}
              stroke={INK}
              strokeWidth={sw * 0.6}
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : mood === 'happy' ? (
          <>
            <path
              d={`M ${x - eyeDx - eyeR * 1.4} ${eyeY} Q ${x - eyeDx} ${eyeY - eyeR * 2.2} ${x - eyeDx + eyeR * 1.4} ${eyeY}`}
              stroke={INK}
              strokeWidth={sw * 0.7}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${x + eyeDx - eyeR * 1.4} ${eyeY} Q ${x + eyeDx} ${eyeY - eyeR * 2.2} ${x + eyeDx + eyeR * 1.4} ${eyeY}`}
              stroke={INK}
              strokeWidth={sw * 0.7}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${x - eyeR * 2.4} ${mouthY - eyeR} Q ${x} ${mouthY + eyeR * 2} ${x + eyeR * 2.4} ${mouthY - eyeR}`}
              stroke={INK}
              strokeWidth={sw * 0.7}
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : mood === 'thinking' ? (
          <>
            <circle cx={x - eyeDx + eyeR * 0.8} cy={eyeY - eyeR * 0.6} r={eyeR} fill={INK} />
            <circle cx={x + eyeDx + eyeR * 0.8} cy={eyeY - eyeR * 0.6} r={eyeR} fill={INK} />
            <path
              d={`M ${x - eyeR * 1.5} ${mouthY} L ${x + eyeR * 1.5} ${mouthY}`}
              stroke={INK}
              strokeWidth={sw * 0.6}
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <circle cx={x - eyeDx} cy={eyeY} r={eyeR} fill={INK} />
            <circle cx={x + eyeDx} cy={eyeY} r={eyeR} fill={INK} />
            <path
              d={`M ${x - eyeR * 1.8} ${mouthY} Q ${x} ${mouthY + eyeR} ${x + eyeR * 1.8} ${mouthY}`}
              stroke={INK}
              strokeWidth={sw * 0.6}
              fill="none"
              strokeLinecap="round"
            />
          </>
        )}
      </g>
    </g>
  );
};

// 老吴: bigger blob + thermos cup
export const ThermosCup: React.FC<{x: number; y: number; seed: string; progress: number; scale?: number}> = ({
  x,
  y,
  seed,
  progress,
  scale = 1,
}) => {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return null;
  const w = 26 * scale;
  const h = 40 * scale;
  return (
    <g>
      <DrawPath d={wobblyRect(x - w / 2, y - h, w, h, `${seed}cup`, 1.2)} progress={p} strokeWidth={3} />
      <DrawPath
        d={wobblyRect(x - w / 2 - 2, y - h - 8 * scale, w + 4, 8 * scale, `${seed}lid`, 1)}
        progress={p}
        strokeWidth={3}
      />
      {/* steam */}
      <DrawPath
        d={`M ${x - 4} ${y - h - 14 * scale} q 6 -8 0 -14 q -6 -8 2 -14`}
        progress={interpolate(p, [0.6, 1], [0, 1], {extrapolateLeft: 'clamp'})}
        strokeWidth={2}
        stroke="#888"
      />
    </g>
  );
};

// Q-cute face: big shiny eyes + blush + open smile. Shared by AiScreen and CuteAi.
const BLUSH = '#f2a0a0';
export const CuteFace: React.FC<{cx: number; cy: number; scale?: number}> = ({cx, cy, scale = 1}) => {
  const eyeDx = 34 * scale;
  const eyeY = cy - 12 * scale;
  const eyeR = 13 * scale;
  return (
    <g>
      {/* eyes with highlight */}
      <circle cx={cx - eyeDx} cy={eyeY} r={eyeR} fill={INK} />
      <circle cx={cx + eyeDx} cy={eyeY} r={eyeR} fill={INK} />
      <circle cx={cx - eyeDx - eyeR * 0.3} cy={eyeY - eyeR * 0.35} r={eyeR * 0.32} fill="#fff" />
      <circle cx={cx + eyeDx - eyeR * 0.3} cy={eyeY - eyeR * 0.35} r={eyeR * 0.32} fill="#fff" />
      {/* blush */}
      <ellipse cx={cx - eyeDx - eyeR * 1.2} cy={eyeY + eyeR * 1.6} rx={11 * scale} ry={6 * scale} fill={BLUSH} opacity={0.55} />
      <ellipse cx={cx + eyeDx + eyeR * 1.2} cy={eyeY + eyeR * 1.6} rx={11 * scale} ry={6 * scale} fill={BLUSH} opacity={0.55} />
      {/* open smile */}
      <path
        d={`M ${cx - 14 * scale} ${cy + 18 * scale} Q ${cx} ${cy + 34 * scale} ${cx + 14 * scale} ${cy + 18 * scale} Z`}
        fill={INK}
        stroke={INK}
        strokeWidth={2 * scale}
        strokeLinejoin="round"
      />
    </g>
  );
};

// Standalone cute computer character for 小智: monitor body with antenna,
// cute face, stubby arms and legs.
export const CuteAi: React.FC<{
  x: number;
  y: number; // ground position (feet)
  size?: number; // monitor width
  seed: string;
  progress: number;
  bob?: number;
}> = ({x, y, size = 200, seed, progress, bob = 0}) => {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return null;
  const w = size;
  const h = size * 0.74;
  const bobY = Math.sin(bob * 0.09) * size * 0.02;
  const legLen = size * 0.14;
  const sy = y - legLen - h + bobY;
  const sx = x - w / 2;
  const cy = sy + h / 2;
  const faceOpacity = interpolate(p, [0.5, 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sw = Math.max(3, size * 0.018);
  return (
    <g>
      {/* antenna */}
      <DrawPath
        d={wobblyLine(x, sy, x, sy - size * 0.14, `${seed}ant`, 1)}
        progress={p}
        strokeWidth={sw}
      />
      <circle
        cx={x}
        cy={sy - size * 0.17}
        r={size * 0.04}
        fill={BLUSH}
        stroke={INK}
        strokeWidth={sw * 0.8}
        opacity={faceOpacity}
      />
      {/* monitor body */}
      <rect x={sx} y={sy} width={w} height={h} rx={size * 0.08} fill="#fff" opacity={Math.min(1, p * 1.5)} />
      <DrawPath d={wobblyRect(sx, sy, w, h, `${seed}mon`, 2)} progress={p} strokeWidth={sw * 1.3} />
      {/* stubby arms */}
      <DrawPath
        d={wobblyLine(sx, cy + h * 0.1, sx - size * 0.12, cy + h * 0.28, `${seed}armL`, 1.2)}
        progress={p}
        strokeWidth={sw}
      />
      <DrawPath
        d={wobblyLine(sx + w, cy + h * 0.1, sx + w + size * 0.12, cy + h * 0.28, `${seed}armR`, 1.2)}
        progress={p}
        strokeWidth={sw}
      />
      {/* stubby legs + feet */}
      <DrawPath d={wobblyLine(x - w * 0.22, sy + h, x - w * 0.22, y, `${seed}legL`, 1)} progress={p} strokeWidth={sw} />
      <DrawPath d={wobblyLine(x + w * 0.22, sy + h, x + w * 0.22, y, `${seed}legR`, 1)} progress={p} strokeWidth={sw} />
      <DrawPath d={wobblyLine(x - w * 0.22, y, x - w * 0.22 - size * 0.07, y, `${seed}ftL`, 0.8)} progress={p} strokeWidth={sw} />
      <DrawPath d={wobblyLine(x + w * 0.22, y, x + w * 0.22 + size * 0.07, y, `${seed}ftR`, 0.8)} progress={p} strokeWidth={sw} />
      {/* face */}
      <g opacity={faceOpacity}>
        <CuteFace cx={x} cy={cy} scale={size / 240} />
      </g>
    </g>
  );
};

// Computer / screen with the AI assistant "小智" face
export const AiScreen: React.FC<{
  x: number; // center x
  y: number; // bottom y
  w?: number;
  h?: number;
  seed: string;
  progress: number;
  faceOn?: boolean;
  children?: React.ReactNode;
}> = ({x, y, w = 320, h = 210, seed, progress, faceOn = false, children}) => {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return null;
  const sx = x - w / 2;
  const sy = y - h - 40;
  return (
    <g>
      {/* screen */}
      <rect x={sx} y={sy} width={w} height={h} fill="#fff" opacity={Math.min(1, p * 1.5)} />
      <DrawPath d={wobblyRect(sx, sy, w, h, `${seed}scr`, 2)} progress={p} strokeWidth={3.5} />
      {/* stand */}
      <DrawPath d={wobblyLine(x, sy + h, x, sy + h + 26, `${seed}st`, 1.5)} progress={p} strokeWidth={4} />
      <DrawPath d={wobblyLine(x - 46, y, x + 46, y, `${seed}base`, 1.5)} progress={p} strokeWidth={4} />
      {faceOn && (
        <g opacity={interpolate(p, [0.7, 1], [0, 1], {extrapolateLeft: 'clamp'})}>
          <CuteFace cx={x} cy={sy + h * 0.5} scale={Math.min(w, h) / 180} />
        </g>
      )}
      {children ? <g transform={`translate(${sx} ${sy})`}>{children}</g> : null}
    </g>
  );
};

// Desk line
export const DeskLine: React.FC<{x1: number; x2: number; y: number; seed: string; progress: number}> = ({
  x1,
  x2,
  y,
  seed,
  progress,
}) => <DrawPath d={wobblyLine(x1, y, x2, y, seed, 2)} progress={progress} strokeWidth={4} />;
