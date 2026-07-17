/**
 * ArticleImage —— 公众号/文章原文图完整展示组件
 *
 * 核心铁律：
 *   1. object-fit: contain —— 永不 cover，否则截图里的文字会变不可读
 *   2. imageAspect 决定 max-width 还是 max-height 优先（横图按宽，长图按高）
 *   3. 图源标签持续呼吸（6s 周期），不抢字幕注意力
 *
 * 适用场景：
 *   - 公众号文章截图、表格、流程图、信息图
 *   - 任何带文字的图，必须完整显示
 *
 * 不适用：
 *   - 装饰性背景图（用 cover 即可）
 *   - 高分辨率摄影图（用 cover + object-fit: cover）
 *
 * 用法：
 *   <ArticleImage
 *     src="assets/article-images/img-03.jpg"
 *     imageAspect={1.5}
 *     eyebrow="性能对比"
 *     title={[{text: "X 模型"}, {text: "实测", tone: "accent"}]}
 *     caption="object-fit: contain，永不裁切"
 *     source="图源：公众号 / 性能对比章节"
 *     appearAt={0.16}
 *     titleAppearAt={0.24}
 *     captionAppearAt={0.5}
 *   />
 */
import {Img, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import type {CSSProperties, ReactNode} from "react";

const enter = (frame: number, fps: number, delay: number, dur: number) => {
  const t = Math.max(0, Math.min(1, (frame - delay * fps) / (dur * fps)));
  return {opacity: t, transform: `translateY(${(1 - t) * 24}px)`};
};

export const ArticleImage = ({
  src,
  imageAspect,
  eyebrow,
  title,
  caption,
  source,
  appearAt = 0.16,
  titleAppearAt = 0.24,
  captionAppearAt = 0.5,
  accentColor = "#2f6fff",
  inkColor = "#151922",
  mutedColor = "#747982",
  fontMono = '"Space Grotesk", monospace',
  fontSans = '"Noto Sans SC", "PingFang SC", sans-serif',
}: {
  src: string;
  imageAspect: number;
  eyebrow: string;
  title: ReactNode;
  caption?: string;
  source?: string;
  appearAt?: number;
  titleAppearAt?: number;
  captionAppearAt?: number;
  accentColor?: string;
  inkColor?: string;
  mutedColor?: string;
  fontMono?: string;
  fontSans?: string;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isWide = imageAspect >= 1.78;
  // maxHeight 用 calc(100% - 16px) 避免在紧凑布局里溢出 frame
  const sizeStyle: CSSProperties = isWide
    ? {maxWidth: "88%", maxHeight: "calc(100% - 16px)", width: "auto", height: "auto"}
    : {maxHeight: "calc(100% - 16px)", maxWidth: "88%", width: "auto", height: "auto"};
  const sourceGlow = 0.6 + Math.sin((frame / fps) * (Math.PI / 3)) * 0.4;

  return (
    <div style={layoutStyle}>
      <div style={headerStyle}>
        <div style={{...eyebrowStyle(accentColor, fontMono), ...enter(frame, fps, appearAt, 0.34)}}>
          <span style={eyebrowRuleStyle(accentColor)} />
          <span>{eyebrow}</span>
        </div>
        <h2
          style={{
            ...titleStyle(inkColor, fontSans),
            ...enter(frame, fps, titleAppearAt, 0.5),
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{...frameStyle, ...enter(frame, fps, appearAt, 0.6)}}>
        <Img
          src={typeof src === "string" && src.startsWith("http") ? src : staticFile(src)}
          style={{...imgStyle, ...sizeStyle}}
        />
        {source ? (
          <div style={{...sourceBadgeStyle(fontMono), opacity: sourceGlow}}>{source}</div>
        ) : null}
      </div>
      {caption ? (
        <div
          style={{
            ...captionStyle(mutedColor, fontSans),
            ...enter(frame, fps, captionAppearAt, 0.4),
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
};

const layoutStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  textAlign: "center",
};

const headerStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: 18,
};

const eyebrowStyle = (accent: string, font: string): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
  color: accent,
  fontFamily: font,
  fontSize: 22,
  fontWeight: 600,
  textTransform: "uppercase",
});

const eyebrowRuleStyle = (accent: string): CSSProperties => ({
  width: 52,
  height: 2,
  backgroundColor: accent,
});

const titleStyle = (ink: string, font: string): CSSProperties => ({
  maxWidth: 1500,
  margin: 0,
  color: ink,
  fontFamily: font,
  fontSize: 64,
  fontWeight: 800,
  lineHeight: 1.2,
});

const frameStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 0,
  overflow: "hidden",
};

const imgStyle: CSSProperties = {
  objectFit: "contain",
  borderRadius: 12,
  boxShadow: "0 30px 90px rgba(28,38,54,0.18), 0 4px 16px rgba(28,38,54,0.08)",
  backgroundColor: "#ffffff",
  display: "block",
};

const sourceBadgeStyle = (font: string): CSSProperties => ({
  position: "absolute",
  right: 12,
  bottom: 12,
  padding: "6px 14px",
  borderRadius: 100,
  backgroundColor: "rgba(28,38,54,0.78)",
  color: "#ffffff",
  fontFamily: font,
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: 0.4,
});

const captionStyle = (muted: string, font: string): CSSProperties => ({
  marginTop: 20,
  color: muted,
  fontFamily: font,
  fontSize: 26,
  fontWeight: 400,
  maxWidth: 1200,
});
