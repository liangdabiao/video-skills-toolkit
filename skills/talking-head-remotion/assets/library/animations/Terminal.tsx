import type {CSSProperties} from "react";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

/**
 * Terminal —— 仿真终端执行面板。
 *
 * 用法：包在 <Sequence from={起始帧}> 里，lines 的 appearAt 是组件内相对秒数。
 * cmd 行可逐字符打出，output/success/error 行按 cue 整行出现，最后一行带闪烁光标。
 * SFX 卡点：命令回车帧、error 行出现帧。
 *
 * 适合：安装依赖、命令执行、脚本跑起来、错误输出。
 * 不适合：大段代码讲解；那种场景用 CodeEditor。
 */
export type TerminalLine = {
  text: string;
  appearAt: number;
  kind?: "cmd" | "output" | "success" | "error";
};

export type TerminalTheme = {
  bg: string;
  chrome: string;
  text: string;
  muted: string;
  prompt: string;
  output: string;
  success: string;
  error: string;
};

export type TerminalProps = {
  lines?: TerminalLine[];
  typewriter?: boolean;
  cursorBlink?: boolean;
  typingCharsPerSecond?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  theme?: Partial<TerminalTheme>;
  style?: CSSProperties;
};

const defaultTheme: TerminalTheme = {
  bg: "#1a1d24",
  chrome: "#252a34",
  text: "#f6f7fb",
  muted: "rgba(246,247,251,0.42)",
  prompt: "#8ea2ff",
  output: "rgba(246,247,251,0.78)",
  success: "#6ee7a8",
  error: "#ff6b6b",
};

const lineProgress = (time: number, appearAt: number) => {
  return interpolate(time, [appearAt, appearAt + 0.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
};

export const Terminal = ({
  lines = [],
  typewriter = true,
  cursorBlink = true,
  typingCharsPerSecond = 25,
  width = 860,
  height = 420,
  fontSize = 24,
  lineHeight = 32,
  fontFamily = '"Space Grotesk", monospace',
  theme,
  style,
}: TerminalProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const colors = {...defaultTheme, ...theme};
  const visibleLines = lines.filter((line) => t >= line.appearAt);
  const maxRows = Math.max(1, Math.floor((height - 66) / lineHeight));
  const latestAppearAt = visibleLines.length > 0 ? visibleLines[visibleLines.length - 1].appearAt : 0;
  const latestP = lineProgress(t, latestAppearAt);
  const overflowRows = Math.max(0, visibleLines.length - maxRows);
  const scrollY = -overflowRows * lineHeight + (overflowRows > 0 ? (1 - latestP) * lineHeight : 0);
  const errorLine = findLastErrorLine(visibleLines);
  const errorSince = errorLine ? t - errorLine.appearAt : 999;
  const shake =
    errorSince >= 0 && errorSince < 0.18 ? Math.sin(errorSince * 120) * 4 * (1 - errorSince / 0.18) : 0;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 14,
        background: colors.bg,
        color: colors.text,
        overflow: "hidden",
        fontFamily,
        boxSizing: "border-box",
        transform: `translateX(${shake}px)`,
        ...style,
      }}
    >
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 16px",
          background: colors.chrome,
          boxSizing: "border-box",
        }}
      >
        {["#ff5f57", "#ffbd2e", "#28c840"].map((dot) => (
          <span key={dot} style={{width: 11, height: 11, borderRadius: 999, background: dot, display: "block"}} />
        ))}
      </div>
      <div
        style={{
          height: height - 44,
          padding: "16px 20px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div style={{transform: `translateY(${scrollY}px)`}}>
          {visibleLines.map((line, index) => {
            const kind = line.kind ?? "output";
            const local = Math.max(0, t - line.appearAt);
            const isCmd = kind === "cmd";
            const rawText = isCmd ? line.text.slice(0, Math.floor(local * typingCharsPerSecond)) : line.text;
            const text = typewriter && isCmd ? rawText : line.text;
            const opacity = typewriter && isCmd ? 1 : lineProgress(t, line.appearAt);
            const y = interpolate(opacity, [0, 1], [8, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const isLastLine = index === visibleLines.length - 1;
            const cursorOn = cursorBlink && isLastLine && Math.floor(frame / Math.max(1, Math.round(fps * 0.5))) % 2 === 0;

            return (
              <div
                key={`${line.appearAt}-${index}`}
                style={{
                  height: lineHeight,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize,
                  lineHeight: `${lineHeight}px`,
                  opacity,
                  transform: `translateY(${y}px)`,
                  whiteSpace: "pre",
                }}
              >
                {isCmd ? <span style={{color: colors.prompt}}>$</span> : <span style={{width: 14}} />}
                <span style={{color: lineColor(kind, colors), overflow: "hidden", textOverflow: "clip"}}>
                  {text}
                  {cursorOn ? <span style={{display: "inline-block", width: 10, height: 22, marginLeft: 5, background: colors.text, verticalAlign: "-4px"}} /> : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const lineColor = (kind: TerminalLine["kind"], colors: TerminalTheme) => {
  if (kind === "cmd") {
    return colors.text;
  }
  if (kind === "success") {
    return colors.success;
  }
  if (kind === "error") {
    return colors.error;
  }
  return colors.output;
};

const findLastErrorLine = (lines: TerminalLine[]) => {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].kind === "error") {
      return lines[i];
    }
  }

  return undefined;
};
