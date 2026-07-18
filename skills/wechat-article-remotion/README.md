# WeChat Article Remotion · 公众号文章转视频

把任意一篇微信公众号文章（mp.weixin.qq.com）转成 Studio 风格的 Remotion 视频。主舞台给足空间给图片和文字，**完全没有 PIP**。

> 公众号图片里的文字信息是原文的一部分。裁掉它，就是裁掉了作者想传达的东西。所以 article-image 场景的铁律是：object-fit: contain，永不裁切。

---

## 这是什么

一条把公众号文章变成可发布视频的完整流水线，适合：

- 📰 把深度公众号文章做成视频二次分发
- 📚 知识类 / 观点类文章的视频化
- 🔬 带大量截图、数据图、信息图的文章
- 🎬 任何想"把文章读出来给人看"的场景

## 核心原理：图片完整保留 + 无 PIP 大舞台

很多人做"文章转视频"，就是把文章截图怼上去，或者用 AI 重新画一张图替代原文图。前者敷衍，后者丢信息。

**这个 skill 的两个核心决策：**

1. **公众号原文图完整保留（object-fit: contain）** —— 图片里的文字、标注、数据图表，全部原样呈现，永不裁切。因为很多公众号长图的信息密度比正文还高。
2. **取消 PIP，主舞台全给内容** —— 口播视频才需要人像 PIP，文章转视频的主角是文章本身。把右下角的圆去掉，图片和文字有更大的呼吸空间。

## 端到端流水线

```
用户给一个公众号链接
    │
    ▼
[1] fetch_article.py 抓文
    · ideaflow API → markdown
    · 提取并下载所有原文图
    · PIL 读取每张图宽高比 → imageAspect
    │
    ▼
[2] 运行时 LLM 拆稿
    · 按 beat checklist 拆 6-12 个场景
    · 输出 scenes[] / captions[] / chapters[]
    │
    ▼
[3] generate_tts.py 生成配音
    · 调 audio-to-subtitles CLI
    · 输出 voice.m4a / voice.mp3 / captions.srt
    │
    ▼
[4] 用真实音频时长回写时间轴
    │
    ▼
[5] Remotion 渲染
    · 低清 proof → 确认 → 高清出片
```

## 快速开始

```bash
python3 skills/wechat-article-remotion/scripts/fetch_article.py \
  --url "https://mp.weixin.qq.com/s/xxxxx" \
  --out-dir ./demo-wx-article

cd demo-wx-article
npm install
npm run still
```

## 6 个场景类型

| kind | 用途 | 典型内容 |
|---|---|---|
| `cover` | 开头标题 | 文章标题 + 副标题 + eyebrow 标签 |
| `list` | 步骤 / 要点 / 清单 | 3-5 条要点，每条一个图标 |
| `stat` | 数据 / 金句 | 一个大数字 + 补充指标 |
| `compare` | 对比 / 二选一 | A/B 两列对比 |
| `outro` | 结尾 CTA | 引导关注 / 下集预告 |
| **`article-image`** | **公众号原文图展示** | **大图 + 标题 + 图注，object-fit: contain 永不裁切** |

`article-image` 是这套模板和 talking-head 最大的区别——它是为公众号文章量身定做的场景。

## 风格 DNA（不可变）

| 项 | 值 |
|---|---|
| 画布 | 1920×1080 @ 30fps，暖白 `#f7f8f3` |
| 背景 | 上下镜像透视格子 |
| 顶栏 | 黑色章节进度条（白色填充） |
| 字幕 | 底部无底色黑字，关键词 `#2f6fff` 蓝色加粗 |
| PIP | **无** |
| 字体 | Noto Sans SC / Space Grotesk（与 talking-head 共用） |
| 硬规则 1 | 公众号图片永远 `object-fit: contain`，永不裁切 |
| 硬规则 2 | 每屏 ≤ 5 个文字元素 + 至少一个非文字视觉主体 |

## 与 talking-head-remotion 的关系

| 维度 | talking-head | wechat-article |
|---|---|---|
| 场景数 | 5 | 6（+ article-image） |
| PIP | 右下圆形 206px | 无 |
| 视觉调性 | Studio 暖白 | Studio 暖白（一致） |
| 公共素材库 | 字体/SFX/动效组件 | 完全共用 |

## 更多资源

- 完整拆稿 checklist、硬规则、场景数据结构 → [`SKILL.md`](SKILL.md)
- 场景类型详细字段 → [`references/scene-types.md`](references/scene-types.md)
