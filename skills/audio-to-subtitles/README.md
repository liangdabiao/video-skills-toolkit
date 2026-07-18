# Audio To Subtitles · 音频转字幕 & TTS

把音频 / 视频转成字幕文件（SRT / VTT / JSON），也支持先生成 TTS 语音再转字幕。支持批量、说话人分离、多语言。

> 整条视频流水线的起点不是画面，是声音。而声音的起点要么是 TTS（从文字生成），要么是 ASR（从音频转字幕）。这个 skill 就是管这两件事的。

---

## 这是什么

一个统一的音频处理 CLI，做两件事：

1. **ASR（语音识别）**：把音频 / 视频 / 公网 URL 转成字幕和逐字稿
2. **TTS（语音合成）**：把文字转成语音，可选同步生成字幕

是整个 Video Skills Toolkit 的"音频基础设施"——talking-head、wechat-article、paper-cutout、geometry-math-proof、sketch-story 全都依赖它生成配音和字幕。

## 核心原理：两条管线，一个入口

```
                    ┌─────────────────┐
                    │  audio-to-subtitles  │
                    └─────────┬───────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │                                     │
     ASR 管线                              TTS 管线
           │                                     │
  本地文件 / URL / 批量                    文字 / 文本文件
           │                                     │
  上传 R2（如有必要）                     MiniMax TTS API
           │                                     │
  Volcengine AI MediaKit ASR             生成 mp3 / m4a
           │                                     │
  轮询任务 → 原始结果                   ┌─── 可选：字幕 ────┐
           │                            │   （走同一条 ASR 管线） │
  JSON / SRT / VTT                   └───────────────────────┘
```

## 支持的能力

| 能力 | 说明 |
|---|---|
| 🎙️ ASR 语音识别 | 本地音频 / 视频 / 公网 URL → 字幕 |
| 🔊 TTS 语音合成 | 文字 / 文本文件 → MiniMax 语音 |
| 📄 SRT / VTT / JSON | 三种输出格式，按需选择 |
| 👥 说话人分离 | 多人对话自动分 speaker |
| 🌐 多语言 | 中文 / 英文 / 自动识别 |
| 📦 批量处理 | 多文件 / URL / manifest 文件 |

## 快速开始

### 音频 / 视频转字幕

```bash
SKILL_DIR="./skills/audio-to-subtitles"

# 本地音频文件
npx -y bun "$SKILL_DIR/scripts/main.ts" audio.mp3 --language zh-CN --out-dir subtitles

# 公网 URL（跳过 R2 上传）
npx -y bun "$SKILL_DIR/scripts/main.ts" "https://example.com/audio.mp3" --out-dir subtitles

# 批量处理
npx -y bun "$SKILL_DIR/scripts/main.ts" a.mp3 b.m4a c.mp4 --out-dir subtitles

# 说话人分离
npx -y bun "$SKILL_DIR/scripts/main.ts" interview.mp3 --speaker --language zh-CN
```

### 文字转语音（+ 可选字幕）

```bash
# 只生成音频
npx -y bun "$SKILL_DIR/scripts/main.ts" \
  --text "你好，欢迎收听。" \
  --voice-id female-shaonv \
  --out-dir audio

# 文本文件 → 音频 + 字幕
npx -y bun "$SKILL_DIR/scripts/main.ts" \
  --text-file script.md \
  --subtitles \
  --language zh-CN \
  --out-dir audio
```

## 输出文件

| 文件 | 说明 |
|---|---|
| `captions.json` | 原始结构化数据（最完整，含逐词时间戳） |
| `captions.srt` | SRT 字幕文件（通用） |
| `captions.vtt` | WebVTT 字幕文件（网页用） |
| `voice.m4a` / `voice.mp3` | TTS 生成的音频（仅 TTS 模式） |
| `asr-result.json` | ASR API 原始返回（调试用） |

## 与视频工程项目的集成

如果是 `talking-head-remotion` 等视频工程项目，字幕统一放在项目的 `work/captions/` 下：

```
your-project/
└── work/
    └── captions/
        ├── captions.srt          ← 主字幕（清洗后）
        ├── captions.vtt
        ├── captions.raw.srt      ← 原始 ASR 备份
        ├── captions.raw.vtt
        ├── captions_aligned.json ← Remotion 同步用（对齐后的）
        └── asr-result.json       ← API 原始返回
```

`captions_aligned.json` 是连接音频和画面的桥梁——Remotion 项目的 `demoData.ts` 从这里读取每行字幕的精确起止时间，所有画面动画都对齐到它。

## 环境变量

本工具调用外部服务，需要配置以下环境变量（不包含在仓库中）：

| 变量 | 用途 |
|---|---|
| Cloudflare R2 相关 | 上传本地文件生成公网 URL（供 ASR API 读取） |
| Volcengine AI MediaKit | ASR 语音识别服务 |
| MiniMax API Key | TTS 语音合成服务 |

详见各 API 服务商的文档。

## 更多资源

- 完整 CLI 参数、批量格式、speaker 用法 → [`SKILL.md`](SKILL.md)
