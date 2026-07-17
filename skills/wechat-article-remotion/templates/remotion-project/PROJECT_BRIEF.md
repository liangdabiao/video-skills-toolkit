# 项目说明

## 输入素材

- 公众号文章 URL：`__ARTICLE_URL__`
- 抓回的原文图：`public/assets/article-images/`
- 目标时长：`__DURATION_SECONDS__` 秒
- TTS 配音：`__AUDIO_PATH__`

## 下一步

1. 跑 `scripts/fetch_article.py --url <URL> --out-dir .` 抓文章 + 下载图 + PIL 读宽高
2. 在本会话里用 LLM 按 `references/beat-checklist.md` 拆稿，输出 scenes/captions/chapters 到 `src/demoData.ts`
3. 跑 `scripts/generate_tts.py --script work/script.md --out-dir .` 生成 voice.m4a
4. 用 ASR 对齐字幕回写到 `src/demoData.ts` 的 captions time
5. `npm run typecheck / still / render:preview` 校验
6. 抽帧审计：每场景「开始 0.3s」+「中段」两帧，重点查图片 contain 不裁切、关键词不先于字幕
7. 用户确认后 `npm run render` 出最终 mp4
8. 沉淀经验到 `work/lessons/LESSONS.md`

## 常用命令

```bash
npm install
npm run typecheck
npm run still
npm run render:preview
npm run render
```
