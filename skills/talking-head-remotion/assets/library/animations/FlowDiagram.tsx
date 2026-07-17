import type {CSSProperties, ReactNode} from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";

/**
 * FlowDiagram —— 节点 + 连线逐段生长的示意动画。
 *
 * 用法：包在 <Sequence from={起始帧}> 里，nodes/edges 的 appearAt 是组件内相对秒数。
 * x/y 表示节点中心点坐标；布局由调用方手写，组件只负责动效和连线。
 * SFX 卡点：节点落位帧适合轻 pop，关键连线长完帧适合轻 sweep。
 *
 * 适合：流程、管线、因果链、三五个节点的架构关系。
 * 不适合：复杂自动排版图；节点文字超过 6 字时应拆场景。
 */
export type FlowNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  appearAt: number;
  icon?: ReactNode;
};

export type FlowEdge = {
  from: string;
  to: string;
  appearAt: number;
};

export type FlowEmphasis = {
  nodeId: string;
  at: number;
};

export type FlowDiagramTheme = {
  bg: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  edge: string;
};

export type FlowDiagramProps = {
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  emphasize?: FlowEmphasis[];
  flowDots?: boolean;
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  fontFamily?: string;
  theme?: Partial<FlowDiagramTheme>;
  style?: CSSProperties;
};

const defaultTheme: FlowDiagramTheme = {
  bg: "#ffffff",
  border: "rgba(28,38,54,0.14)",
  text: "#151922",
  muted: "#747982",
  accent: "#2f6fff",
  edge: "rgba(28,38,54,0.46)",
};

export const FlowDiagram = ({
  nodes = [],
  edges = [],
  emphasize = [],
  flowDots = true,
  width = 980,
  height = 420,
  nodeWidth = 172,
  nodeHeight = 68,
  fontFamily = '"Noto Sans SC", sans-serif',
  theme,
  style,
}: FlowDiagramProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const colors = {...defaultTheme, ...theme};
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const markerId = `flow-arrow-${colors.edge.replace(/[^a-zA-Z0-9]/g, "")}-${nodeWidth}-${nodeHeight}`;

  return (
    <div style={{position: "relative", width, height, fontFamily, ...style}}>
      <svg width={width} height={height} style={{position: "absolute", inset: 0, overflow: "visible"}}>
        <defs>
          <marker id={markerId} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L8,3 z" fill={colors.edge} />
          </marker>
        </defs>
        {edges.map((edge, index) => {
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          if (!from || !to) {
            return null;
          }

          const anchors = anchorsFor(from, to, nodeWidth, nodeHeight);
          const length = distance(anchors.start.x, anchors.start.y, anchors.end.x, anchors.end.y);
          const p = interpolate(t, [edge.appearAt, edge.appearAt + 0.4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          const markerEnd = p >= 0.98 ? `url(#${markerId})` : undefined;

          return (
            <g key={`${edge.from}-${edge.to}-${index}`}>
              <line
                x1={anchors.start.x}
                y1={anchors.start.y}
                x2={anchors.end.x}
                y2={anchors.end.y}
                stroke={colors.edge}
                strokeWidth={1.5}
                strokeDasharray={length}
                strokeDashoffset={length * (1 - p)}
                markerEnd={markerEnd}
                strokeLinecap="round"
              />
              {flowDots && p >= 1
                ? [0, 0.52].map((phase) => {
                    const dotP = (frame / 90 + phase) % 1;
                    const x = anchors.start.x + (anchors.end.x - anchors.start.x) * dotP;
                    const y = anchors.start.y + (anchors.end.y - anchors.start.y) * dotP;
                    return <circle key={phase} cx={x} cy={y} r={4.5} fill={colors.accent} opacity={0.68} />;
                  })
                : null}
            </g>
          );
        })}
      </svg>
      {nodes.map((node) => {
        const localFrame = Math.max(0, (t - node.appearAt) * fps);
        const enter = spring({fps, frame: localFrame, config: {damping: 15, stiffness: 180, mass: 0.7}});
        const enterP = Math.min(enter, 1.06);
        const emphasis = latestEmphasisForNode(emphasize, node.id, t);
        const emphasisLocal = emphasis ? t - emphasis.at : 999;
        const pulse =
          emphasisLocal >= 0 && emphasisLocal < 0.45
            ? interpolate(emphasisLocal, [0, 0.18, 0.45], [1, 1.06, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })
            : 1;
        const isActive = emphasisLocal >= 0 && emphasisLocal < 0.7;
        const opacity = interpolate(t, [node.appearAt, node.appearAt + 0.18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: node.x - nodeWidth / 2,
              top: node.y - nodeHeight / 2,
              width: nodeWidth,
              height: nodeHeight,
              borderRadius: 14,
              border: `1.5px solid ${isActive ? colors.accent : colors.border}`,
              background: colors.bg,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxSizing: "border-box",
              fontSize: 23,
              fontWeight: 800,
              letterSpacing: 0,
              opacity,
              transform: `scale(${interpolate(enterP, [0, 1], [0.9, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) * pulse})`,
              boxShadow: isActive ? `0 0 24px rgba(47,111,255,0.18)` : "none",
            }}
          >
            {node.icon ? <span style={{display: "flex", color: colors.accent}}>{node.icon}</span> : null}
            <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: nodeWidth - 28}}>
              {node.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const latestEmphasisForNode = (emphasize: FlowEmphasis[], nodeId: string, time: number) => {
  return emphasize.filter((item) => item.nodeId === nodeId && item.at <= time).sort((a, b) => b.at - a.at)[0];
};

const anchorsFor = (from: FlowNode, to: FlowNode, nodeWidth: number, nodeHeight: number) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      start: {x: from.x + Math.sign(dx || 1) * nodeWidth / 2, y: from.y},
      end: {x: to.x - Math.sign(dx || 1) * nodeWidth / 2, y: to.y},
    };
  }

  return {
    start: {x: from.x, y: from.y + Math.sign(dy || 1) * nodeHeight / 2},
    end: {x: to.x, y: to.y - Math.sign(dy || 1) * nodeHeight / 2},
  };
};

const distance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.hypot(x2 - x1, y2 - y1);
};
