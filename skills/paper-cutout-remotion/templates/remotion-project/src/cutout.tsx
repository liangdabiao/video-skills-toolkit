// ============================================================================
// cutout.tsx — 纸片分层动画原语（风格锁定文件，勿改视觉参数）
// 这是纸片风相对 sketch-story 的核心扩展：加载真实 PNG 素材 + drop-shadow 白边
// + 三档 roleMotion 错峰入场。所有角色/装饰图都通过这里的组件加载。
// ============================================================================
import React from 'react';
import {Img, staticFile, useCurrentFrame, interpolate, random} from 'remotion';
import {PAPER_EDGE} from './theme';

// —— roleMotion：三档角色动画参数（需求原文方法论） ——
// 主角移动距离最大、缩放最狠、落地感最强；后排只做小幅移动避免抢戏。
// 不要改成统一参数——错峰和差异化是纸片风有层次的根源。
export const roleMotion = {
  primary: {distance: 78, rise: 55, startScale: 0.86, bobAmp: 2.4},
  secondary: {distance: 58, rise: 38, startScale: 0.90, bobAmp: 1.8},
  tertiary: {distance: 38, rise: 22, startScale: 0.95, bobAmp: 1.2},
} as const;
export type Role = keyof typeof roleMotion;

// —— 剪纸白边 + 深投影配方（需求原文） ——
// 四向白边负责"剪纸感"，最后一向深色阴影负责把人物从背景里抬起来。
// 不要删任何一个 drop-shadow——少了白边会糊进背景，少了深投影会失去立体感。
export const PAPER_FILTER = `
  drop-shadow(4px 0 ${PAPER_EDGE})
  drop-shadow(-4px 0 ${PAPER_EDGE})
  drop-shadow(0 4px ${PAPER_EDGE})
  drop-shadow(0 18px 9px rgba(20,15,12,.32))
`;

// 入场动画时长（帧）。主角略慢更有分量，后排快一些。
const enterDur = (role: Role) => (role === 'primary' ? 22 : role === 'secondary' ? 18 : 14);

// ============================================================================
// PaperActor：独立角色 PNG
// 用法（在 scenes.tsx 的 <Svg> 内，但这里实际渲染成 absolute div 方便用 CSS filter）：
//   <PaperActor src="assets/layers/emperor-1.png" x={960} y={900} width={650}
//               role="primary" delay={4} zIndex={5} seed="s1emp" />
// x/y 是人物脚底中心点（和 sketch-story 的 StickMan 一致：y 是地面位置）。
// ============================================================================
export const PaperActor: React.FC<{
  src: string;            // staticFile 相对路径，如 'assets/layers/emperor-1.png'
  x: number;              // 脚底中心 x
  y: number;              // 脚底 y（地面）
  width: number;          // 人物显示宽度（px）。高度按原图比例自适应。
  role: Role;
  delay: number;          // 入场延迟帧（错峰：主角 4、配角 18、后排 34）
  zIndex: number;         // 层级（背景 0、后排 1-2、主角 5、前景 3-4）
  seed: string;           // 漂浮相位（场景前缀+编号，如 's1emp'）
  flip?: boolean;         // 水平镜像（朝向反了用）
}> = ({src, x, y, width, role, delay, zIndex, seed, flip = false}) => {
  const frame = useCurrentFrame();
  const m = roleMotion[role];
  const dur = enterDur(role);
  const p = Math.max(0, Math.min(1, (frame - delay) / dur));
  if (p <= 0) return null;

  // 入场：从下方 rise 上来 + 从 startScale 放大到 1 + 从侧面 distance 滑入（左右随机）
  const sideDir = random(`${seed}side`) > 0.5 ? 1 : -1;
  const enterX = (1 - p) * m.distance * sideDir;
  const enterY = (1 - p) * m.rise;
  const scale = m.startScale + (1 - m.startScale) * p;
  const opacity = p;

  // 入场后的极轻微漂浮（避免画面完全静止）——用 random(seed) 给不同角色不同相位
  const bobActive = p >= 1;
  const bobPhase = random(`${seed}bob`) * Math.PI * 2;
  const bob = bobActive ? Math.sin(frame * 0.06 + bobPhase) * m.bobAmp : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x + enterX,
        top: y + enterY + bob,
        width,
        zIndex,
        transform: `translate(-50%, -100%) scaleX(${flip ? -1 : 1}) scale(${scale})`,
        transformOrigin: 'bottom center',
        opacity,
        filter: PAPER_FILTER,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{width: '100%', height: 'auto', display: 'block'}}
      />
    </div>
  );
};

// ============================================================================
// PaperLayer：静态装饰图层（撕纸边缘、胶带、印章、纸屑、远景建筑等）
// 和 PaperActor 区别：装饰层不做角色入场，只做一次淡入 + 可选极慢漂移。
// 用来做四层里的"背景层装饰"和"前景层遮挡物"。
// ============================================================================
export const PaperLayer: React.FC<{
  src: string;
  x?: number;             // 默认 0（左上角铺底）
  y?: number;
  width?: number;         // 不填用原图尺寸
  zIndex: number;
  start: number;          // 淡入帧
  drift?: number;         // 水平漂移幅度 px（背景慢漂用，默认 0）
  driftDur?: number;      // 漂移周期帧（默认 600 = 20s）
  filter?: string;        // 可覆盖（装饰层一般不加白边，只加轻微投影）
}> = ({
  src, x = 0, y = 0, width, zIndex, start, drift = 0, driftDur = 600,
  filter = 'drop-shadow(0 6px 6px rgba(20,15,12,.18))',
}) => {
  const frame = useCurrentFrame();
  const p = Math.max(0, Math.min(1, (frame - start) / 14));
  if (p <= 0) return null;
  const driftX = drift > 0 ? Math.sin((frame / driftDur) * Math.PI * 2) * drift : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x + driftX,
        top: y,
        width,
        zIndex,
        opacity: p,
        filter,
      }}
    >
      <Img src={staticFile(src)} style={{width: width ? '100%' : 'auto', height: 'auto', display: 'block'}} />
    </div>
  );
};

// ============================================================================
// 背景推镜：把整张底板做 1% 左右的慢速推拉，制造"镜头在动"的呼吸感。
// 直接包在场景最外层（Plate 之上）。durationFrames 是当前场景总帧数。
// ============================================================================
export const BackgroundPan: React.FC<{
  children?: React.ReactNode;
  durationFrames: number;
  startScale?: number;    // 默认 1.0
  endScale?: number;      // 默认 1.03（3% 推近）
}> = ({children, durationFrames, startScale = 1.0, endScale = 1.03}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(
    frame,
    [0, durationFrames],
    [startScale, endScale],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </div>
  );
};

// —— 角色宽度参考（需求原文唐朝片实测值，排新版时当锚点） ——
// 全景镜头：皇帝 650 / 侍女 235-245 / 群臣 158-170
// 特写镜头：中央礼盒人物 575 / 前排跪拜 285-330 / 后排侍从 165-180
// 不是硬约束，是"主次大小要拉开"的参考量级。
export const WIDTH_REF = {
  primaryWide: 650,
  secondaryWide: 240,
  tertiaryWide: 165,
  primaryClose: 575,
  secondaryClose: 300,
  tertiaryClose: 170,
};
