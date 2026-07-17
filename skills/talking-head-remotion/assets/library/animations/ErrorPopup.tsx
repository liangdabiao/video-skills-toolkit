import type {CSSProperties} from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";

/**
 * ErrorPopup —— 翻车/警告弹窗层。
 *
 * 用法：作为叠加层放在任意场景上方，appearAt/dismissAt 是组件内相对秒数。
 * 弹窗砸入时带 scale + 震动；在场期间警示图标保持低幅度辉光呼吸。
 * SFX 卡点：appearAt 落地帧可配 sfx-deep-impact.mp3 或更轻的变体。
 *
 * 适合：报错、风险、警告、上下文超限等情绪点。
 * 不适合：承载一整屏内容或常驻信息面板。
 */
export type ErrorPopupProps = {
  title?: string;
  detail?: string;
  buttonText?: string;
  appearAt?: number;
  dismissAt?: number;
  shake?: boolean;
  variant?: "error" | "warning";
  width?: number;
  stackOffset?: number;
  fontFamily?: string;
  style?: CSSProperties;
};

const variants = {
  error: {
    accent: "#e63b3b",
    soft: "rgba(230,59,59,0.11)",
    glow: "rgba(230,59,59,0.36)",
  },
  warning: {
    accent: "#f08a24",
    soft: "rgba(240,138,36,0.12)",
    glow: "rgba(240,138,36,0.34)",
  },
};

export const ErrorPopup = ({
  title = "Error: context length exceeded",
  detail = "The current request is too large. Split it into smaller steps.",
  buttonText = "OK",
  appearAt = 0,
  dismissAt,
  shake = true,
  variant = "error",
  width = 480,
  stackOffset = 0,
  fontFamily = '"Noto Sans SC", sans-serif',
  style,
}: ErrorPopupProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const localFrame = Math.max(0, (t - appearAt) * fps);
  const entry = spring({
    fps,
    frame: localFrame,
    config: {damping: 12, stiffness: 190, mass: 0.72},
  });
  const entryP = Math.min(entry, 1.08);
  const dismissP =
    dismissAt === undefined
      ? 1
      : interpolate(t, [dismissAt, dismissAt + 0.25], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const opacity = interpolate(t, [appearAt, appearAt + 0.12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sinceAppear = t - appearAt;
  const shakeX =
    shake && sinceAppear >= 0 && sinceAppear < 0.18
      ? Math.sin(sinceAppear * 125) * 5 * (1 - sinceAppear / 0.18)
      : 0;
  const pressed =
    dismissAt !== undefined && t >= dismissAt && t < dismissAt + 0.09
      ? interpolate(t, [dismissAt, dismissAt + 0.09], [1, 0.88], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  const colors = variants[variant];
  const glow = 0.55 + Math.sin(frame / 20) * 0.24;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "42%",
        width,
        transform: `translate(-50%, -50%) translate(${shakeX + stackOffset}px, ${stackOffset}px) scale(${
          interpolate(entryP, [0, 1], [0.85, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }) * dismissP
        })`,
        opacity: opacity * dismissP,
        transformOrigin: "center center",
        borderRadius: 16,
        background: "#ffffff",
        border: "1px solid rgba(28,38,54,0.14)",
        boxShadow: "0 20px 54px rgba(15,18,24,0.18)",
        overflow: "hidden",
        fontFamily,
        color: "#151922",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 7,
          background: colors.accent,
        }}
      />
      <div style={{padding: "26px 28px 22px 34px", boxSizing: "border-box"}}>
        <div style={{display: "flex", alignItems: "flex-start", gap: 16}}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              background: colors.soft,
              color: colors.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
              boxShadow: `0 0 ${14 + glow * 14}px ${colors.glow}`,
              flexShrink: 0,
            }}
          >
            !
          </div>
          <div style={{minWidth: 0}}>
            <div style={{fontSize: 24, lineHeight: 1.18, fontWeight: 900, marginBottom: 8, overflowWrap: "anywhere"}}>
              {title}
            </div>
            <div style={{fontSize: 18, lineHeight: 1.35, color: "#747982", overflowWrap: "anywhere"}}>{detail}</div>
          </div>
        </div>
        <div style={{display: "flex", justifyContent: "flex-end", marginTop: 24}}>
          <div
            style={{
              minWidth: 82,
              height: 36,
              borderRadius: 8,
              background: "#eef0f3",
              border: "1px solid rgba(28,38,54,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#151922",
              fontSize: 16,
              fontWeight: 700,
              transform: `scale(${pressed})`,
            }}
          >
            {buttonText}
          </div>
        </div>
      </div>
    </div>
  );
};
