/**
 * 通用几何动画工具集。
 *
 * 这个文件只放和具体证明无关的:
 *   - 颜色调色板 (深底高饱和)
 *   - 字体栈 (数学衬线 + 中文无衬线)
 *   - 帧时间轴工具 (F 占位、fadeIn/fadeOut/drawIn)
 *   - SVG 坐标变换 (pt / poly / pathLen)
 *
 * 具体证明的: 三角形坐标、CAPTIONS、FormulaStep 列表 → 留给 Proof.tsx 自己写。
 */
import {interpolate, Easing} from 'remotion';

/* ===================== Palette ===================== */
export const C = {
  bg: '#0d0d12',
  grid: 'rgba(255,255,255,0.04)',
  red: '#e74c3c',
  redSoft: 'rgba(231,76,60,0.28)',
  redSoftDim: 'rgba(231,76,60,0.10)',
  blue: '#3498db',
  blueSoft: 'rgba(52,152,219,0.28)',
  blueSoftDim: 'rgba(52,152,219,0.10)',
  green: '#2ecc71',
  greenSoft: 'rgba(46,204,113,0.28)',
  greenSoftDim: 'rgba(46,204,113,0.10)',
  yellow: '#f1c40f',
  text: '#f5f5f5',
  textDim: '#8a8a9a',
  panelBg: 'rgba(255,255,255,0.035)',
  panelBorder: 'rgba(255,255,255,0.10)',
} as const;

/* ===================== Fonts ===================== */
// 数学公式用衬线 (Cambria Math 优先); 中文用 PingFang/微软雅黑
export const FONT_MATH = "'Cambria Math','STIX Two Math','Cambria','Georgia','Times New Roman',serif";
export const FONT_SANS = "'PingFang SC','Microsoft YaHei','Hiragino Sans GB','Helvetica Neue',sans-serif";

/* ===================== Timing ===================== */
// F 是各章节的起止帧,占位为 0。TTS 生成后用 captions_aligned.json 的真实帧回写。
// 字段名按证明需要自由扩展 (hook/prep/...),保留 end 作为最末帧。
export const F = {
  hook: 0,
  end: 1500,
} as const;

/* ===================== Easing & helpers ===================== */
const ease = Easing.bezier(0.4, 0, 0.2, 1);
const clampOpts = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

export const fadeIn = (f: number, from: number, dur: number, to = 1) =>
  interpolate(f, [from, from + dur], [0, to], {easing: ease, ...clampOpts});

export const fadeOut = (f: number, from: number, dur: number, to = 0) =>
  interpolate(f, [from, from + dur], [1, to], {easing: ease, ...clampOpts});

// "被画出来": strokeDashoffset 从 1→0, 配合 strokeDasharray = pathLen 使用
export const drawIn = (f: number, from: number, dur: number) =>
  interpolate(f, [from, from + dur], [0, 1], {easing: ease, ...clampOpts});

/* ===================== SVG coordinates ===================== */
// 数学坐标 (gx 右正, gy 上正) → SVG 坐标 (原点 OX/OY, SCALE 像素/单位)
// 默认 viewBox 0 0 1100 860, OX/OY 留出标签空间
export const OX = 100;
export const OY = 760;
export const SCALE = 130;

export type Pt = {x: number; y: number};
export const pt = (gx: number, gy: number): Pt => ({x: OX + gx * SCALE, y: OY - gy * SCALE});

export const poly = (...pts: Pt[]) => pts.map(p => `${p.x},${p.y}`).join(' ');

// 闭合多边形周长, 用于 strokeDasharray
export const pathLen = (...pts: Pt[]) => {
  let l = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    l += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return l;
};
