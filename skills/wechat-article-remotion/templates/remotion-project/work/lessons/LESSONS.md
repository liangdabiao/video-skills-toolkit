# WeChat Article Remotion — 经验沉淀

## 端到端跑通

- 脚手架能正常从 talking-head-remotion 公共库播种字体（Noto Sans SC / Space Grotesk）和 SFX（7 个 mp3）
- `npm install` 一次成功（187 包）
- `npm run typecheck` 零错误（修了 1 个 import 转发的坑）
- `npm run still` cover 场景和 article-image 场景都成功渲染

## 关键修复

### `ArticleVideoProps` import 转发

最初 demoData.ts 和 Root.tsx 从 `./ArticleVideo` import `ArticleVideoProps`，但实际定义在 `./sceneTypes.tsx`。两种修法：
1. 从 ArticleVideo 转发导出 → 选这个，因为外部 import 路径统一
2. 改 import 路径 → 散在多处，外部要分别知道从哪 import

**结论**：组件文件应该 re-export 它用到的公共类型，外部只 import 一次。

## 铁律验证

- ✅ article-image 场景 `object-fit: contain` —— 1200×800 demo 图按比例完整显示，未裁切
- ✅ 图源标签在右下角 + 呼吸动效
- ✅ 主画面元素 ≤ 5（eyebrow + 标题 + 图 + caption + 图源）
- ✅ 顶栏章节进度、底部无底色字幕
- ✅ 无 PIP —— 主舞台完全给图片

## 演示数据

- 默认 demoProject 包含 4 个 scene：cover / article-image / list / outro
- article-image 场景用 `img-01.jpg`（占位 1200×800）
- 用户实际使用时只需替换 demoData.ts 即可

## 后续改进方向

1. **article-image-stack 场景**：当前只有单图版本；多图（左/右双联、上下双联）可以扩展，参考 [scene-types.md 6](../references/scene-types.md) 提到的"未来版本"
2. **真实文章跑通**：当前只验证了骨架，没有跑通真实公众号 URL（ideaflow API 需要外网）
3. **音画同步工具**：用 audio-to-subtitles 的 ASR 对齐字幕时，建议写一个 `align_captions.py` 把 SRT 转成 demoData.ts 的 `captions[]` 数组格式
4. **国际化**：按 user_profile 偏好先不做；如果要做，建议把 `RichText` 抽象成 `<T>` 组件支持多语言 fallback
