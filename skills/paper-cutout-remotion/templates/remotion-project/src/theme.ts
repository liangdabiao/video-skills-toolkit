// ============================================================================
// theme.ts — 纸片风风格锁定文件（勿改视觉参数）
// 改色板/字体会影响整套模板的一致性。要加新主题，加常量，不要改已有值。
// ============================================================================

// 画布规格（不可变）
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;

// —— 色板 ——
// 纸底用偏暖的米白宣纸色，比纯白更"有纸感"，也更适合贴红色/金色人物。
export const PAPER = '#f3ead6';        // 宣纸米白（底板默认底色）
export const PAPER_DEEP = '#e8d9bd';   // 深一档纸色（章节分块/暗角）

// 剪影墨色：人物描边、标题主色
export const INK = '#1f1a14';          // 暖墨黑（不是纯黑，更贴复古纸感）

// 系列强调色（语义分工，和 sketch-story 一致的四色逻辑）
export const RED = '#b8322a';          // 主标题 / 警示 / 强调印章红（偏朱砂）
export const BLUE = '#2f5d8a';         // 标注 / 副信息
export const ORANGE = '#c8732a';       // 流程 / 箭头
export const GREEN = '#3f7a3a';        // 正向 / 对勾
export const GOLD = '#b8893a';         // 金色（宫廷/华贵题材常用）

// 剪纸白边色（drop-shadow 用，比纯白柔，避免纸片"发光"显得假）
export const PAPER_EDGE = '#f5eedc';

// —— 字体栈 ——
// 纸片风偏"印刷/剪纸"质感而非手写体，所以优先用宋体/楷体的粗重档，
// 配合 drop-shadow 白边模拟剪纸字效果。跨机器渲染需自带字体。
export const FONT_TITLE = "'Source Han Serif SC','Noto Serif SC','Songti SC','STSong','SimSun',serif";
export const FONT_BODY = "'Source Han Serif SC','Noto Serif SC','Songti SC','STSong','SimSun',serif";
export const FONT_CAPTION = "'PingFang SC','Source Han Sans SC','Noto Sans SC','Microsoft YaHei',sans-serif";

// —— 默认配置（可被项目覆盖，但给个稳定默认） ——
// apiz 生图默认模型（见 skill 的 prompt-recipes.md）
export const DEFAULT_IMAGE_MODEL = 'fal-ai/nano-banana-pro';
// MiniMax 配音默认 voice（apiz speak 用 public voice id）
export const DEFAULT_VOICE_ID = 'female-shaonv';
export const DEFAULT_TTS_MODEL = 'speech-2.8-hd'; // apiz speak 命名；直连 minimaxi API 用 'speech-02-hd'
