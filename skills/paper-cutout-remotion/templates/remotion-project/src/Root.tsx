// ============================================================================
// Root.tsx — Composition 注册 + SCENES 表 + FadeScene 切场 + 音频挂载
// 每集只改这里的 SCENES 表（顺序+时长）和每场的音频文件名。
// 不要改 FadeScene / Episode / RemotionRoot 的实现——它们是切场骨架。
// ============================================================================
import React from 'react';
import {
  AbsoluteFill, Audio, Composition, Sequence, useCurrentFrame, interpolate, staticFile,
} from 'remotion';
import {FPS, PAPER} from './theme';
import {S1Title, S2Example, S3Closeup} from './scenes';

// —— SCENES 表：顺序 + 时长（帧） ——
// 无配音估时版：按"把屏上文字慢速读一遍 + 1~2秒余量"估。
// 配音版：用 gen_tts.py 产出的 timeline.json 回写真实时长：
//   sourceFrames = ceil(时长秒 × 30) + 15
const SCENES: {comp: React.FC; frames: number; audio?: string}[] = [
  {comp: S1Title, frames: 140, audio: 'audio/narration/s01.mp3'},
  {comp: S2Example, frames: 320, audio: 'audio/narration/s02.mp3'},
  {comp: S3Closeup, frames: 300, audio: 'audio/narration/s03.mp3'},
];

export const TOTAL_FRAMES = SCENES.reduce((a, s) => a + s.frames, 0);

// —— FadeScene：首尾各 12 帧淡入淡出。clamp 保证帧越界时钉死在 0/1。 ——
const FadeScene: React.FC<{durationInFrames: number; children: React.ReactNode}> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 12, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

// —— Episode：场景拼装 ——
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
              {/* 旁白音频：配音版按 scene 顺序挂。文件不存在时 Remotion 会报错，所以
                  无配音阶段先注释掉 audio 字段，或把文件放进去再启用。 */}
              {s.audio && <Audio src={staticFile(s.audio)} />}
            </FadeScene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// —— BGM：整片铺底（循环）。配音版从无 BGM 成片重新混入更可控，这里给可选挂载点。 ——
// 用法：在 Episode 最外层加 <Audio src={staticFile('audio/bgm.wav')} loop volume={0.3} />
// 默认不开，避免无 BGM 渲染时找不到文件报错。

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
