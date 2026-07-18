# apiz 生图提示词配方

纸片风用 `apiz generate`（默认模型 `fal-ai/nano-banana-pro`）生成两类素材：
1. **背景底板**（gen_plates.py）——无人物纯环境
2. **角色素材表**（gen_characters.py）——纯绿背景，待抠图拆分

两类提示词有各自**必须遵守的硬约束**，脚本会自动追加，但理解原理有助于调优。

## 一、apiz 调用速查

```bash
# 单张背景底板
apiz generate "<prompt>" \
  --model fal-ai/nano-banana-pro \
  --image-size landscape_16_9 \
  --wait --json

# 角色（单人竖图）
apiz generate "<prompt>" \
  --model fal-ai/nano-banana-pro \
  --image-size portrait_4_3 \
  --wait --json

# 角色（多人素材表，横图）
apiz generate "<prompt>" \
  --model fal-ai/nano-banana-pro \
  --image-size landscape_16_9 \
  --wait --json

# 图生图（已有底图做风格化）—— 提供 --image-url 自动切编辑模式
apiz generate "<prompt>" --model fal-ai/nano-banana-pro --image-url <url> --wait --json
```

**image_size 取值**：`square_hd` / `square` / `landscape_4_3` / `landscape_16_9` / `portrait_4_3` / `portrait_16_9`

**关键**：apiz generate **没有内置下载**，成功后图片 URL 在 `--json` 输出里，脚本用 `lib_apiz.extract_image_url()` 多路径兜底取 URL 后 urllib 下载。

## 二、背景底板提示词（gen_plates.py）

### 自动追加的约束（NO_PERSON_SUFFIX）
```
画面中绝对不要出现任何人物（no people, no human figures, no characters）。
只画环境：建筑、山水、纹理、装饰。
复古纸片拼贴质感，宣纸纹理底，扁平色块，轻微纸张阴影层次。
16:9 横幅构图，主体居中略偏下（上方留给标题字幕）。
```

### 用户提示词模板（按题材替换）

**全景底板（偏米白，突出主角）**：
```
唐代长安宫殿全景，水墨远山，宣纸纹理底，撕纸边缘装饰，
散落的网点、胶带和印章，复古纸片拼贴风。
色调偏米白暖黄，方便突出前景金色人物。
```

**特写底板（深色，突出中央人物）**：
```
唐代宫殿内景特写，大殿红毯，深红色宣纸底纹，
撕纸边缘，复古纸片拼贴风。
色调深红浓重，方便突出中央浅色人物。
```

**通用环境元素清单**（按需加入提示词）：
- 山水/水墨山脉
- 宫殿/城楼/建筑
- 红色宣纸底纹 / 水墨晕染
- 撕纸边缘（torn paper edge）
- 网点（halftone dots）
- 胶带（washi tape）
- 印章装饰（red seal stamps）

## 三、角色素材表提示词（gen_characters.py）

### 自动追加的约束（ENFORCE_SUFFIX）
```
视觉风格约束（必须遵守）：
白色剪纸描边（粗白边勾轮廓），复古纸片拼贴质感，扁平纯色块。
纯绿色背景 #00FF00（pure solid green screen，方便抠图），
不要场景，不要道具环境，不要其他人物（除非指定多人素材表），
不要文字，不要水印，不要签名。
人物必须完整，不要裁掉头、手、脚。
```

多人素材表额外追加（SHEET_SUFFIX）：
```
人物横向均匀排列，互相不重叠，留出足够间距便于裁切。
```

### 单人角色提示词模板

**主角（皇帝）**：
```
生成一名唐代皇帝全身人物，坐在雕花龙椅上，身体朝右，右手抬起。
金色龙袍，头戴冕冠，中国古籍线描与复古纸片拼贴质感。
```

**次要角色（侍女）**：
```
生成一名唐代侍女全身人物，站立，身体朝左偏正面，
手持团扇，淡彩色襦裙，中国古籍线描与复古纸片拼贴质感。
```

**后排角色（群臣素材表）**：
```
生成六名唐代文武群臣站成一排，朝向正面，各着不同品级官服（紫/绯/绿袍），
中国古籍线描与复古纸片拼贴质感。
```
（设 `sheet: 6`，生成后用 `split_sheet_green.py` 拆 6 个独立 PNG）

### 提示词必须限制的 7 项（缺一项就可能废）

1. **朝代服饰和发冠**（"唐代"/"明代"等，避免穿越感）
2. **古籍线描与手工拼贴质感**（锁定纸片风，不然会偏写实）
3. **正面或明确的左右朝向**（"身体朝右"/"正面"，和场景关系对齐）
4. **完整人物，不裁掉头、手、脚**（抠图后才不会缺件）
5. **白色剪纸描边**（白边是剪纸感的来源）
6. **纯色背景，方便抠图**（绿幕 chroma key 的前提）
7. **不要文字、不要水印、不要复杂场景**（减少抠图杂质）

## 四、提示词调优经验

| 问题 | 原因 | 对策 |
|---|---|---|
| 抠图后人物边缘有绿残留 | 模型没生成纯绿，有渐变/阴影 | 调大 `EDGE_FEATHER`；或提示词强化 "pure flat solid green, no gradient, no shadow on background" |
| 人物朝向和场景矛盾 | 提示词没明确朝向 | 强制写 "body facing left/right/front"，Remotion 里还能 `flip` 兜底 |
| 主角不够大/不够突出 | 构图太平均 | 单独生成主角（不要塞进素材表），用更大 width |
| 素材表拆开后有人物重叠 | 多人排列太挤 | 提示词加 "well separated, generous spacing"，或减少每张图人数 |
| 出现水印/签名 | 模型习惯 | 提示词加 "no text, no watermark, no signature"（已在 ENFORCE_SUFFIX） |
| 风格偏写实不像纸片 | 缺风格锚定 | 开头加 "Chinese ancient book line drawing, retro paper collage style, flat color blocks" |

## 五、首次使用校准（重要）

apiz generate 的图片 URL 在返回 JSON 里的确切路径，因余额不足未能实跑确认。
`lib_apiz.extract_image_url()` 用多路径兜底（output.images[].url / download_url / cdn_url）。

**第一次跑 gen_plates 或 gen_characters 时**：
1. 脚本会自动把完整返回 dump 到 `.last_generate.json`
2. 如果 `extract_image_url` 抛错"无法定位图片 URL"
3. 打开 `.last_generate.json`，找到图片 URL 的实际字段路径
4. 把该路径加到 `lib_apiz.extract_image_url()` 的兜底列表最前面

校准一次后，后续所有生成都能正常工作。
