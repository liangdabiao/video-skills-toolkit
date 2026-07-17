import React from 'react';
import {AbsoluteFill, Composition, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {S1Title, S2Example} from './scenes';
import {PAPER} from './theme';

const FPS = 30;

// 每集只需要改这张表：场景组件 + 帧数。
// 无配音时按阅读速度排帧；有配音时把 frames 换成每段音频的实际时长（见 SKILL.md）。
const SCENES: {comp: React.FC; frames: number}[] = [
  {comp: S1Title, frames: 130},
  {comp: S2Example, frames: 300},
];

export const TOTAL_FRAMES = SCENES.reduce((a, s) => a + s.frames, 0);

// 场景间黑场淡入淡出（首尾各 12 帧）
const FadeScene: React.FC<{durationInFrames: number; children: React.ReactNode}> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 12, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

export const Episode: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      {SCENES.map((s, i) => {
        const start = from;
        from += s.frames;
        const C = s.comp;
        return (
          <Sequence key={i} from={start} durationInFrames={s.frames}>
            <FadeScene durationInFrames={s.frames}>
              <C />
            </FadeScene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Episode"
      component={Episode}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
