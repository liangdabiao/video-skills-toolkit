// ============================================================================
// scenes.tsx — 场景组件（每集主体，全改这里）
// 这是示例范本，展示纸片风四层拆分的标准写法。真实项目里：
//   1. 先用 scripts/gen_plates.py 生成无人物背景底板（assets/plates/）
//   2. 用 scripts/gen_characters.py + split_sheet_green.py 生成透明角色 PNG（assets/layers/）
//   3. 在这里把素材按四层组装：背景层 → 后排 → 主体 → 前景 → 文字/字幕
// ============================================================================
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Paper, Plate, Title, Eyebrow, BodyText, Caption, Seal} from './ui';
import {
  PaperActor, PaperLayer, BackgroundPan, WIDTH_REF,
} from './cutout';

// ============================================================================
// S1Title — 片头卡
// 版式：红印章款眉头 → 大标题（宋体+剪纸白边）→ 副标题 → 右下印章
// 无人物，纯文字开场。最简单的场景，用来验证模板能跑通。
// ============================================================================
export const S1Title: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Paper>
      <Eyebrow x={960} y={300} text="第一章 · 长安" start={5} />
      <Title x={960} y={440} text="盛唐纸片风" start={18} />
      <BodyText
        x={960}
        y={560}
        text="一个把历史拆成四层的动画实验"
        size={44}
        start={40}
      />
      <Seal x={1720} y={900} text={'纸片\n动画'} start={70} />
      <Caption text="（片头：用一句话钩住观众）" start={90} />
    </Paper>
  );
};

// ============================================================================
// S2Example — 全景群像（纸片风四层拆分范本）
// 这是纸片风的核心场景类型。四层从后到前：
//   背景层(z0): 宫殿/山水底板（Plate，无人物，gen_plates 生成）
//   后排层(z1-2): 远处群臣（tertiary，小幅移动）
//   主体层(z5): 皇帝（primary，最大、最有力的入场）
//   前景层(z3-4): 近处侍女/跪拜（secondary，遮挡制造纵深）
// 文字/字幕在最上层。
// ============================================================================
export const S2Example: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Paper>
      {/* —— 背景层：慢速推镜 —— */}
      <BackgroundPan durationFrames={320}>
        {/*
          底板 PNG 由 gen_plates.py 生成：纯环境（宫殿+山水+宣纸纹理），
          绝不能把人物画进背景——画进去就没法独立飞入了。
          开发期没有素材时，把 Plate 注释掉，Paper 的米白底会兜底。
        */}
        {/* <Plate src="assets/plates/01-tang-wide-bg.png" zoom={1.02} /> */}

        {/* 装饰前景层：撕纸边缘 / 胶带 / 印章纸屑（可选，做氛围） */}
        {/* <PaperLayer src="assets/layers/torn-edge.png" zIndex={6} start={0} drift={6} driftDur={900} /> */}
      </BackgroundPan>

      {/* —— 后排层：远处群臣（最小、最慢） —— */}
      <PaperActor
        src="assets/layers/minister-r1.png"
        x={1500}
        y={860}
        width={WIDTH_REF.tertiaryWide}
        role="tertiary"
        delay={34}
        zIndex={2}
        seed="s2min1"
      />
      <PaperActor
        src="assets/layers/minister-r2.png"
        x={1650}
        y={870}
        width={WIDTH_REF.tertiaryWide - 10}
        role="tertiary"
        delay={40}
        zIndex={1}
        seed="s2min2"
      />

      {/* —— 主体层：皇帝（最大、最强入场） —— */}
      <PaperActor
        src="assets/layers/emperor.png"
        x={960}
        y={920}
        width={WIDTH_REF.primaryWide}
        role="primary"
        delay={4}
        zIndex={5}
        seed="s2emp"
      />

      {/* —— 前景层：左右侍女（遮挡制造纵深，secondary） —— */}
      <PaperActor
        src="assets/layers/maid-left.png"
        x={620}
        y={900}
        width={WIDTH_REF.secondaryWide}
        role="secondary"
        delay={18}
        zIndex={4}
        seed="s2maid1"
      />
      <PaperActor
        src="assets/layers/maid-right.png"
        x={1300}
        y={900}
        width={WIDTH_REF.secondaryWide + 5}
        role="secondary"
        delay={22}
        zIndex={3}
        seed="s2maid2"
      />

      {/* —— 文字层（最上层） —— */}
      <Eyebrow x={960} y={70} text="全景 · 盛唐长安" start={6} />
      <Caption text="（全景镜头：皇帝最大，交代规模）" start={50} />
    </Paper>
  );
};

// ============================================================================
// S3Closeup — 特写镜头（同一套模板，换底板和角色比例）
// 特写和全景用同一套组件，只是：底板换深色（突出中央人物）、
// 主次比例换（中央礼盒人物最大、前排跪拜次之、后排侍从最小）。
// 展示"同一模板复用于不同题材"的能力。
// ============================================================================
export const S3Closeup: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Paper>
      <BackgroundPan durationFrames={300} startScale={1.03} endScale={1.06}>
        {/* <Plate src="assets/plates/02-tang-close-bg.png" /> */}
      </BackgroundPan>

      {/* 后排侍从（最小） */}
      <PaperActor
        src="assets/layers/attendant-b1.png"
        x={400}
        y={870}
        width={WIDTH_REF.tertiaryClose}
        role="tertiary"
        delay={30}
        zIndex={1}
        seed="s3att1"
      />
      <PaperActor
        src="assets/layers/attendant-b2.png"
        x={1520}
        y={875}
        width={WIDTH_REF.tertiaryClose - 5}
        role="tertiary"
        delay={34}
        zIndex={2}
        seed="s3att2"
      />

      {/* 前排跪拜（次要） */}
      <PaperActor
        src="assets/layers/kneel-l.png"
        x={650}
        y={910}
        width={WIDTH_REF.secondaryClose}
        role="secondary"
        delay={16}
        zIndex={4}
        seed="s3kneel1"
      />
      <PaperActor
        src="assets/layers/kneel-r.png"
        x={1270}
        y={910}
        width={WIDTH_REF.secondaryClose + 20}
        role="secondary"
        delay={20}
        zIndex={3}
        seed="s3kneel2"
      />

      {/* 中央礼盒人物（主角，最大） */}
      <PaperActor
        src="assets/layers/gift-bearer.png"
        x={960}
        y={930}
        width={WIDTH_REF.primaryClose}
        role="primary"
        delay={4}
        zIndex={5}
        seed="s3gift"
      />

      <Eyebrow x={960} y={70} text="特写 · 万邦来朝" start={6} />
      <Caption text="（特写镜头：中央人物最大，表现朝拜）" start={50} />
    </Paper>
  );
};
