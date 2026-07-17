/**
 * 片头卡 + 片尾卡, 通用全屏遮罩。
 *
 * HookOverlay:   F.hook 开始显示, F.{第二章节} 前 18 帧淡出
 * EndingOverlay: F.{末章节} 后 30 帧淡入, 直到结束
 *
 * 标题文本必须包字符串表达式 (避免 ²/下标 触发 TS1351)。
 */
import React from 'react';
import {AbsoluteFill, interpolate, Easing} from 'remotion';
import {C, FONT_MATH, FONT_SANS, fadeIn, fadeOut} from './geometry';

const ease = Easing.bezier(0.4, 0, 0.2, 1);
const clampOpts = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

export const HookOverlay: React.FC<{
  frame: number;
  start: number;          // F.hook
  end: number;            // F.{第二章节} (淡出锚点)
  title: string;          // 大字公式, 例如 'a² + b² = c²'
  subtitle: string;       // 中文副标题
  caption?: string;       // 小字署名 (年代/作者)
}> = ({frame: f, start, end, title, subtitle, caption}) => {
  const op = fadeOut(f, end - 18, 18, 0);
  if (op <= 0) return null;
  const titleScale = interpolate(f, [start + 12, start + 36], [0.85, 1], {easing: ease, ...clampOpts});
  const titleOp = fadeIn(f, start + 12, 24);
  const subOp = fadeIn(f, start + 60, 24);
  return (
    <AbsoluteFill style={{
      opacity: op,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(13,13,18,0.96)',
    }}>
      <div style={{
        fontFamily: FONT_MATH, fontSize: 140, color: C.yellow, letterSpacing: 4,
        transform: `scale(${titleScale})`, opacity: titleOp,
        textShadow: '0 6px 40px rgba(241,196,15,0.18)',
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 44, color: C.text, marginTop: 30, opacity: subOp,
      }}>
        {subtitle}
      </div>
      {caption && (
        <div style={{
          fontFamily: FONT_SANS, fontSize: 26, color: C.textDim, marginTop: 60,
          opacity: subOp, letterSpacing: 2,
        }}>
          {caption}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const EndingOverlay: React.FC<{
  frame: number;
  start: number;          // F.{末章节}
  qedLabel?: string;      // 例如 'Q.E.D. · 证毕'
  result: string;         // 大字结论, 例如 'a² + b² = c²'
  attribution?: React.ReactNode;  // 收尾署名 (年份/作者)
}> = ({frame: f, start, qedLabel = 'Q.E.D.', result, attribution}) => {
  const op = fadeIn(f, start + 30, 30);
  if (op <= 0) return null;
  const resultScale = interpolate(f, [start + 30, start + 70], [0.7, 1], {easing: ease, ...clampOpts});
  const attOp = fadeIn(f, start + 100, 30);
  return (
    <AbsoluteFill style={{
      opacity: op,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(13,13,18,0.92)',
    }}>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 28, color: C.textDim, letterSpacing: 6,
        textTransform: 'uppercase', marginBottom: 16,
      }}>
        {qedLabel}
      </div>
      <div style={{
        padding: '24px 64px', borderRadius: 14,
        border: `2px solid ${C.yellow}`, background: 'rgba(241,196,15,0.08)',
        transform: `scale(${resultScale})`,
      }}>
        <span style={{fontFamily: FONT_MATH, fontSize: 110, color: C.yellow, letterSpacing: 6}}>
          {result}
        </span>
      </div>
      {attribution && (
        <div style={{
          fontFamily: FONT_SANS, fontSize: 26, color: C.text, marginTop: 50,
          opacity: attOp, textAlign: 'center', lineHeight: 1.6,
        }}>
          {attribution}
        </div>
      )}
    </AbsoluteFill>
  );
};
