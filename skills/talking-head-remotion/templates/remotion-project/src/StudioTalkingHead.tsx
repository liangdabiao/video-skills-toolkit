import type {CSSProperties, ReactNode} from "react";
import {Audio, Video} from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {colors, fonts, layout} from "./theme";

type Tone = "accent" | "white" | "muted";

export type RichTextPart = {
  text: string;
  tone?: Tone;
};

export type Chapter = {
  label: string;
  start: number;
};

export type Caption = {
  start: number;
  end: number;
  parts: RichTextPart[];
};

export type SfxCue = {
  id: string;
  start: number;
  duration: number;
  file: string;
  volume: number;
};

type CoverScene = {
  kind: "cover";
  start: number;
  eyebrow: string;
  titleLines: RichTextPart[][];
  subtitle: string;
};

type ListScene = {
  kind: "list";
  start: number;
  eyebrow: string;
  heading: string;
  items: Array<{
    index: string;
    label: string;
    value: string;
    tone?: Tone;
    /** 进场时刻（场景内相对秒数），来自口播说到该行内容的字幕起点 */
    appearAt?: number;
  }>;
};

type StatScene = {
  kind: "stat";
  start: number;
  eyebrow: string;
  number: string;
  unit: string;
  title: RichTextPart[];
  metrics: Array<{
    label: string;
    value: string;
    tone?: Tone;
    /** 进场时刻（场景内相对秒数），来自口播说到该指标的字幕起点 */
    appearAt?: number;
  }>;
};

type CompareScene = {
  kind: "compare";
  start: number;
  eyebrow: string;
  heading: string;
  choices: Array<{
    code: string;
    title: string;
    subtitle: string;
    tone?: Tone;
    /** 进场时刻（场景内相对秒数），来自口播说到该选项的字幕起点 */
    appearAt?: number;
  }>;
};

type OutroScene = {
  kind: "outro";
  start: number;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type StudioScene = CoverScene | ListScene | StatScene | CompareScene | OutroScene;

export type StudioTalkingHeadProps = {
  title: string;
  fps: number;
  durationSeconds: number;
  voiceAudio?: string;
  talkingHeadVideo?: string;
  chapters: Chapter[];
  scenes: StudioScene[];
  captions: Caption[];
  sfxCues?: SfxCue[];
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const frameFromSeconds = (seconds: number, fps: number) => Math.round(seconds * fps);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const progress = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const enterStyle = (
  frame: number,
  fps: number,
  delaySeconds: number,
  durationSeconds: number,
  y: number,
): CSSProperties => {
  const p = progress(frame, delaySeconds * fps, durationSeconds * fps);
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * y}px)`,
  };
};

const toneColor = (tone?: Tone) => {
  if (tone === "accent") {
    return colors.accent;
  }
  // 画布是浅色的，"white" 强调渲染为黑色加粗才可读
  if (tone === "white") {
    return colors.ink;
  }
  if (tone === "muted") {
    return colors.muted;
  }
  return colors.ink;
};

const RichText = ({
  parts,
  strong = false,
  preserveLineBreaks = false,
  defaultColor = colors.ink,
}: {
  parts: RichTextPart[];
  strong?: boolean;
  preserveLineBreaks?: boolean;
  defaultColor?: string;
}) => (
  <>
    {parts.map((part, index) => (
      <span
        key={`${part.text}-${index}`}
        style={{
          color: part.tone ? toneColor(part.tone) : defaultColor,
          fontWeight: part.tone || strong ? 700 : undefined,
          whiteSpace: preserveLineBreaks ? "pre-line" : undefined,
        }}
      >
        {part.text}
      </span>
    ))}
  </>
);

export const StudioTalkingHead = ({
  durationSeconds,
  voiceAudio,
  talkingHeadVideo,
  chapters,
  scenes,
  captions,
  sfxCues = [],
}: StudioTalkingHeadProps) => {
  const {fps} = useVideoConfig();
  const transitionFrames = Math.round(0.42 * fps);

  return (
    <AbsoluteFill style={stageStyle}>
      <PremiumGridBackground />
      {voiceAudio ? <Audio src={staticFile(voiceAudio)} volume={1} /> : null}
      {sfxCues.map((cue) => (
        <Sequence
          key={cue.id}
          from={frameFromSeconds(cue.start, fps)}
          durationInFrames={Math.max(1, frameFromSeconds(cue.duration, fps))}
          premountFor={fps}
        >
          <Audio src={staticFile(cue.file)} volume={cue.volume} />
        </Sequence>
      ))}
      {scenes.map((scene, index) => {
        const nextStart = scenes[index + 1]?.start ?? durationSeconds;
        const sceneStart = frameFromSeconds(scene.start, fps);
        const baseDuration = frameFromSeconds(nextStart - scene.start, fps);
        const isLast = index === scenes.length - 1;
        const durationInFrames = Math.max(1, baseDuration + (isLast ? 0 : transitionFrames));
        return (
          <Sequence
            key={`${scene.kind}-${scene.start}`}
            from={sceneStart}
            durationInFrames={durationInFrames}
            premountFor={fps}
          >
            <SceneRenderer scene={scene} durationInFrames={durationInFrames} isLast={isLast} />
          </Sequence>
        );
      })}
      <PipFrame talkingHeadVideo={talkingHeadVideo} />
      <CaptionLayer captions={captions} />
      <TopBar chapters={chapters} durationSeconds={durationSeconds} />
    </AbsoluteFill>
  );
};

const PremiumGridBackground = () => {
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
  const canvasHeight = 1080;
  const nearY = -78;
  const farY = 342;
  const planeHeight = farY - nearY;
  const rowStep = 62;
  const rowDrift = (seconds * 34) % rowStep;
  const rows = Array.from({length: 8}, (_, index) => nearY + ((index * rowStep + rowDrift) % planeHeight));
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

const SceneRenderer = ({
  scene,
  durationInFrames,
  isLast,
}: {
  scene: StudioScene;
  durationInFrames: number;
  isLast: boolean;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = progress(frame, 0, 0.42 * fps);
  const exit = isLast ? 0 : progress(frame, durationInFrames - 0.42 * fps, 0.42 * fps);
  const opacity = clamp(enter - exit, 0, 1);

  return (
    <AbsoluteFill style={{...sceneShellStyle, opacity}}>
      {scene.kind === "cover" ? <CoverSceneView scene={scene} /> : null}
      {scene.kind === "list" ? <ListSceneView scene={scene} /> : null}
      {scene.kind === "stat" ? <StatSceneView scene={scene} /> : null}
      {scene.kind === "compare" ? <CompareSceneView scene={scene} /> : null}
      {scene.kind === "outro" ? <OutroSceneView scene={scene} /> : null}
    </AbsoluteFill>
  );
};

const Eyebrow = ({children, style}: {children: ReactNode; style?: CSSProperties}) => (
  <div style={{...eyebrowStyle, ...style}}>
    <span style={eyebrowRuleStyle} />
    <span>{children}</span>
  </div>
);

const CoverSceneView = ({scene}: {scene: CoverScene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div style={{...sceneContentStyle, justifyContent: "center"}}>
      <Eyebrow style={enterStyle(frame, fps, 0.14, 0.42, 18)}>{scene.eyebrow}</Eyebrow>
      <h1 style={{...coverTitleStyle, ...enterStyle(frame, fps, 0.25, 0.56, 42)}}>
        {scene.titleLines.map((line, index) => (
          <span key={index} style={{display: "block"}}>
            <RichText parts={line} strong />
          </span>
        ))}
      </h1>
      <div style={{...subtitleStyle, ...enterStyle(frame, fps, 0.52, 0.44, 24)}}>{scene.subtitle}</div>
    </div>
  );
};

const ListSceneView = ({scene}: {scene: ListScene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div style={{...sceneContentStyle, ...splitLayoutStyle}}>
      <div style={sectionTitleRailStyle}>
        <span style={{...smallRuleStyle, ...scaleXStyle(frame, fps, 0.1, 0.28)}} />
        <div style={{...sectionLabelStyle, ...enterStyle(frame, fps, 0.16, 0.34, 16)}}>{scene.eyebrow}</div>
        <div style={{...sectionHeadingStyle, ...enterStyle(frame, fps, 0.24, 0.44, 28)}}>{scene.heading}</div>
      </div>
      <div style={rowsStyle}>
        {scene.items.map((item, index) => (
          <div key={item.index} style={{...rowStyle, ...enterStyle(frame, fps, item.appearAt ?? 0.28 + index * 0.1, 0.38, 24)}}>
            <span style={rowIndexStyle}>{item.index}</span>
            <span style={rowLabelStyle}>{item.label}</span>
            <span style={{...rowValueStyle, color: toneColor(item.tone)}}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatSceneView = ({scene}: {scene: StatScene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div style={{...sceneContentStyle, ...statLayoutStyle}}>
      <div style={bigStatStyle}>
        <div style={{...sectionLabelStyle, ...enterStyle(frame, fps, 0.08, 0.34, 0)}}>{scene.eyebrow}</div>
        <div style={{...statNumberWrapStyle, ...enterStyle(frame, fps, 0.16, 0.48, 34)}}>
          <span style={statNumberStyle}>{scene.number}</span>
          <span style={statUnitStyle}>{scene.unit}</span>
        </div>
        <span style={{...statRuleStyle, ...scaleXStyle(frame, fps, 0.48, 0.32)}} />
      </div>
      <div style={{...statDetailStyle, ...enterStyle(frame, fps, 0.28, 0.48, 0)}}>
        <div style={detailTitleStyle}>
          <RichText parts={scene.title} strong preserveLineBreaks />
        </div>
        <div style={miniStatsStyle}>
          {scene.metrics.map((metric, index) => (
            <div key={metric.label} style={{...miniRowStyle, ...enterStyle(frame, fps, metric.appearAt ?? 0.52 + index * 0.08, 0.28, 18)}}>
              <span>{metric.label}</span>
              <span style={{color: toneColor(metric.tone), fontFamily: fonts.mono}}>{metric.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CompareSceneView = ({scene}: {scene: CompareScene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div style={{...sceneContentStyle, justifyContent: "flex-start"}}>
      <span style={{...smallRuleStyle, ...scaleXStyle(frame, fps, 0.1, 0.28)}} />
      <div style={{...sectionLabelStyle, ...enterStyle(frame, fps, 0.16, 0.34, 16)}}>{scene.eyebrow}</div>
      <div style={{...sectionHeadingStyle, fontSize: 88, ...enterStyle(frame, fps, 0.24, 0.44, 28)}}>{scene.heading}</div>
      <div style={compareGridStyle}>
        {scene.choices.map((choice, index) => (
          <div key={choice.code} style={{...choiceStyle(index), ...enterStyle(frame, fps, choice.appearAt ?? 0.38 + index * 0.12, 0.44, 28)}}>
            <span style={{...choiceCodeStyle, color: toneColor(choice.tone)}}>{choice.code}</span>
            <div style={choiceTitleStyle}>{choice.title}</div>
            <div style={choiceSubtitleStyle}>{choice.subtitle}</div>
          </div>
        ))}
        <div style={{...dividerStyle, ...scaleYStyle(frame, fps, 0.34, 0.36)}} />
      </div>
    </div>
  );
};

const OutroSceneView = ({scene}: {scene: OutroScene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div style={{...sceneContentStyle, alignItems: "center", justifyContent: "center", textAlign: "center"}}>
      <span style={{...outroRuleStyle, ...scaleXStyle(frame, fps, 0.08, 0.3)}} />
      <div style={{...sectionLabelStyle, ...enterStyle(frame, fps, 0.16, 0.34, 16)}}>{scene.eyebrow}</div>
      <div style={{...outroTitleStyle, ...enterStyle(frame, fps, 0.24, 0.5, 34)}}>{scene.title}</div>
      <div style={{...outroSubtitleStyle, ...enterStyle(frame, fps, 0.48, 0.4, 22)}}>{scene.subtitle}</div>
    </div>
  );
};

const CaptionLayer = ({captions}: {captions: Caption[]}) => {
  return (
    <AbsoluteFill style={captionLayerStyle}>
      {captions.map((caption, index) => (
        <CaptionPill key={`${caption.start}-${index}`} caption={caption} />
      ))}
    </AbsoluteFill>
  );
};

const CaptionPill = ({caption}: {caption: Caption}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = frameFromSeconds(caption.start, fps);
  const end = frameFromSeconds(caption.end, fps);

  if (frame < start - 1 || frame > end) {
    return null;
  }

  const enter = progress(frame, start, 0.16 * fps);
  const exit = progress(frame, Math.max(start, end - 0.12 * fps), 0.12 * fps);
  const visible = clamp(enter - exit, 0, 1);

  return (
    <div
      style={{
        ...captionStyle,
        opacity: visible,
        transform: `translate(-50%, ${(1 - visible) * 18}px) scale(${0.98 + visible * 0.02})`,
      }}
    >
      <RichText parts={caption.parts} defaultColor={colors.ink} />
    </div>
  );
};

const PipFrame = ({talkingHeadVideo}: {talkingHeadVideo?: string}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = progress(frame, 0.7 * fps, 0.45 * fps);

  return (
    <div
      style={{
        ...pipFrameStyle,
        opacity: p,
        transform: `translateX(${(1 - p) * 18}px) scale(${0.9 + p * 0.1})`,
      }}
    >
      <div style={pipRingStyle} />
      <div style={pipInnerStyle}>
        <div style={pipMaskStyle}>
          {talkingHeadVideo ? (
            <Video
              src={staticFile(talkingHeadVideo)}
              muted
              style={{
                width: 366,
                height: 206,
                transform: "translateX(-80px)",
                objectFit: "cover",
              }}
            />
          ) : (
            <AvatarPlaceholder />
          )}
        </div>
      </div>
    </div>
  );
};

const AvatarPlaceholder = () => (
  <div style={avatarWrapStyle}>
    <div style={avatarHeadStyle} />
    <div style={avatarBodyStyle} />
  </div>
);

const TopBar = ({chapters, durationSeconds}: {chapters: Chapter[]; durationSeconds: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const progressWidth = interpolate(time, [0, durationSeconds], [16, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={topbarStyle}>
      <div style={{...navFillStyle, width: `${progressWidth}%`}} />
      <div style={chapterRowStyle}>
        {chapters.map((chapter, index) => {
          const reached = time >= chapter.start;
          return (
            <span key={chapter.label} style={chapterGroupStyle}>
              <span style={{...chapterLabelStyle, color: reached ? colors.ink : colors.topbarMuted, fontWeight: reached ? 600 : 500}}>
                {chapter.label}
              </span>
              {index < chapters.length - 1 ? <span style={chapterSepStyle}>|</span> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const scaleXStyle = (frame: number, fps: number, delaySeconds: number, durationSeconds: number): CSSProperties => ({
  transform: `scaleX(${progress(frame, delaySeconds * fps, durationSeconds * fps)})`,
  transformOrigin: "left center",
});

const scaleYStyle = (frame: number, fps: number, delaySeconds: number, durationSeconds: number): CSSProperties => ({
  transform: `scaleY(${progress(frame, delaySeconds * fps, durationSeconds * fps)})`,
  transformOrigin: "center center",
});

const stageStyle: CSSProperties = {
  backgroundColor: colors.canvas,
  color: colors.ink,
  fontFamily: fonts.sans,
  overflow: "hidden",
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

const gridImage = [
  `linear-gradient(${colors.gridLine} 2px, transparent 2px)`,
  `linear-gradient(90deg, ${colors.gridLine} 2px, transparent 2px)`,
  `linear-gradient(${colors.gridLineStrong} 1px, transparent 1px)`,
  `linear-gradient(90deg, ${colors.gridWarm} 1px, transparent 1px)`,
].join(", ");

const gridPlaneStyle: CSSProperties = {
  position: "absolute",
  left: -420,
  width: 2760,
  height: 760,
  backgroundImage: gridImage,
  backgroundSize: "128px 128px, 128px 128px, 32px 32px, 32px 32px",
  borderRadius: 18,
  filter: "drop-shadow(0 16px 28px rgba(47,111,255,0.08))",
};

const topGridPlaneStyle: CSSProperties = {
  top: -330,
  transform: "perspective(780px) rotateX(-62deg) scaleX(1.08)",
  transformOrigin: "center top",
  WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.74) 48%, transparent 92%)",
  maskImage: "linear-gradient(180deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.74) 48%, transparent 92%)",
};

const bottomGridPlaneStyle: CSSProperties = {
  bottom: -360,
  transform: "perspective(820px) rotateX(62deg) scaleX(1.08)",
  transformOrigin: "center bottom",
  WebkitMaskImage: "linear-gradient(0deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.72) 52%, transparent 94%)",
  maskImage: "linear-gradient(0deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.72) 52%, transparent 94%)",
};

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

const sceneShellStyle: CSSProperties = {
  padding: `${layout.safeTop}px ${layout.safeX}px ${layout.safeBottom}px`,
};

const sceneContentStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

const eyebrowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 20,
  marginBottom: 40,
  color: colors.accent,
  fontFamily: fonts.mono,
  fontSize: 24,
  fontWeight: 600,
  letterSpacing: 0,
  textTransform: "uppercase",
};

const eyebrowRuleStyle: CSSProperties = {
  width: 52,
  height: 2,
  backgroundColor: colors.accent,
  flex: "none",
};

const coverTitleStyle: CSSProperties = {
  maxWidth: 1400,
  margin: 0,
  color: colors.ink,
  fontSize: 112,
  fontWeight: 800,
  lineHeight: 1.14,
  letterSpacing: 0,
};

const subtitleStyle: CSSProperties = {
  marginTop: 46,
  color: colors.muted,
  fontSize: 38,
  fontWeight: 300,
  letterSpacing: 0,
};

const splitLayoutStyle: CSSProperties = {
  flexDirection: "row",
  alignItems: "center",
  gap: 100,
};

const sectionTitleRailStyle: CSSProperties = {
  width: 420,
  flex: "none",
};

const smallRuleStyle: CSSProperties = {
  width: 48,
  height: 2,
  backgroundColor: colors.accent,
  display: "block",
  marginBottom: 30,
};

const sectionLabelStyle: CSSProperties = {
  color: colors.accent,
  fontFamily: fonts.mono,
  fontSize: 24,
  fontWeight: 600,
  letterSpacing: 0,
  textTransform: "uppercase",
  marginBottom: 20,
};

const sectionHeadingStyle: CSSProperties = {
  color: colors.ink,
  fontSize: 96,
  fontWeight: 800,
  lineHeight: 1.08,
  letterSpacing: 0,
};

const rowsStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 46,
  padding: "42px 0",
  borderTop: `1px solid ${colors.line}`,
};

const rowIndexStyle: CSSProperties = {
  width: 74,
  flex: "none",
  color: colors.weak,
  fontFamily: fonts.mono,
  fontSize: 40,
  fontWeight: 500,
};

const rowLabelStyle: CSSProperties = {
  width: 150,
  flex: "none",
  color: colors.muted,
  fontSize: 27,
  fontWeight: 400,
  letterSpacing: 0,
};

const rowValueStyle: CSSProperties = {
  color: colors.ink,
  fontSize: 56,
  fontWeight: 600,
  lineHeight: 1.2,
};

const statLayoutStyle: CSSProperties = {
  flexDirection: "row",
  alignItems: "center",
  gap: 110,
};

const bigStatStyle: CSSProperties = {
  flex: "none",
};

const statNumberWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
};

const statNumberStyle: CSSProperties = {
  color: colors.ink,
  fontFamily: fonts.mono,
  fontSize: 420,
  fontWeight: 700,
  lineHeight: 0.82,
  letterSpacing: 0,
};

const statUnitStyle: CSSProperties = {
  marginTop: 54,
  color: colors.muted,
  fontFamily: fonts.mono,
  fontSize: 72,
  fontWeight: 500,
};

const statRuleStyle: CSSProperties = {
  display: "block",
  width: 380,
  height: 3,
  marginTop: 6,
  backgroundColor: colors.accent,
};

const statDetailStyle: CSSProperties = {
  flex: 1,
  borderLeft: `1px solid ${colors.line}`,
  padding: "18px 0 18px 88px",
};

const detailTitleStyle: CSSProperties = {
  color: colors.ink,
  fontSize: 54,
  fontWeight: 700,
  lineHeight: 1.28,
};

const miniStatsStyle: CSSProperties = {
  maxWidth: 540,
  marginTop: 48,
};

const miniRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "24px 0",
  borderTop: `1px solid ${colors.line}`,
  color: colors.muted,
  fontSize: 32,
};

const compareGridStyle: CSSProperties = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "1fr 1px 1fr",
  alignItems: "stretch",
  marginTop: 60,
};

const choiceStyle = (index: number): CSSProperties => ({
  gridColumn: index === 0 ? 1 : 3,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: index === 0 ? "12px 90px 12px 0" : "12px 0 12px 90px",
});

const choiceCodeStyle: CSSProperties = {
  color: colors.weak,
  fontFamily: fonts.mono,
  fontSize: 40,
  fontWeight: 600,
};

const choiceTitleStyle: CSSProperties = {
  margin: "16px 0 30px",
  color: colors.ink,
  fontSize: 84,
  fontWeight: 800,
  letterSpacing: 0,
};

const choiceSubtitleStyle: CSSProperties = {
  color: colors.muted,
  fontSize: 40,
  fontWeight: 300,
  letterSpacing: 0,
};

const dividerStyle: CSSProperties = {
  gridColumn: 2,
  width: 1,
  backgroundColor: colors.lineStrong,
};

const outroRuleStyle: CSSProperties = {
  width: 70,
  height: 2,
  backgroundColor: colors.accent,
  marginBottom: 38,
};

const outroTitleStyle: CSSProperties = {
  color: colors.ink,
  fontSize: 172,
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: 0,
};

const outroSubtitleStyle: CSSProperties = {
  marginTop: 42,
  color: colors.muted,
  fontSize: 40,
  fontWeight: 300,
  letterSpacing: 0,
};

const captionLayerStyle: CSSProperties = {
  zIndex: 100,
  pointerEvents: "none",
};

const captionStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: layout.captionBottom,
  maxWidth: 1180,
  color: colors.ink,
  fontSize: 40,
  fontWeight: 500,
  lineHeight: 1.25,
  textAlign: "center",
  letterSpacing: 0,
};

const pipFrameStyle: CSSProperties = {
  position: "absolute",
  right: layout.pipRight,
  bottom: layout.pipBottom,
  zIndex: 90,
  width: layout.pipSize,
  height: layout.pipSize,
  borderRadius: "50%",
};

const pipRingStyle: CSSProperties = {
  position: "absolute",
  inset: -11,
  borderRadius: "50%",
  border: "1.5px solid rgba(20,82,255,0.55)",
};

const pipInnerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  padding: 5,
  backgroundColor: colors.white,
  boxShadow: "0 16px 40px rgba(0,0,0,0.14)",
  overflow: "hidden",
};

const pipMaskStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  overflow: "hidden",
  background: "linear-gradient(160deg,#e3e3df,#cdccc7)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};

const avatarWrapStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
};

const avatarHeadStyle: CSSProperties = {
  position: "absolute",
  left: 75,
  top: 44,
  width: 56,
  height: 56,
  borderRadius: "50%",
  backgroundColor: "#a9a9a3",
};

const avatarBodyStyle: CSSProperties = {
  position: "absolute",
  left: 43,
  bottom: -16,
  width: 120,
  height: 88,
  borderRadius: "58px 58px 24px 24px",
  backgroundColor: "#a9a9a3",
};

const topbarStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: layout.topbarHeight,
  zIndex: 120,
  backgroundColor: colors.topbar,
  overflow: "hidden",
};

const navFillStyle: CSSProperties = {
  position: "absolute",
  top: 7,
  bottom: 7,
  left: 0,
  backgroundColor: colors.white,
  borderRadius: "0 14px 14px 0",
};

const chapterRowStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 34px",
  fontSize: 22,
  lineHeight: 1,
  whiteSpace: "nowrap",
  zIndex: 1,
};

const chapterGroupStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 28,
};

const chapterLabelStyle: CSSProperties = {
  fontWeight: 500,
  letterSpacing: 0,
};

const chapterSepStyle: CSSProperties = {
  color: colors.topbarSeparator,
};
