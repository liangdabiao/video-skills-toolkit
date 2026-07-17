import type {ArticleVideoProps} from "./ArticleVideo";

// 初始模板刻意留空：只展示背景、顶部进度条、品牌标和字幕样式。
// 真实制作流程：
//   1. 跑 scripts/fetch_article.py 下载原文图到 public/assets/article-images/
//   2. 用运行时 LLM 按 references/beat-checklist.md 拆稿，输出 scenes/captions/chapters
//   3. 跑 scripts/generate_tts.py 生成 voice.m4a 和 captions_aligned.json
//   4. 把下面 demoProject 替换为真实数据
export const demoProject: ArticleVideoProps = {
  title: "__PROJECT_TITLE__",
  fps: 30,
  durationSeconds: __DURATION_SECONDS__,
  voiceAudio: "",
  chapters: [
    {label: "开篇", start: 0},
    {label: "背景", start: 6},
    {label: "正文", start: 14},
    {label: "总结", start: 22},
  ],
  scenes: [
    {
      kind: "cover",
      start: 0,
      eyebrow: "公众号文章",
      titleLines: [
        [{text: "示例文章"}],
        [{text: "标题", tone: "accent"}],
      ],
      subtitle: "把任意一篇公众号原文转成 Studio 风格的视频。",
    },
    {
      kind: "article-image",
      start: 4,
      eyebrow: "原文图展示",
      imageSrc: "assets/article-images/img-01.jpg",
      imageAspect: 1.5,
      title: [
        {text: "完整的"},
        {text: "公众号图片", tone: "accent"},
        {text: "展示"},
      ],
      caption: "object-fit: contain，永不裁切",
      source: "图源：示例 / 演示场景",
      appearAt: 0.1,
      titleAppearAt: 0.2,
      captionAppearAt: 0.5,
    },
    {
      kind: "list",
      start: 10,
      eyebrow: "关键要点",
      heading: "三大核心",
      items: [
        {index: "01", label: "完整图片", value: "保留", tone: "accent", appearAt: 0.3},
        {index: "02", label: "逐元素", value: "进场", tone: "accent", appearAt: 0.5},
        {index: "03", label: "字幕", value: "同步", tone: "accent", appearAt: 0.7},
      ],
    },
    {
      kind: "outro",
      start: 18,
      eyebrow: "谢谢观看",
      title: "下期见",
      subtitle: "扫码关注公众号，看更多内容。",
    },
  ],
  captions: [
    {
      start: 0.5,
      end: 3.5,
      parts: [
        {text: "这是一条示例字幕，"},
        {text: "关键词", tone: "accent"},
        {text: " 用蓝色强调"},
      ],
    },
    {
      start: 4.5,
      end: 9.0,
      parts: [
        {text: "完整的公众号图片，"},
        {text: "object-fit", tone: "accent"},
        {text: " contain，永不裁切"},
      ],
    },
    {
      start: 10.5,
      end: 17.0,
      parts: [
        {text: "三个核心要点，逐个进场"},
      ],
    },
  ],
  sfxCues: [],
};
