# __PROJECT_TITLE__

Remotion 版 Studio 口播视频模板。初始 demo 刻意只有"空舞台"：全画幅上下双层镜像透视格子背景、顶部章节进度条、右下角圆形 PIP 框、无底色黑字字幕示例。中间舞台不预填内容——场景等拿到真实脚本和对齐音频后，按字幕逐元素填充（可用的布局模式见 `src/StudioTalkingHead.tsx` 的场景类型）。

## 常用命令

```bash
npm install
npm run studio
npm run typecheck
npm run still
npm run render:preview
npm run render
```

`npm run still` 会输出 `renders/frame-030.png`，用于快速检查布局。`npm run render:preview` 会输出低清 proof `renders/preview-low.mp4`，先用它检查整条时间线、字幕、音频和节奏。只有低清 proof 确认后，再用 `npm run render` 输出正式版 `renders/demo.mp4`。

## 入口

- Remotion composition：`src/StudioTalkingHead.tsx`
- composition 注册：`src/Root.tsx`
- demo 数据：`src/demoData.ts`
- 设计变量和非阻塞字体注册：`src/theme.ts`

## 替换素材

- 口播视频：`public/media/talking-head/talking-head.mp4`
- 人声：`public/assets/audio/voice.m4a`
- 字体：`public/assets/fonts/`
- 截图：`public/assets/screenshots/`
- SFX：`public/assets/audio/`
- BGM：`public/assets/music/`
- 可复用动效组件：从 skill 素材库 `assets/library/animations/` 拷进 `src/library/` 使用

修改 `src/demoData.ts` 里的 `voiceAudio`、`talkingHeadVideo`、`scenes`、`captions` 和 `chapters` 后重新预览。
