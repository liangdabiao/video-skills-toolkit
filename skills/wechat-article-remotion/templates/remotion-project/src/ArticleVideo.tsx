import type {CSSProperties} from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, fonts} from "./theme";
import {frameFromSeconds, progress} from "./shared";
import {PremiumGridBackground} from "./background";
import {
  type ArticleScene,
  type ArticleVideoProps,
  CaptionLayer,
  SceneRenderer,
  TopBar,
} from "./sceneTypes";

// 转发导出，外部 import 仍走 "./ArticleVideo"
export type {ArticleScene, ArticleVideoProps};

export const ArticleVideo = ({
  durationSeconds,
  voiceAudio,
  chapters,
  scenes,
  captions,
  sfxCues = [],
}: ArticleVideoProps) => {
  const {fps} = useVideoConfig();
  const transitionFrames = Math.round(0.42 * fps);
  const totalFrames = frameFromSeconds(durationSeconds, fps);

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
            <SceneRenderer
              scene={scene}
              durationInFrames={durationInFrames}
              isLast={isLast}
            />
          </Sequence>
        );
      })}
      <TopBar chapters={chapters} durationSeconds={durationSeconds} />
      <CaptionLayer captions={captions} />
      <BrandMark totalFrames={totalFrames} fps={fps} />
    </AbsoluteFill>
  );
};

// === 底部右下角品牌小标（轻量、不抢戏） ==================

const BrandMark = ({totalFrames, fps}: {totalFrames: number; fps: number}) => {
  const frame = useCurrentFrame();
  const enter = progress(frame, totalFrames * 0.7, 0.5 * fps);
  if (enter <= 0) {
    return null;
  }
  return (
    <div style={{...brandMarkStyle, opacity: enter}}>
      <span style={brandRuleStyle} />
      <span>公众号文章视频</span>
    </div>
  );
};

const stageStyle: CSSProperties = {
  backgroundColor: colors.canvas,
  color: colors.ink,
  fontFamily: fonts.sans,
  overflow: "hidden",
};

const brandMarkStyle: CSSProperties = {
  position: "absolute",
  right: 36,
  top: 100,
  zIndex: 80,
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: colors.muted,
  fontFamily: fonts.mono,
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: 1.2,
  textTransform: "uppercase",
};

const brandRuleStyle: CSSProperties = {
  width: 28,
  height: 1,
  backgroundColor: colors.lineStrong,
};
