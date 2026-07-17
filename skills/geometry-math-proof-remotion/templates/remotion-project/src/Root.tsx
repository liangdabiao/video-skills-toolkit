import React from 'react';
import {Composition} from 'remotion';
import {Proof} from './Proof';

// durationInFrames 必须等于 captions_aligned.json 的 total_frames
// TTS 生成后用真实 total_frames 替换下面的占位值。
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Proof"
      component={Proof}
      durationInFrames={1500}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
