import type {CSSProperties} from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";

/**
 * ChatWindow —— 仿真 AI 对话窗。
 *
 * 用法：包在 <Sequence from={起始帧}> 里，messages 的 appearAt 是组件内相对秒数。
 * 每条消息按自己的 cue 弹入；AI 消息出现前显示打字中三点波浪。
 * SFX 卡点：每条气泡的 appearAt 帧适合放轻 pop（如 sfx-hard-pop-click.mp3）。
 *
 * 适合：AI 对话、多轮提示词迭代、对比提问与回答。
 * 不适合：长篇逐字稿、需要真实产品截图证明的步骤。
 */
export type ChatMessage = {
  role: "user" | "ai";
  text: string;
  appearAt: number;
};

export type ChatWindowTheme = {
  bg: string;
  border: string;
  userBubble: string;
  aiBubble: string;
  aiBorder: string;
  text: string;
  muted: string;
  accent: string;
};

export type ChatWindowProps = {
  messages?: ChatMessage[];
  typingDuration?: number;
  width?: number;
  height?: number;
  title?: string;
  maxVisibleMessages?: number;
  fontFamily?: string;
  theme?: Partial<ChatWindowTheme>;
  style?: CSSProperties;
};

const defaultTheme: ChatWindowTheme = {
  bg: "#ffffff",
  border: "rgba(28,38,54,0.14)",
  userBubble: "#eef0f3",
  aiBubble: "#f4f7ff",
  aiBorder: "rgba(47,111,255,0.18)",
  text: "#151922",
  muted: "#747982",
  accent: "#2f6fff",
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const bubbleProgress = (time: number, start: number, duration: number) => {
  return interpolate(time, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
};

export const ChatWindow = ({
  messages = [],
  typingDuration = 0.8,
  width = 760,
  height = 520,
  title = "AI Assistant",
  maxVisibleMessages = 5,
  fontFamily = '"Noto Sans SC", sans-serif',
  theme,
  style,
}: ChatWindowProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const colors = {...defaultTheme, ...theme};
  const sortedMessages = [...messages].sort((a, b) => a.appearAt - b.appearAt);
  const visibleMessages = sortedMessages.filter((message) => t >= message.appearAt);
  const typingMessage = sortedMessages.find((message) => {
    return message.role === "ai" && t >= message.appearAt - typingDuration && t < message.appearAt;
  });
  const rows = [
    ...visibleMessages.map((message) => ({kind: "message" as const, message})),
    ...(typingMessage ? [{kind: "typing" as const, message: typingMessage}] : []),
  ];
  const clippedRows = rows.slice(Math.max(0, rows.length - maxVisibleMessages));
  const latestAppearAt = rows.length > 0 ? rows[rows.length - 1].message.appearAt : 0;
  const scrollEase = bubbleProgress(t, latestAppearAt, 0.35);
  const scrollLift = rows.length > maxVisibleMessages ? (1 - scrollEase) * 18 : 0;

  return (
    <div
      style={{
        width,
        height,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        background: colors.bg,
        overflow: "hidden",
        fontFamily,
        color: colors.text,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 18px",
          borderBottom: `1px solid ${colors.border}`,
          boxSizing: "border-box",
        }}
      >
        <div style={{display: "flex", gap: 7}}>
          {["#ff5f57", "#ffbd2e", "#28c840"].map((dot) => (
            <span
              key={dot}
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: dot,
                display: "block",
              }}
            />
          ))}
        </div>
        <div style={{fontSize: 18, fontWeight: 700, letterSpacing: 0, color: colors.text}}>{title}</div>
      </div>
      <div
        style={{
          height: height - 48,
          padding: 22,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            transform: `translateY(${scrollLift}px)`,
          }}
        >
          {clippedRows.map((row, index) => {
            if (row.kind === "typing") {
              return (
                <div key={`typing-${row.message.appearAt}-${index}`} style={{display: "flex", justifyContent: "flex-start"}}>
                  <TypingBubble frame={frame} colors={colors} />
                </div>
              );
            }

            const {message} = row;
            const localFrame = Math.max(0, (t - message.appearAt) * fps);
            const pop = spring({
              fps,
              frame: localFrame,
              config: {damping: 18, stiffness: 170, mass: 0.75},
            });
            const p = clamp(pop, 0, 1.08);
            const opacity = bubbleProgress(t, message.appearAt, 0.22);
            const y = interpolate(p, [0, 1], [16, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const isUser = message.role === "user";

            return (
              <div
                key={`${message.role}-${message.appearAt}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  opacity,
                  transform: `translateY(${y}px) scale(${interpolate(p, [0, 1], [0.96, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })})`,
                  transformOrigin: isUser ? "right center" : "left center",
                }}
              >
                <div
                  style={{
                    maxWidth: "74%",
                    padding: "13px 16px",
                    borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isUser ? colors.userBubble : colors.aiBubble,
                    border: isUser ? "none" : `1px solid ${colors.aiBorder}`,
                    fontSize: 24,
                    lineHeight: 1.38,
                    fontWeight: 500,
                    overflowWrap: "anywhere",
                    boxSizing: "border-box",
                  }}
                >
                  {message.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TypingBubble = ({frame, colors}: {frame: number; colors: ChatWindowTheme}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        minWidth: 74,
        padding: "14px 16px",
        borderRadius: "18px 18px 18px 4px",
        background: colors.aiBubble,
        border: `1px solid ${colors.aiBorder}`,
        boxSizing: "border-box",
      }}
    >
      {[0, 1, 2].map((i) => {
        const lift = Math.sin(frame / 5 + i * 1.35) * 4;
        const opacity = 0.48 + Math.sin(frame / 5 + i * 1.35) * 0.24;
        return (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: colors.accent,
              opacity,
              transform: `translateY(${lift}px)`,
              display: "block",
            }}
          />
        );
      })}
    </div>
  );
};
