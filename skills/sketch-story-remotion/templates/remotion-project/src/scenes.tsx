import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AiScreen, CuteAi, DeskLine, StickMan, ThermosCup} from './characters';
import {SketchArrow, SketchCross, SketchHighlightCircle, SketchRect, SketchUnderline} from './sketch';
import {BLUE, INK, RED} from './theme';
import {Bubble, HandText, Narration, Paper, RedTitle, Svg, prog} from './ui';

// ============ 场景模板 1：片头 ============
// 模式：灰色系列名 → 黑色大标题 → 红色副标题带手绘下划线 → 角色亮相
export const S1Title: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Paper>
      <HandText x={960} y={300} size={44} color="#888" start={5}>
        小白学AI · 第 N 集
      </HandText>
      <HandText x={960} y={400} size={78} color={INK} start={15} weight={700}>
        本集主标题
      </HandText>
      <HandText x={960} y={530} size={54} color={RED} start={35} weight={700}>
        本集悬念副标题？
      </HandText>
      <Svg>
        <SketchUnderline x1={620} x2={1300} y={640} seed="s1ul" progress={prog(frame, 45, 18)} stroke={RED} />
        <StickMan x={960} y={910} size={170} seed="s1man" progress={prog(frame, 60, 30)} mood="worried" bob={frame} />
      </Svg>
    </Paper>
  );
};

// ============ 场景模板 2：对话 + 图解 ============
// 模式：红标题 → 地面线 + 角色 → 手绘框/箭头逐步出现 → 气泡对话 → 底部旁白
export const S2Example: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Paper>
      <RedTitle x={960} y={70} width={340} start={0}>
        场景标题
      </RedTitle>
      <Svg>
        <DeskLine x1={200} x2={760} y={820} seed="s2desk" progress={prog(frame, 5, 15)} />
        <StickMan x={420} y={820} size={180} seed="s2xb" progress={prog(frame, 10, 20)} mood="worried" bob={frame} />
        <StickMan x={1560} y={820} size={200} seed="s2lw" progress={prog(frame, 30, 20)} mood="neutral" bob={frame + 40} glasses />
        <ThermosCup x={1505} y={770} seed="s2cup" progress={prog(frame, 45, 15)} scale={1.1} />
        {/* 图解元素：框、箭头、红圈、红叉按剧情节奏依次画出 */}
        <SketchRect x={800} y={330} w={320} h={120} seed="s2box" progress={prog(frame, 80, 18)} fill="#fff" />
        <SketchArrow x1={700} y1={600} x2={820} y2={470} seed="s2arr" progress={prog(frame, 110, 20)} />
        <SketchHighlightCircle cx={960} cy={390} rx={220} ry={90} seed="s2hl" progress={prog(frame, 150, 25)} />
        <SketchCross cx={1400} cy={390} size={80} seed="s2x" progress={prog(frame, 180, 16)} />
        {/* AI 角色两种形态：独立小电脑 or 桌面显示器 */}
        <CuteAi x={1100} y={820} size={180} seed="s2ai" progress={prog(frame, 210, 20)} bob={frame} />
      </Svg>
      <HandText x={960} y={345} size={36} start={90}>
        框里的要点文字
      </HandText>
      <Bubble x={200} y={330} w={420} start={130} tail="left" size={30}>
        小白的台词，<span style={{color: RED}}>重点标红</span>。
      </Bubble>
      <Bubble x={1180} y={280} w={430} start={170} tail="right" size={34}>
        老吴的台词。
      </Bubble>
      <Narration start={240}>底部旁白：故事的画外音放这里。</Narration>
    </Paper>
  );
};

// AiScreen 用法（放在需要"桌上电脑"的场景里）：
// <AiScreen x={760} y={800} seed="scr" progress={prog(frame, 30, 25)} faceOn />
void AiScreen;
