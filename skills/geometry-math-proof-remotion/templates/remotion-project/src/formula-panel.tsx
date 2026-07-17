/**
 * 右侧公式逐步揭示面板。
 *
 * 用法:
 *   1. 在 Proof.tsx 定义 steps: FormulaStep[],每条带 {from, label, expr, tone?}
 *   2. <FormulaPanel frame={frame} steps={steps} />
 *
 * expr 中的数学符号 (²/₁/₂ 等) 必须包在字符串表达式里:
 *   ✅ expr: <span>{'a² + b² = c²'}</span>
 *   ❌ expr: <span>a² + b² = c²</span>   // TS1351
 */
import React from 'react';
import {C, FONT_MATH, FONT_SANS, fadeIn} from './geometry';

export type FormulaStep = {
  from: number;          // 出现帧
  label: string;         // 章节小标 (灰色,中文)
  expr: React.ReactNode; // 公式 JSX
  tone?: 'normal' | 'accent' | 'result';
  // normal: 默认
  // accent: 中间强调 (黄色突出关键变量)
  // result: 最终结论 (黄框,大字号)
};

export const FormulaPanel: React.FC<{
  frame: number;
  steps: FormulaStep[];
  title?: string;
}> = ({frame: f, steps, title = 'DERIVATION'}) => {
  return (
    <div style={{
      position: 'absolute', right: 30, top: 110, width: 700, bottom: 130,
      padding: 32, borderRadius: 16,
      background: C.panelBg, border: `1px solid ${C.panelBorder}`,
      display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'flex-start',
    }}>
      <div style={{
        fontFamily: FONT_SANS, fontSize: 22, color: C.textDim,
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4,
      }}>
        {title}
      </div>
      {steps.map((s, i) => {
        const op = fadeIn(f, s.from, 24);
        if (op <= 0) return null;
        const isResult = s.tone === 'result';
        return (
          <div key={i} style={{
            opacity: op,
            display: 'flex', flexDirection: 'column', gap: 4,
            padding: isResult ? '16px 20px' : '8px 16px',
            borderRadius: 10,
            background: isResult ? 'rgba(241,196,15,0.10)' : 'transparent',
            border: isResult ? `1px solid ${C.yellow}` : 'none',
            transform: `translateX(${(1 - op) * 10}px)`,
          }}>
            <span style={{fontFamily: FONT_SANS, fontSize: 18, color: C.textDim}}>
              {s.label}
            </span>
            <span style={{
              fontFamily: FONT_MATH,
              fontSize: isResult ? 44 : 36,
              color: C.text,
              lineHeight: 1.2,
            }}>
              {s.expr}
            </span>
          </div>
        );
      })}
    </div>
  );
};
