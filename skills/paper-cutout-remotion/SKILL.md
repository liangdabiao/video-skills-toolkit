---
name: paper-cutout-remotion
description: 用 Remotion 制作「纸片分层动画」视频：把背景、主角、配角、前景分别做成独立 PNG 素材，再让每一层按不同节奏运动，靠前后遮挡制造纵深。图片素材用 apiz CLI（nano-banana-pro）生成 + 绿幕抠图，配音用 MiniMax（apiz speak / 直连 fallback）。当用户要制作纸片风/剪纸风/拼贴风分层动画视频、把一份分镜脚本变成可逐帧控制的纸片风格视频、或修改已有纸片风项目时，必须使用这个 skill。触发词：纸片风视频、纸片分层动画、剪纸风视频、拼贴动画、paper cutout、collage video。
---

# Paper Cutout Remotion（纸片风分层动画）

把一份分镜脚本变成纸片分层风格的 Remotion 视频。核心方法论：**不是生成一张漂亮图加镜头移动，而是把画面拆成背景/后排/主体/前景四层独立素材，让每层按不同节奏运动，靠前后遮挡制造纵深立体感。**

这套方法不只适合历史题材。只要画面能拆成"背景、主角、配角、前景"——历史人物、知识科普、商业故事、人物关系、城市发展——都能用同样的流程制作。

**工具链**：apiz CLI（图片生成）+ Python/Pillow/NumPy（绿幕抠图拆层）+ MiniMax（apiz speak 配音，直连 API fallback）+ Remotion（React 控制图层/动画/字幕/渲染）+ FFmpeg（验收）。

**配套参考**：
- 组件 API 速查：`references/components.md`
- 四层拆分方法论：`references/layering.md`（纸片风的灵魂，必读）
- apiz 提示词配方：`references/prompt-recipes.md`

## 新项目工作流（10 步）

按以下顺序执行，每步完成再做下一步。顺序乱了会导致素材比例错误、抠图失败、主次不清。

### 1. 确定镜头（不要直接画图）

先定镜头，不要先画图。同一个人物在全景和特写里的大小、位置、朝向都不同，先随便生成素材，后面必然返工。

每个镜头先回答：**谁最大？配角在哪？地平线在哪？**
- 全景镜头：交代规模（如"盛唐长安"，皇帝最大居中，群臣最小）
- 特写镜头：表现情绪/动作（如"万邦来朝"，中央人物最大，前排跪拜次之）

### 2. 把每个镜头拆成四层

见 `references/layering.md`。每个镜头至少拆成：
- **背景层**（山水/宫殿/纸纹，无人物）
- **后排层**（远处群臣/侍从，tertiary）
- **主体层**（主角，primary，最大）
- **前景层**（近处人物/装饰，secondary，遮挡制造纵深）

### 3. 脚手架

```bash
mkdir "<VIDEO_WORKSPACE>/<项目名>"
cp -R "./skills/paper-cutout-remotion/templates/remotion-project/" \
      "<VIDEO_WORKSPACE>/<项目名>/"
cd "<VIDEO_WORKSPACE>/<项目名>" && npm install
```
⚠️ 用原生 `npm install`，不要 `rtk npm install`（rtk 会翻译成 `npm run install` 报错）。

在项目根建素材目录：
```bash
mkdir -p public/assets/plates public/assets/layers public/assets/source
mkdir -p public/audio/narration public/audio/sfx
```

### 4. 生成无人物背景底板（gen_plates.py）

背景底板只保留环境（山水/宫殿/纸纹/撕纸边缘/装饰）。**绝对不要把主要人物画进背景**——画进去就没法独立飞入、摇摆、调整大小了。

```bash
# 单张
python scripts/gen_plates.py "唐代长安宫殿全景，水墨远山，宣纸纹理，撕纸边缘" \
    public/assets/plates/01-tang-wide-bg.png

# 批量（plates_spec.yaml）
python scripts/gen_plates.py --batch plates_spec.yaml public/assets/plates/
```
脚本会自动追加"无人物"约束。提示词配方见 `references/prompt-recipes.md`。

### 5. 生成角色素材表（gen_characters.py）

角色用纯绿背景生成（方便后续 chroma key 抠图）。提示词必须强制：朝向、完整全身、白色剪纸描边、纯绿背景、无文字水印。脚本会自动追加这些约束。

```bash
# 先写 assets_spec.yaml（角色清单，见 scripts/gen_characters.py 注释）
# dry-run 检查提示词
python scripts/gen_characters.py assets_spec.yaml public/assets/source/ --dry-run
# 实际生成
python scripts/gen_characters.py assets_spec.yaml public/assets/source/
```

### 6. 绿幕抠图 + 拆独立 PNG（split_sheet_green.py）

把带绿背景的素材表抠成透明 PNG，多人素材表按网格拆成独立文件。

```bash
# 单人物（只抠图不拆）
python scripts/split_sheet_green.py public/assets/source/emperor.png \
    public/assets/layers emperor 1

# 6 人群臣素材表（自动推算网格）
python scripts/split_sheet_green.py public/assets/source/ministers.png \
    public/assets/layers minister 6
# 显式 3 列 2 行
python scripts/split_sheet_green.py public/assets/source/ministers.png \
    public/assets/layers minister 6 --cols 3 --rows 2
```

抠完后检查 `*-full-alpha.png`（完整抠图结果）确认绿幕干净、边缘没有绿残留。若有绿残留，调大 `split_sheet_green.py` 的 `EDGE_FEATHER`，或提示词强化 "pure flat solid green, no gradient"。

### 7. 静态排版（先排版，再加动画）

不要一拿到素材就加动画。先在 `scenes.tsx` 里把所有人物**静止摆好**，检查：
- 主角是不是最大、最醒目？
- 配角有没有挡住主角的脸、手、关键道具？
- 所有人物脚底是不是落在同一个合理地面上？
- 朝向是否符合场景关系？

只改 `src/scenes.tsx`（场景组件）和 `src/Root.tsx`（SCENES 表）。**不要改** `theme.ts` / `ui.tsx` / `cutout.tsx`（风格锁定文件）。

### 8. 设 zIndex 遮挡 + roleMotion 错峰动画

按四层模型分配 zIndex（背景 0 / 后排 1-2 / 主体 3-4 / 前景 5-6 / 文字 10+），给每个 `PaperActor` 设 `role` 和 `delay`：

```tsx
// 主角先出（delay 4），配角补充（delay 16-22），后排填充（delay 30-40）
<PaperActor src="assets/layers/emperor.png" x={960} y={920} width={650}
            role="primary" delay={4} zIndex={3} seed="s2emp" />
<PaperActor src="assets/layers/maid-left.png" x={620} y={900} width={240}
            role="secondary" delay={18} zIndex={5} seed="s2maid1" />
<PaperActor src="assets/layers/minister.png" x={1500} y={860} width={165}
            role="tertiary" delay={34} zIndex={1} seed="s2min1" />
```

背景套 `<BackgroundPan>` 做 1-3% 慢速推镜。详细层级规范见 `references/layering.md`。

### 9. 配音 + 字幕 + 音效（gen_tts.py）

画面完成后，按场景生成旁白，用真实时长切镜头。

```bash
# 写 narration.yaml（见 scripts/gen_tts.py 注释）
python scripts/gen_tts.py narration.yaml --out-dir public/audio/narration
```

产出 `s01.mp3 s02.mp3 ...` + `timeline.json`（含 `frames_playback`）。
- 优先 apiz speak（统一鉴权，内置下载）
- 失败 fallback 直连 `api.minimaxi.com/v1/t2a_v2`（从 `.env` 读 `minimaxi=KEY`）

用 timeline.json 的 `frames_playback` **回写 Root.tsx 的 SCENES 表 frames**，并在每场 Sequence 里挂 `<Audio src={staticFile('audio/narration/sNN.mp3')} />`。

音效分层（按需求原文）：
- 旁白：每段一个 mp3，直接决定镜头时长
- BGM：循环播放，音量在人声下方（`<Audio src={staticFile('audio/bgm.wav')} loop volume={0.3} />`）
- 入场音效：主角 `sfx/impact.wav`，次要 `sfx/whoosh.wav`，后排 `sfx/tick.wav`

### 10. 预览 + 验收 + 渲染

```bash
npm run dev          # Remotion Studio 逐帧预览
npx tsc --noEmit     # 类型检查（长渲染前必做）
# 抽帧检查排版（每场接近结尾的静帧）
npx remotion still Episode --frame=<场景末帧-30> out/check-N.png
npm run render       # 渲染 MP4
ffprobe -v error -show_streams -show_format out/episode.mp4   # 验收
```

## 风格 DNA（不可变）

| 项 | 值 |
|---|---|
| 画布 | 1920×1080 @ 30fps，宣纸米白底 `#f3ead6` |
| 四层模型 | 背景(z0) → 后排(z1-2) → 主体(z3-4) → 前景(z5-6) → 文字(z10+) |
| roleMotion 三档 | primary(78/55/0.86) / secondary(58/38/0.90) / tertiary(38/22/0.95) |
| 白边+投影 | `drop-shadow(4向 #f5eedc) + drop-shadow(0 18px 9px rgba(20,15,12,.32))`（PAPER_FILTER，四项缺一不可） |
| 墨色 | `#1f1a14`（暖墨黑，标题/描边） |
| 强调色 | 朱砂红 `#b8322a` / 蓝 `#2f5d8a` / 橙 `#c8732a` / 绿 `#3f7a3a` / 金 `#b8893a` |
| 字体 | 标题/正文宋体栈 `Source Han Serif SC`；字幕黑体栈（小字可读性） |
| 素材 | 真实 PNG（apiz 生成 + 绿幕抠图），**不是**纯代码绘制 |
| 图片生成 | apiz CLI，默认 `fal-ai/nano-banana-pro`（最适合纸片/插画风） |
| 配音 | MiniMax，apiz speak（`speech-2.8-hd`）/ 直连 fallback（`speech-02-hd`），默认 `female-shaonv` |

## 素材目录规范

```
public/
├── assets/
│   ├── plates/        # 背景底板（无人物，gen_plates 生成）
│   │   ├── 01-tang-wide-bg.png
│   │   └── 02-tang-close-bg.png
│   ├── source/        # 原始绿背景素材表（gen_characters 生成，抠图前）
│   │   └── ministers.png
│   └── layers/        # 抠好的透明角色 PNG（split_sheet 产出，scenes.tsx 引用这里）
│       ├── emperor-1.png
│       └── minister-1.png ...
├── audio/
│   ├── narration/     # 旁白 mp3 + timeline.json（gen_tts 产出）
│   ├── sfx/           # 入场音效 impact/whoosh/tick.wav
│   └── bgm.wav        # 背景音乐
└── captions/          # （可选）SRT 字幕
```

## 验收清单（渲染前必过）

- [ ] **主次分明**：主角最大（约为后排 4 倍宽），配角不平均分布
- [ ] **无遮挡穿帮**：配角没挡住主角的脸/手/关键道具；朝向符合场景关系
- [ ] **脚底同地面**：所有人物 y 坐标落在同一合理地平线
- [ ] **错峰入场**：角色按 primary→secondary→tertiary 顺序出场，不同时出现
- [ ] **白边+投影**：每个 PaperActor 都带 PAPER_FILTER（剪纸感 + 立体感）
- [ ] **音画同步**：音效和人物入场帧对齐；字幕跟随旁白逐句
- [ ] **字幕单层**：底部一层，不重复，不挡人物脚部
- [ ] **FFmpeg 抽帧**：每场渲接近结尾的静帧，检查上述各项
- [ ] **绿幕干净**：抠图后边缘无绿残留（检查 `*-full-alpha.png`）

## 常见坑

- **rtk npm install 会失败**，用原生 `npm install`。
- **先画图后定镜头**必返工——人物比例/朝向/主次全错。务必先定镜头再生成素材。
- **人物画进背景**就废了——背景底板必须无人物，否则没法独立飞入。
- **绿幕不纯**（有渐变/阴影）→ 抠图绿残留。提示词强化 "pure flat solid green, no gradient, no shadow on background"，或调大 `EDGE_FEATHER`。
- **apiz 错误是单行 `Error:` 非 JSON**，returncode≠0 时 `lib_apiz._run_apiz` 直接抛 stderr。
- **model 名不一致**：apiz speak 用 `speech-2.8-hd`，直连 minimaxi API 用 `speech-02-hd`。两个脚本已分别用对的名字。
- **apiz 余额不足**（实测可能很低）→ gen_tts 自动 fallback 直连；gen_plates/gen_characters 失败需充值，或换其他绘图模型。
- **`apiz generate --json` 的图片 URL 路径首次需校准**：`lib_apiz.extract_image_url()` 多路径兜底，首次失败时看 `.last_generate.json` 把实际字段加到兜底列表最前。详见 `references/prompt-recipes.md` 末尾。
- **seed 重复会让漂浮同步**——每个 PaperActor 的 seed 带场景前缀+编号（`s2emp`、`s2maid1`）。
- **前景 zIndex 必须大于主体**——前景遮挡主体才制造纵深，不是反之。见 `references/layering.md`。
- **人物头顶出画（最易犯的排版错）**：PaperActor 的 y 是脚底，人物显示高度 = `width × (图片高/宽比)`。竖长条人物（高/宽常 2.3~2.6）很容易头顶超出 1080 画布。设坐标前先算：`width × 高宽比 ≤ y - 60`（留 60px 头顶余量）。例如高/宽=2.4、y=1030，则 width ≤ (1030-60)/2.4 ≈ 404。不确定时用 Python 量真实尺寸：`Image.open(path).getbbox()`。
- **单人物抠图命名**：`split_sheet_green.py` 对 count=1 输出 `<prefix>-1.png`（带 -1 后缀）。scenes.tsx 引用时要么用 `-1` 后缀，要么抠完后重命名去掉。多人素材表则天然是 `<prefix>-1.png ~ <prefix>-N.png`。
- **Chrome Headless Shell 下载慢/失败**（国内访问 storage.googleapis.com 不稳定，113MB 易超时）：模板的 `remotion.config.ts` 已配置自动检测本机 Chrome（`C:/Program Files/Google/Chrome/Application/chrome.exe`），跳过下载。换机器若 Chrome 路径不同，改这个配置。
- **音频混合失败（audio-mixing 目录缺失）**：根因是并发渲染竞争 Windows temp 目录。模板已设 `Config.setConcurrency(2)` 规避。⚠️ **绝对不要同时跑多个 `remotion render`**（前台+后台并发会触发此问题）。一次只跑一个渲染任务。参考成功案例 `demo-wx-article-3`（同款配置，带音频渲染正常）。`<Audio>` 组件要显式传 `volume={1}`。
- **不要停留在无配音估时版**——真实 TTS 生成后必须用 timeline.json 回写一版 frames。
- **旁白被截断（没说完就切场）**：根因是帧数字段用错。`timeline.json` 有两个字段：
  - `frames_source` = `ceil(音频秒×30)+15`：原速音频实际需要的帧数（含 0.5s 收尾缓冲）
  - `frames_playback` = `ceil(frames_source/1.2)`：1.2x 加速后的压缩帧数
  **关键**：如果音频是**原速播放**（没加 `playbackRate={1.2}`），SCENES 表的 `frames` 必须用 `frames_source`，不能用 `frames_playback`。否则每段场景比音频短 1~2 秒，旁白没说完就被 FadeScene 淡出切场。只有当音频挂了 `<Audio ... playbackRate={1.2} />` 时才用 `frames_playback`。古诗词等需要慢速韵味的场景建议原速。
- **apiz URL 已校准（实测）**：`apiz generate --json` 成功后图片 URL 在 `result.images[0].url`，`lib_apiz.extract_image_url()` 已命中此路径，无需再手动校准。图片是公网 CDN（cdn-hk.51sux.com），urllib 直接下载即可。

## 适用范围

这套方法只要画面能拆成"背景、主角、配角、前景"就适用：
- 历史人物 / 朝代叙事（唐/宋/明…）
- 知识科普（人物 + 概念图解）
- 商业故事（创始人/产品/用户分层）
- 人物关系（家谱/组织/社交网络）
- 城市发展（地标 + 人物 + 场景）

真正让纸片动画有层次的，不是多生成几张图，而是让每张图都承担明确的叙事位置。
