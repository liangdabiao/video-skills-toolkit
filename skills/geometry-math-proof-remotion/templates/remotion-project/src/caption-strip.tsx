/**
 * 底部字幕条: 按 frame 查找当前 line, 用 accent 高亮关键词。
 *
 * 用法:
 *   1. 在 Proof.tsx 定义 captions: Caption[] (从 captions_aligned.json 拷贝 start/end/parts)
 *   2. <CaptionStrip frame={frame} captions={captions} />
 */
import React from 'react';
import {C, FONT_SANS, fadeIn, fadeOut} from './geometry';

export type CaptionPart = {text: string; tone?: 'accent'};
export type Caption = {start: number; end: number; parts: CaptionPart[]};

export const CaptionStrip: React.FC<{
  frame: number;
  captions: Caption[];
}> = ({frame: f, captions}) => {
  const cap = captions.find(c => f >= c.start && f < c.end) ?? null;
  if (!cap) return null;
  const op = fadeIn(f, cap.start, 6, 1);
  const opOut = f > cap.end - 6 ? fadeOut(f, cap.end - 6, 6, 0) : 1;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: 110,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 80px',
      background: 'linear-gradient(0deg, rgba(13,13,18,0.96), rgba(13,13,18,0.0))',
      opacity: Math.min(op, opOut),
    }}>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 38, color: C.text, textAlign: 'center',
        lineHeight: 1.4, maxWidth: 1600,
      }}>
        {cap.parts.map((p, i) => (
          <span key={i} style={{
            color: p.tone === 'accent' ? C.yellow : C.text,
            fontWeight: p.tone === 'accent' ? 700 : 400,
          }}>
            {p.text}
          </span>
        ))}
      </div>
    </div>
  );
};
