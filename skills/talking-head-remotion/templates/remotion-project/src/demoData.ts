import type {StudioTalkingHeadProps} from "./StudioTalkingHead";

// 初始模板刻意留空：只展示背景、顶部进度条、右下角 PIP 框和字幕样式。
// 中间舞台的场景（scenes）等拿到真实脚本和对齐音频后，按字幕逐元素填充；
// 布局模式（cover/list/stat/compare/outro）见 StudioTalkingHead.tsx 的类型定义。
export const demoProject: StudioTalkingHeadProps = {
  title: "__PROJECT_TITLE__",
  fps: 30,
  durationSeconds: __DURATION_SECONDS__,
  voiceAudio: "",
  talkingHeadVideo: "",
  chapters: [
    {label: "章节一", start: 0},
    {label: "章节二", start: 6},
    {label: "章节三", start: 12},
  ],
  scenes: [],
  captions: [
    {
      start: 0.5,
      end: 4.0,
      parts: [
        {text: "这是一条示例字幕，"},
        {text: "关键词", tone: "accent"},
        {text: " 用蓝色强调"},
      ],
    },
    {
      start: 6.5,
      end: 10.0,
      parts: [
        {text: "字幕承载完整口播句子，主画面只放 "},
        {text: "关键词", tone: "white"},
      ],
    },
  ],
  sfxCues: [],
};
