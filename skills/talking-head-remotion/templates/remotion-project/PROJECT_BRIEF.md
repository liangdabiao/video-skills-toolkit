# 项目说明

## 输入素材

- 脚本：`__SCRIPT_PATH__`
- 口播视频：`__TALKING_HEAD_PATH__`
- 人声音频：`__AUDIO_PATH__`
- 目标时长：`__DURATION_SECONDS__` 秒

## 下一步

1. 如果没有 `public/assets/audio/voice.m4a`，先从 `public/media/talking-head/talking-head.mp4` 提取人声。
2. 检查人声开头是否有静音或偏移；必要时先生成对齐后的 voice/PIP 资产。
3. 把最终对齐后的音频转写到 `work/captions/captions_aligned.json`。
4. 对照脚本和真实音频校正字幕。
5. 替换 `src/demoData.ts` 里的占位 captions，并按字幕逐元素填充 scenes（初始为空）。
6. 主画面只放关键词，不要把完整字幕搬上屏。
7. 先预留音效/BGM 位置，但等场景和动画稳定后再锁定声音。
8. 用 Remotion 校验并渲染草稿。
9. 用户反馈修改后，更新 `work/lessons/LESSONS.md`。

## 常用命令

```bash
ffmpeg -y -i public/media/talking-head/talking-head.mp4 -vn -c:a aac public/assets/audio/voice.m4a
npm install
npm run typecheck
npm run still
npm run render
```
