# 文章 → 视频 beat checklist 模板

把任意一篇公众号文章拆成 6-12 个 scene 时，按这张 checklist 走。它强迫你在拆稿前先想清楚"画面动什么 + 口播说什么 + 哪张图对应哪段"，避免漏掉文章里的关键桥段导致画面成提纲。

## 步骤 0：通读原文

读 `work/source/article.md`，先不管排版。问自己：

- 文章核心主题是什么？（一句话能说清）
- 作者想让读者带走什么？（3 个以内 key points）
- 最有信息密度的图是哪几张？

把这三件事写在 `work/source/notes.md` 顶部。

## 步骤 1：列 beat checklist

把文章的关键桥段逐条列出来。一段口播 = 一个 beat（≈ 1 个 scene 的容量）。每个 beat 必须包含以下字段：

```text
[Beat N] <类型>
  关键内容：原文核心句（≤ 30 字）
  画面主张：用哪个 scene kind 表达（cover/list/stat/compare/outro/article-image）
  对应图：images.json 里的哪张图（仅 article-image 用）
  字幕关键短语：3-5 个字，画面主标语
```

**类型只有这几种**：

| 类型 | 含义 | scene kind |
|---|---|---|
| 钩子 | 开头抓人 | `cover` |
| 背景 | 故事/问题/现象 | `list` / `article-image` |
| 论点 | 文章核心观点 | `list` / `stat` |
| 数据 | 数字、对比、benchmark | `stat` / `compare` |
| 案例 | 具体例子、用户故事 | `article-image` |
| 转折 | "但是""其实" | `list` / `compare` |
| 总结 | 收尾 key points | `list` |
| CTA | 关注、转发、原文链接 | `outro` |

## 步骤 2：检查 6-12 个 scene 配额

| 文章长度 | 建议 scene 数 |
|---|---|
| 短文（< 1000 字） | 6-8 |
| 中等（1000-3000 字） | 8-10 |
| 长文（> 3000 字） | 10-12 |

如果超过 12 个，把同主题的 beats 合并。如果少于 6 个，补充过渡 beat。

**版式不能连续 2 个相同**：cover → list → article-image → list → stat → outro 这种交错。

## 步骤 3：每个 article-image beat 必填

对每个 `article-image` beat：

- 必填 `imageSrc`：从 `work/source/images.json` 选 `imageAspect` 合适的图
- 必填 `title`：用一两个关键词
- 必填 `source`：「图源：公众号 / 章节名」
- 必填 `caption`：≤ 14 字的解读
- 必填 `appearAt / titleAppearAt / captionAppearAt`：错开 0.18s

**强制规则**：
- 每个 `article-image` 必须出现在文中实际有图的位置，不能凭空
- 同一张图不能在两个 scene 重复出现
- 长截图（`imageAspect < 1.0`）和方图（`1.0 ≤ imageAspect < 1.78`）按高优先；宽图按宽优先

## 步骤 4：字幕 cue 编排

每个 scene 的字幕从对应口播短语推导：

```text
scene.start                ← 字幕第一段起点（scene 切换帧）
scene.start + 0.5          ← 主标题对应的口播
scene.start + 1.2          ← 第一个 list item 对应的口播
scene.start + 2.0          ← 第二个 list item
...
```

字幕 cues 必须按 scene 顺序、scene 内部按时间顺序。

## 步骤 5：拆稿自检

写完 `src/demoData.ts` 后，逐项检查：

- [ ] scene 数 6-12
- [ ] 没有任何 scene 凭空使用没在原文出现的内容
- [ ] 任何带"图"的 beat 都对应了 `work/source/images.json` 里的实际文件
- [ ] 任何 `article-image` 的 `imageAspect` 与 `images.json` 一致
- [ ] `article-image` 的 `object-fit: contain` 铁律没被改
- [ ] 同版式不连续 3 次
- [ ] 字幕 cue 落在 `scene.start` 到 `scene.end` 之间
- [ ] 关键词短语 ≤ 5 个字
- [ ] 每 scene 主画面文字元素 ≤ 5

## 示例：3000 字技术评测文章

```text
[Beat 1] 钩子
  关键内容：X 模型发布 6 个月，到底行不行
  画面主张：cover
  对应图：无
  字幕关键短语：X 模型半年实测

[Beat 2] 背景
  关键内容：背景交代 + 三个使用场景
  画面主张：list
  对应图：无
  字幕关键短语：三个真实场景

[Beat 3] 案例
  关键内容：第一个场景的实际效果截图
  画面主张：article-image
  对应图：img-02.jpg（imageAspect=1.5）
  字幕关键短语：实测一

[Beat 4] 数据
  关键内容：benchmark 数字
  画面主张：stat
  对应图：无
  字幕关键短语：得分 89.5

[Beat 5] 对比
  关键内容：X vs Y
  画面主张：compare
  对应图：无
  字幕关键短语：性价比

[Beat 6] 案例
  关键内容：第二个场景对比图
  画面主张：article-image
  对应图：img-05.jpg（imageAspect=2.1）
  字幕关键短语：实测二

[Beat 7] 转折
  关键内容：但有三个坑
  画面主张：list
  对应图：无
  字幕关键短语：三个坑

[Beat 8] 案例
  关键内容：坑一截图
  画面主张：article-image
  对应图：img-08.jpg（imageAspect=0.6，长图）
  字幕关键短语：坑一

[Beat 9] 总结
  关键内容：谁适合用
  画面主张：list
  对应图：无
  字幕关键短语：适合谁

[Beat 10] CTA
  关键内容：关注、转发
  画面主张：outro
  对应图：无
  字幕关键短语：关注公众号
```

→ 10 个 scene，含 3 个 `article-image`、1 个 `cover`、3 个 `list`、1 个 `stat`、1 个 `compare`、1 个 `outro`。版式交错：cover → list → article-image → stat → compare → article-image → list → article-image → list → outro。✅
