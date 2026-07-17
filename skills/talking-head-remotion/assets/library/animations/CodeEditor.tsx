import type {CSSProperties} from "react";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

/**
 * CodeEditor —— 仿真代码/提示词编辑器。
 *
 * 用法：包在 <Sequence from={起始帧}> 里，highlights 的 appearAt 是组件内相对秒数。
 * 代码作为静物打开，重点行按 cue 从左到右扫入高亮，当前高亮左侧有呼吸竖条。
 * SFX 卡点：每次高亮扫入帧适合放轻 sweep。
 *
 * 适合：讲代码、提示词、配置片段中的关键行。
 * 不适合：命令执行过程；那种场景用 Terminal。
 */
export type CodeHighlight = {
  fromLine: number;
  toLine: number;
  appearAt: number;
  color?: string;
};

export type CodeToken = {
  line: number;
  match: string;
  color: string;
};

export type CodeEditorProps = {
  lines?: string[];
  highlights?: CodeHighlight[];
  tokens?: CodeToken[];
  fileName?: string;
  appearAt?: number;
  width?: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  theme?: {
    bg?: string;
    border?: string;
    chrome?: string;
    text?: string;
    muted?: string;
    accent?: string;
  };
  style?: CSSProperties;
};

const defaultTheme = {
  bg: "#ffffff",
  border: "rgba(28,38,54,0.14)",
  chrome: "#f0f2ee",
  text: "#151922",
  muted: "#b6bbb5",
  accent: "#2f6fff",
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export const CodeEditor = ({
  lines = [],
  highlights = [],
  tokens = [],
  fileName = "prompt.ts",
  appearAt = 0,
  width = 900,
  fontSize = 22,
  lineHeight = 32,
  fontFamily = '"Space Grotesk", monospace',
  theme,
  style,
}: CodeEditorProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const colors = {...defaultTheme, ...theme};
  const panelP = interpolate(t, [appearAt, appearAt + 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const panelY = interpolate(panelP, [0, 1], [22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const latestHighlight = latestHighlightAt(highlights, t);

  return (
    <div
      style={{
        width,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        background: colors.bg,
        overflow: "hidden",
        boxSizing: "border-box",
        opacity: panelP,
        transform: `translateY(${panelY}px)`,
        ...style,
      }}
    >
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          gap: 12,
          background: colors.chrome,
          borderBottom: `1px solid ${colors.border}`,
          boxSizing: "border-box",
          fontFamily,
          fontSize: 18,
          color: colors.text,
          fontWeight: 700,
        }}
      >
        <span style={{width: 10, height: 10, borderRadius: 999, background: colors.accent, display: "block"}} />
        {fileName}
      </div>
      <div style={{padding: "18px 0", fontFamily, fontSize, lineHeight: `${lineHeight}px`, color: colors.text}}>
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const lineAppear = appearAt + 0.08 + index * (1.5 / fps);
          const lineP = interpolate(t, [lineAppear, lineAppear + 0.18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const retainedHighlight = latestHighlightForLine(highlights, lineNumber, t);
          const activeHighlight =
            latestHighlight && latestHighlight.fromLine <= lineNumber && latestHighlight.toLine >= lineNumber
              ? latestHighlight
              : undefined;
          const activeColor = activeHighlight?.color ?? retainedHighlight?.color ?? colors.accent;
          const highlightLocal = activeHighlight ? t - activeHighlight.appearAt : 999;
          const sweep = activeHighlight
            ? interpolate(highlightLocal, [0, 0.3], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })
            : 0;
          const barPulse = activeHighlight ? 0.65 + Math.sin(frame / 14) * 0.22 : 0;

          return (
            <div
              key={lineNumber}
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "74px 1fr",
                minHeight: lineHeight,
                opacity: lineP,
                transform: `translateY(${interpolate(lineP, [0, 1], [8, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}px)`,
              }}
            >
              {retainedHighlight ? (
                <div
                  style={{
                    position: "absolute",
                    left: 74,
                    right: 18,
                    top: 3,
                    bottom: 3,
                    borderRadius: 6,
                    background: activeColor,
                    opacity: activeHighlight ? 0.11 : 0.045,
                  }}
                />
              ) : null}
              {activeHighlight ? (
                <div
                  style={{
                    position: "absolute",
                    left: 74,
                    top: 3,
                    bottom: 3,
                    width: `${clamp(sweep, 0, 1) * 100}%`,
                    maxWidth: `calc(100% - 92px)`,
                    borderRadius: 6,
                    background: activeColor,
                    opacity: 0.16,
                  }}
                />
              ) : null}
              {activeHighlight ? (
                <div
                  style={{
                    position: "absolute",
                    left: 62,
                    top: 5,
                    bottom: 5,
                    width: 3,
                    borderRadius: 999,
                    background: activeColor,
                    boxShadow: `0 0 ${8 + barPulse * 8}px ${activeColor}`,
                    opacity: barPulse,
                  }}
                />
              ) : null}
              <div style={{color: colors.muted, textAlign: "right", paddingRight: 18, boxSizing: "border-box"}}>
                {lineNumber}
              </div>
              <div style={{position: "relative", whiteSpace: "pre", overflow: "hidden", paddingRight: 18}}>
                {renderTokenizedLine(line, tokens.filter((token) => token.line === lineNumber), colors.text)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const latestHighlightForLine = (highlights: CodeHighlight[], lineNumber: number, time: number) => {
  return highlights
    .filter((highlight) => {
      return highlight.fromLine <= lineNumber && highlight.toLine >= lineNumber && highlight.appearAt <= time;
    })
    .sort((a, b) => b.appearAt - a.appearAt)[0];
};

const latestHighlightAt = (highlights: CodeHighlight[], time: number) => {
  return highlights.filter((highlight) => highlight.appearAt <= time).sort((a, b) => b.appearAt - a.appearAt)[0];
};

const renderTokenizedLine = (line: string, tokens: CodeToken[], defaultColor: string) => {
  const parts: Array<{text: string; color: string}> = [];
  let cursor = 0;

  while (cursor < line.length) {
    let nextToken: CodeToken | undefined;
    let nextIndex = Number.POSITIVE_INFINITY;

    for (const token of tokens) {
      const found = line.indexOf(token.match, cursor);
      if (found !== -1 && found < nextIndex) {
        nextIndex = found;
        nextToken = token;
      }
    }

    if (!nextToken || nextIndex === Number.POSITIVE_INFINITY) {
      parts.push({text: line.slice(cursor), color: defaultColor});
      break;
    }

    if (nextIndex > cursor) {
      parts.push({text: line.slice(cursor, nextIndex), color: defaultColor});
    }

    parts.push({text: nextToken.match, color: nextToken.color});
    cursor = nextIndex + nextToken.match.length;
  }

  if (line.length === 0) {
    parts.push({text: " ", color: defaultColor});
  }

  return parts.map((part, index) => (
    <span key={`${part.text}-${index}`} style={{color: part.color}}>
      {part.text}
    </span>
  ));
};
