import type {CSSProperties} from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {colors} from "./theme";
import {clamp} from "./shared";

// === Premium Grid Background =====================================
// 完整沿用 talking-head-remotion 的 PremiumGridBackground：
// 暖白画布 + 上下镜像透视格子 + 中心 veil + grain
// 见 talking-head-remotion/references/visual-guide.md

const canvasHeight = 1080;
const nearY = -78;
const farY = 342;
const planeHeight = farY - nearY;
const rowStep = 62;

export const PremiumGridBackground = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const glow = 0.5 + Math.sin(seconds * 0.48) * 0.5;

  return (
    <AbsoluteFill style={premiumBackgroundStyle}>
      <AbsoluteFill style={ambientWashStyle(seconds)} />
      <PerspectiveGrid seconds={seconds} glow={glow} />
      <div style={{...horizonLineStyle, top: 184, opacity: 0.32 + glow * 0.08}} />
      <div style={{...horizonLineStyle, bottom: 184, opacity: 0.32 + glow * 0.08}} />
      <AbsoluteFill style={centerVeilStyle} />
      <AbsoluteFill style={grainStyle(seconds)} />
    </AbsoluteFill>
  );
};

const PerspectiveGrid = ({seconds, glow}: {seconds: number; glow: number}) => {
  const rowDrift = (seconds * 34) % rowStep;
  const rows = Array.from(
    {length: 8},
    (_, index) => nearY + ((index * rowStep + rowDrift) % planeHeight),
  );
  const verticals = Array.from({length: 23}, (_, index) => index - 11);
  const project = (y: number) => {
    const t = clamp((y - nearY) / planeHeight, 0, 1);
    return {left: -230 + t * 420, right: 2150 - t * 420};
  };
  const mirrorY = (y: number) => canvasHeight - y;
  const nearX = (index: number) => 960 + index * 154;
  const farX = (index: number) => 960 + index * 76;

  return (
    <svg viewBox="0 0 1920 1080" style={perspectiveGridSvgStyle}>
      <defs>
        <linearGradient id="grid-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(44,58,78,0.16)" />
          <stop offset="52%" stopColor="rgba(47,111,255,0.30)" />
          <stop offset="100%" stopColor="rgba(235,178,82,0.22)" />
        </linearGradient>
      </defs>
      <g opacity={0.72 + glow * 0.08}>
        {rows.map((y) => {
          const projected = project(y);
          return (
            <line
              key={`top-row-${y.toFixed(2)}`}
              x1={projected.left}
              x2={projected.right}
              y1={y}
              y2={y}
              stroke="rgba(37,50,72,0.30)"
              strokeWidth={3.1}
              strokeLinecap="round"
            />
          );
        })}
        {verticals.map((index) => (
          <line
            key={`top-col-${index}`}
            x1={nearX(index)}
            y1={nearY}
            x2={farX(index)}
            y2={farY}
            stroke="url(#grid-stroke)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}
      </g>
      <g opacity={0.72 + glow * 0.08}>
        {rows.map((topY) => {
          const y = mirrorY(topY);
          const projected = project(topY);
          return (
            <line
              key={`bottom-row-${y.toFixed(2)}`}
              x1={projected.left}
              x2={projected.right}
              y1={y}
              y2={y}
              stroke="rgba(37,50,72,0.30)"
              strokeWidth={3.1}
              strokeLinecap="round"
            />
          );
        })}
        {verticals.map((index) => (
          <line
            key={`bottom-col-${index}`}
            x1={farX(index)}
            y1={mirrorY(farY)}
            x2={nearX(index)}
            y2={mirrorY(nearY)}
            stroke="url(#grid-stroke)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
};

const premiumBackgroundStyle: CSSProperties = {
  backgroundColor: colors.canvas,
  pointerEvents: "none",
  overflow: "hidden",
};

const ambientWashStyle = (seconds: number): CSSProperties => ({
  background: [
    `radial-gradient(760px 520px at ${18 + Math.sin(seconds * 0.22) * 4}% ${8 + Math.cos(seconds * 0.18) * 3}%, rgba(47,111,255,0.10), transparent 66%)`,
    `radial-gradient(720px 500px at ${84 + Math.cos(seconds * 0.2) * 4}% ${18 + Math.sin(seconds * 0.19) * 3}%, rgba(246,196,102,0.10), transparent 64%)`,
    "linear-gradient(180deg, #fbfcf8 0%, #f2f6f8 46%, #fbfaf4 100%)",
  ].join(", "),
});

const horizonLineStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 1,
  background:
    "linear-gradient(90deg, transparent 4%, rgba(47,111,255,0.26) 32%, rgba(246,196,102,0.18) 62%, transparent 96%)",
  boxShadow: "0 0 24px rgba(47,111,255,0.12)",
};

const centerVeilStyle: CSSProperties = {
  background: [
    "linear-gradient(180deg, transparent 0%, rgba(247,248,243,0.08) 16%, rgba(247,248,243,0.78) 34%, rgba(247,248,243,0.94) 50%, rgba(247,248,243,0.78) 66%, rgba(247,248,243,0.08) 84%, transparent 100%)",
    "radial-gradient(58% 34% at 50% 51%, rgba(255,255,255,0.72), transparent 72%)",
  ].join(", "),
};

const grainStyle = (seconds: number): CSSProperties => ({
  opacity: 0.06,
  backgroundImage: "radial-gradient(rgba(21,25,34,0.35) 0.7px, transparent 0.7px)",
  backgroundSize: "4px 4px",
  backgroundPosition: `${Math.round(seconds * 3) % 4}px ${Math.round(seconds * 2) % 4}px`,
});

const perspectiveGridSvgStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  filter: "drop-shadow(0 18px 30px rgba(47,111,255,0.08))",
};
