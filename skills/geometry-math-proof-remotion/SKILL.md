---
name: geometry-math-proof-remotion
description: 用 Remotion 制作数学证明/几何动画视频:深底高饱和 + 精准 SVG 几何 + 公式逐步揭示 + 字幕驱动时间轴,3Blue1Brown/可汗风格。当用户要把数学证明文档(勾股定理、欧拉公式、积分…)、几何推导、代数恒等式、算法可视化做成精准几何风格的视频时,必须使用这个 skill。触发词:数学证明视频、几何动画、3Blue1Brown 风格、公式推导视频、勾股定理、加菲尔德证法、Pythagorean proof、math visualization。
---

# Geometry Math Proof Remotion (精准几何证明视频)

把数学证明文档(markdown)变成深底精准几何风格的 Remotion 视频。几何全部代码绘制(SVG + stroke-dash 描边),公式逐行揭示,字幕驱动时间轴。

**规范样板**:`<VIDEO_WORKSPACE>/pythagorean-garfield-proof/` 是首集成品工程。遇到拿不准的版式/节奏/坐标问题,先看它的 `src/GarfieldProof.tsx`,不要凭空发挥。

## 新一集工作流

1. **读源文档**。把证明拆成 6~10 个章节,每个章节一个视觉主意:
   - 钩子:抛出要证的命题,大字公式 + 悬念副标题
   - 准备:介绍构造(三角形/线段/多边形),引入变量 a/b/c…
   - 推导 1~N:每章只证一件事(局部面积、整体面积、某次代数化简…)
   - 消项/合成:把局部结果拼成最终等式
   - 收尾:boxed 结论 + 历史/人物/扩展署名

2. **列证明检查表**。先把源文档里的关键步骤列成 beat checklist:
   - 每个变量定义(a 是什么、b 是什么)
   - 每个几何构造(哪几个点拼成哪个三角形)
   - 每个面积/角度计算
   - 关键代数步骤(展开、消项、平方)
   - 最终结论 + 历史署名
   后续写 LINES 时用这张表防止把证明压成"口播三句话完事"。

3. **写 LINES,跑 TTS**。打开 `scripts/generate_tts.py`,把 LINES 替换成本证明的章节台词。每行 `{"id", "chapter", "text"}`。运行:
   ```bash
   python scripts/generate_tts.py
   ```
   产出 `public/assets/audio/voice.mp3`、`work/captions/captions_aligned.json`、`work/captions/captions.srt`。

4. **回写 F 时间轴**。从 `captions_aligned.json` 的 `lines` 拿每章末帧,写到 `src/geometry.tsx` 的 `F` 对象。同步把 `Root.tsx` 的 `durationInFrames` 改成 `total_frames`。**不要停留在无配音估时版本**。

5. **脚手架**:
   ```bash
   mkdir "<VIDEO_WORKSPACE>/<new-proof>"
   cp -R "./.claude/skills/geometry-math-proof-remotion/templates/remotion-project/" \
         "<VIDEO_WORKSPACE>/<new-proof>/"
   cd "<VIDEO_WORKSPACE>/<new-proof>" && npm install
   ```
   ⚠️ 用原生 `npm install`,不要 `rtk npm install`(rtk 会翻译成 `npm run install` 报错)。

6. **改 Proof.tsx**:
   - 几何坐标:根据本证明的图形定义关键点 `const A = pt(0,0), B = pt(3,0)…`
   - CAPTIONS:从 captions_aligned.json 的每行 `text` 拆出关键词(标 `tone: 'accent'`),其他作为普通文字
   - STEPS:FormulaStep 列表,`from` 帧对齐到对应章节的中段
   - HookOverlay / EndingOverlay 的 title/result 用大字公式,attribution 写历史/人物
   不要改 `geometry.tsx`/`formula-panel.tsx`/`caption-strip.tsx`/`hooks-overlay.tsx`(风格锁定文件)。如需新组件,在新文件里加,不要改通用文件。

7. **验证循环**(必须做):
   - `npx tsc --noEmit`
   - 渲接近每章结尾的静帧逐一检查:
     ```bash
     npx remotion still src/index.ts Proof --frame=<章末帧-30> out/check-N.png
     ```
     读图检查:文字溢出 SVG 框、几何元素重叠遮挡、字幕压住关键标签、公式行列错位
   - 关键词同步抽查:每条 LINES 的关键词(accent 部分),渲染"出现前 0.5s"和"出现后 0.5s"两帧;前帧不能露出,后帧只能露出已说到的词
   - `npm run render:preview` 出 `renders/preview-low.mp4`(scale=0.5),用户确认后再 `npm run render` 出 `renders/final-1080p.mp4`

## 证明忠实度

- 源文档是证明,不是提纲。改成视频可以合并相近句子,但不能跳步导致推导链条断裂。
- 保留"承接步骤"。例如:不能直接抛"面积是 c²/2",必须先有"两腰都是 c"做承接。
- 旁白可以精简,但必须保留推导的因果推进:构造 → 局部 → 整体 → 消项 → 结论。
- 若必须删减,先列出将删掉的 beat,确认它不是后文所需的逻辑桥。
- TTS 前对照 beat checklist 逐条检查,确认没漏关键定义/构造/消项步骤。

## 风格 DNA(不可变)

| 项 | 值 |
|---|---|
| 画布 | 1920×1080 @ 30fps,深底 `#0d0d12` |
| 配色 | 红 `#e74c3c`、蓝 `#3498db`、绿 `#2ecc71`、黄 `#f1c40f`(黄=最终结论/钩子) |
| 字体 | 数学衬线 `Cambria Math`/`STIX Two Math`,中文 `PingFang SC`/`Microsoft YaHei` |
| 几何 | SVG `viewBox 0 0 1100 860`,坐标变换 `pt(gx,gy)`,单位 SCALE=130px/单位 |
| 描边 | 一切线框都用 `strokeDasharray`+`strokeDashoffset` 做"被画出来"动画 |
| 动画 | `fadeIn`(淡入)、`drawIn`(描边渐进)、`fadeOut`(淡出),缓动统一 `bezier(0.4,0,0.2,1)`;**没有**弹跳/旋转/滑入 |
| 字幕 | 底部 110px 字幕条,关键词 `tone:'accent'` 用黄色加粗高亮 |
| 公式 | 右侧 700×820 面板,逐步揭示;最终结论用黄框大字 (`tone:'result'`) |
| 素材 | 全部代码绘制,不用任何位图/图标库/emoji |
| 配音 | MiniMax `speech-2.8-hd`,voice_id `moss_audio_2ecaeaac-5e5a-11f1-99fb-96e792fde6a1`,1.2x 语速 |

## 章节版式约定

- **钩子(H)**:全屏遮罩,黄色大字公式(140px)+ 中文悬念副标题 + 灰色英文署名(年代/作者)。`HookOverlay` 组件,在第二章节开始前 18 帧淡出。
- **准备(P)**:TopBar 显示章节名,SVG 画板开始绘制基础几何元素(三角形/线段),变量标签 a/b/c 在元素描边完成后 30 帧淡入。
- **推导章节(每章一个主意)**:每章只聚焦一个几何元素或一组代数变换;其他元素用 opacity 0.45 暗化;新元素描边 → 填充 → 标签 → 公式同步出现。
- **消项/合成(E)**:右侧公式面板连续推 3~5 步;每步间隔 30~50 帧;最终结论用 `tone:'result'` 黄框大字。
- **收尾(F)**:`EndingOverlay` 全屏遮罩,Q.E.D. 字样 + 黄框公式 + 历史/人物署名(年代、作者、出处)。

## 关键帧节奏

- 一个元素出现 = 描边 36 帧 + 填充淡入 30 帧 + 标签淡入 24 帧
- 一个公式步骤淡入 24 帧
- 字幕条 6 帧淡入/淡出
- HookOverlay/EndingOverlay 30 帧淡入/淡出
- 章节末 30 帧不要再上新元素

## 多音色扩展

默认单旁白。如需多音色(对话式证明),参考 `sketch-story-remotion` 的多音色流程,但保留本 skill 的视觉 DNA。voice_id 映射见 sketch-story。

## 常见坑

- **JSX 中 `²` `₁₂₃` 触发 TS1351**。Unicode No 类字符被 TS 解析为数字字面量后接标识符,在 JSX 文本位置报错。**所有数学文本一律包字符串表达式**:`<span>{'a² + b²'}</span>`,不要写裸文本 `<span>a² + b²</span>`。详见 `references/jsx-unicode-pitfalls.md`。
- **Edit 工具找不到含 `²` 的字符串**。Edit 工具对 Unicode No 字符匹配不稳定。改用 Python 一次性 `str.replace` 或重写整个文件。
- **Remotion 在中国卡 storage.googleapis.com**。`remotion.config.ts` 必须设 `Config.setBrowserExecutable(系统 Chrome)`。Edge 不行(旧 headless flag 已移除)。
- **字幕驱动 frames**。先跑 TTS 拿真实时长再回写 F,不要凭口播长度猜帧数。
- **preview-low → final-1080p 两段式**。先 scale=0.5 给用户确认,再 scale=1 出成片,防返工。
- **`rtk npm install` 失败**。用原生 `npm install`。
- **静帧分析时图像 MCP 可能拒绝**。用肉眼检查或本地 image viewer,不要依赖 analyze_image。

## 参考文档

- `references/composition-patterns.md` — SVG 描边、坐标变换、FormulaPanel 逐步揭示、CAPTIONS accent 拆词的详细模式
- `references/jsx-unicode-pitfalls.md` — `²`/下标的 TS1351 坑、Edit 工具失败、Python 替代方案的完整说明
- 规范样板 `<VIDEO_WORKSPACE>/pythagorean-garfield-proof/src/GarfieldProof.tsx` — 631 行完整实战例子
