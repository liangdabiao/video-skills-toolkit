import {staticFile} from "remotion";

const fontFiles = [
  {family: "Noto Sans SC", file: "assets/fonts/NotoSansSC-400.ttf", weight: "400"},
  {family: "Noto Sans SC", file: "assets/fonts/NotoSansSC-700.ttf", weight: "700"},
  {family: "Noto Sans SC", file: "assets/fonts/NotoSansSC-900.ttf", weight: "900"},
  {family: "Space Grotesk", file: "assets/fonts/SpaceGrotesk-400.ttf", weight: "400"},
  {family: "Space Grotesk", file: "assets/fonts/SpaceGrotesk-700.ttf", weight: "700"},
] as const;

if (typeof document !== "undefined" && !document.getElementById("studio-font-faces")) {
  const style = document.createElement("style");
  style.id = "studio-font-faces";
  style.textContent = fontFiles
    .map(
      (font) => `@font-face {
  font-family: "${font.family}";
  src: url("${staticFile(font.file)}") format("truetype");
  font-weight: ${font.weight};
  font-style: normal;
  font-display: swap;
}`,
    )
    .join("\n");
  document.head.appendChild(style);
}

export const colors = {
  canvas: "#f7f8f3",
  ink: "#151922",
  muted: "#747982",
  weak: "#b6bbb5",
  line: "rgba(28,38,54,0.10)",
  lineStrong: "rgba(28,38,54,0.14)",
  accent: "#2f6fff",
  topbar: "#202024",
  topbarMuted: "rgba(255,255,255,0.62)",
  topbarSeparator: "#8a8a86",
  gridLine: "rgba(44,58,78,0.30)",
  gridLineStrong: "rgba(47,111,255,0.26)",
  gridWarm: "rgba(235,178,82,0.24)",
  glass: "rgba(255,255,255,0.74)",
  white: "#ffffff",
};

export const fonts = {
  sans: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  mono: '"Space Grotesk", "SFMono-Regular", "Menlo", "Consolas", monospace',
};

export const layout = {
  width: 1920,
  height: 1080,
  fps: 30,
  topbarHeight: 68,
  // 没 PIP，bottom 可以压得更低，主舞台让给图片
  safeTop: 196,
  safeX: 120,
  safeBottom: 180,
  captionBottom: 88,
};
