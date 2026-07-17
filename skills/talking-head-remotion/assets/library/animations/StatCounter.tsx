import type {CSSProperties} from "react";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

/**
 * StatCounter —— 数字滚动 / 横向数据条。
 *
 * 用法：包在 <Sequence from={起始帧}> 里，appearAt 或 items[].appearAt 是组件内相对秒数。
 * counter 模式滚到目标数字，bars 模式逐条长出；落定后保留轻微辉光/高光持续动效。
 * SFX 卡点：数字落定帧、每条 bar 到位帧。
 *
 * 适合：倍数、比例、耗时、返工率、前后对比。
 * 不适合：没有数据含义的装饰性大数字。
 */
export type StatCounterItem = {
  label: string;
  value: number;
  max: number;
  appearAt: number;
  color?: string;
};

export type StatCounterProps = {
  mode?: "counter" | "bars";
  value?: number;
  startValue?: number;
  appearAt?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  decimals?: number;
  items?: StatCounterItem[];
  emphasizeAt?: number;
  width?: number;
  fontFamily?: string;
  theme?: {
    text?: string;
    muted?: string;
    accent?: string;
    track?: string;
    glow?: string;
  };
  style?: CSSProperties;
};

const defaultTheme = {
  text: "#151922",
  muted: "#747982",
  accent: "#2f6fff",
  track: "rgba(28,38,54,0.10)",
  glow: "rgba(47,111,255,0.24)",
};

export const StatCounter = ({
  mode = "counter",
  value = 0,
  startValue = 0,
  appearAt = 0,
  duration = 1.2,
  prefix = "",
  suffix = "",
  label = "",
  decimals = 0,
  items = [],
  emphasizeAt,
  width = 720,
  fontFamily = '"Space Grotesk", sans-serif',
  theme,
  style,
}: StatCounterProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const colors = {...defaultTheme, ...theme};

  if (mode === "bars") {
    return (
      <div style={{width, fontFamily, color: colors.text, display: "flex", flexDirection: "column", gap: 22, ...style}}>
        {items.map((item, index) => {
          const p = interpolate(t, [item.appearAt, item.appearAt + duration], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const valueNow = item.value * p;
          const widthP = item.max === 0 ? 0 : Math.min(item.value / item.max, 1) * p;
          const barColor = item.color ?? colors.accent;
          const shimmer = (frame / 80 + index * 0.2) % 1;

          return (
            <div key={`${item.label}-${index}`} style={{display: "grid", gridTemplateColumns: "128px 1fr 92px", alignItems: "center", gap: 18}}>
              <div style={{fontSize: 22, fontWeight: 700, color: colors.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                {item.label}
              </div>
              <div
                style={{
                  height: 24,
                  borderRadius: 999,
                  background: colors.track,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthP * 100}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: barColor,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `${shimmer * 100}%`,
                      width: 42,
                      background: "rgba(255,255,255,0.28)",
                      transform: "skewX(-18deg)",
                    }}
                  />
                </div>
              </div>
              <div style={{fontSize: 26, fontWeight: 800, textAlign: "right", fontVariantNumeric: "tabular-nums"}}>
                {formatNumber(valueNow, decimals)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const p = interpolate(t, [appearAt, appearAt + duration * 0.8, appearAt + duration], [0, 0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const currentValue = startValue + (value - startValue) * p;
  const targetText = `${prefix}${formatNumber(value, decimals)}${suffix}`;
  const currentText = `${prefix}${formatNumber(currentValue, decimals)}${suffix}`;
  const glow = 0.55 + Math.sin(frame / 24) * 0.18;
  const emphasisLocal = emphasizeAt === undefined ? 999 : t - emphasizeAt;
  const pulse =
    emphasisLocal >= 0 && emphasisLocal < 0.45
      ? interpolate(emphasisLocal, [0, 0.16, 0.45], [1, 1.08, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })
      : 1;

  return (
    <div style={{width, fontFamily, color: colors.text, textAlign: "center", ...style}}>
      {label ? <div style={{fontSize: 28, color: colors.muted, fontWeight: 700, marginBottom: 10}}>{label}</div> : null}
      <div
        style={{
          display: "inline-block",
          minWidth: `${Math.max(targetText.length, 1)}ch`,
          fontSize: 154,
          lineHeight: 0.94,
          fontWeight: 800,
          letterSpacing: 0,
          fontVariantNumeric: "tabular-nums",
          color: emphasisLocal >= 0 && emphasisLocal < 0.45 ? colors.accent : colors.text,
          textShadow: `0 0 ${18 + glow * 18}px ${colors.glow}`,
          transform: `scale(${pulse})`,
        }}
      >
        {currentText}
      </div>
      <span
        style={{
          display: "inline-block",
          width: 34,
          height: 5,
          marginLeft: 10,
          background: colors.accent,
          opacity: p >= 1 ? 0.45 + Math.sin(frame / 12) * 0.28 : 0,
          verticalAlign: "18px",
        }}
      />
    </div>
  );
};

const formatNumber = (value: number, decimals: number) => {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
