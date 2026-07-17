import type {CSSProperties} from "react";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

/**
 * TitleSlam —— 大字逐个"砸落"进场。
 *
 * 用法：包在 <Sequence from={起始帧}> 里，组件内部从自己的第 0 帧开始计时。
 * 每个字以放大 + 轻微旋转的状态砸到位，落点带一次短促的整屏震动。
 * SFX 卡点：第 i 个字的落点帧 = round((i * stagger + slamDuration) * fps)，
 * 通常在第一个或最后一个落点放重型 impact（如 sfx-deep-impact.mp3）。
 *
 * 适合：开场 Hook 标题、章节大标题、重大反差结论（2-6 个字最佳）。
 * 不适合：普通关键词出现、长句、安静解释段。
 */
export type TitleSlamProps = {
  text: string;
  /** 每个字进场间隔（秒），默认 0.16 */
  stagger?: number;
  /** 单字砸落时长（秒），默认 0.32 */
  slamDuration?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  /** 需要强调色的字符下标 */
  accentIndices?: number[];
  accentColor?: string;
  style?: CSSProperties;
};

export const TitleSlam = ({
  text,
  stagger = 0.16,
  slamDuration = 0.32,
  fontSize = 200,
  color = "#151922",
  fontFamily = '"Noto Sans SC", sans-serif',
  fontWeight = 900,
  accentIndices = [],
  accentColor = "#2f6fff",
  style,
}: TitleSlamProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const chars = Array.from(text);

  // 落点后的整屏震动：取最近一次落点，做快速衰减抖动
  let shake = 0;
  for (let i = 0; i < chars.length; i++) {
    const landT = i * stagger + slamDuration;
    const since = t - landT;
    if (since >= 0 && since < 0.22) {
      const decay = 1 - since / 0.22;
      shake = Math.max(shake, Math.sin(since * 90) * 7 * decay * decay);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: `translateY(${shake}px)`,
        ...style,
      }}
    >
      {chars.map((char, i) => {
        const local = t - i * stagger;
        const p = interpolate(local, [0, slamDuration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.6, 0.04, 0.35, 1),
        });
        const scale = interpolate(p, [0, 1], [3.2, 1]);
        const opacity = interpolate(p, [0, 0.45, 1], [0, 0.9, 1]);
        const rotate = interpolate(p, [0, 1], [i % 2 === 0 ? -7 : 7, 0]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontSize,
              fontFamily,
              fontWeight,
              lineHeight: 1.1,
              color: accentIndices.includes(i) ? accentColor : color,
              opacity,
              transform: `scale(${scale}) rotate(${rotate}deg)`,
              transformOrigin: "center 70%",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </div>
  );
};
