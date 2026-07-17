# 组件 API 速查

风格锁定文件（勿改视觉参数）：`theme.ts`、`sketch.tsx`、`characters.tsx`、`ui.tsx`。
所有 progress 参数都接受 0..1，内部自动 clamp；配合 `prog(frame, start, duration)` 使用。

## theme.ts

`PAPER` 纸底 / `INK` 墨色 / `RED` / `BLUE` / `ORANGE` / `GREEN` / `FONT` 手写字体栈。

## sketch.tsx — 手绘图形原语（都放在 `<Svg>` 内）

| 组件/函数 | 关键 props | 用途 |
|---|---|---|
| `wobblyLine(x1,y1,x2,y2,seed,jitter?)` | 返回 path d | 抖动直线路径 |
| `wobblyRect(x,y,w,h,seed,jitter?)` | 返回 path d | 抖动矩形路径 |
| `blobPath(cx,cy,rx,ry,seed,points?,jitter?)` | 返回 path d | 闭合抖动圆/团 |
| `DrawPath` | `d, progress, stroke?, strokeWidth?, fill?` | 描边渐进画任意路径，fill 在 progress 0.6 后淡入 |
| `SketchRect` | `x,y,w,h,seed,progress,fill?` | 手绘矩形框，`fill="#fff"` 可垫白底 |
| `SketchArrow` | `x1,y1,x2,y2,seed,progress,stroke?` | 橙色手绘箭头（默认 ORANGE），流程/指向 |
| `SketchHighlightCircle` | `cx,cy,rx,ry,seed,progress` | 红色手绘强调圈（起笔留缺口） |
| `SketchCross` | `cx,cy,size,seed,progress` | 红叉，先一撇后一捺 |
| `SketchUnderline` | `x1,x2,y,seed,progress,stroke?` | 手绘下划线 |
| `PaperSheet` | `x,y,rotate?,seed,progress,lines?` | 小纸片（飞行的文档/邮件） |

## characters.tsx — 角色（都放在 `<Svg>` 内，y 是脚底/地面）

| 组件 | 关键 props | 说明 |
|---|---|---|
| `StickMan` | `x,y,size?,seed,progress,mood?,bob?,armsUp?,flip?,glasses?,hair?` | 火柴人。mood: neutral/worried/shocked/happy/thinking；`bob={frame}` 呼吸浮动；老吴开 `glasses`；客户 `hair={false}` |
| `CuteAi` | `x,y,size?,seed,progress,bob?` | Q萌小电脑小智（天线+大眼+腮红+短手短腿），size 是屏宽 180~210 |
| `AiScreen` | `x,y,w?,h?,seed,progress,faceOn?,children?` | 桌面显示器。`faceOn` 显示萌脸；children 以屏幕左上角为原点画屏内内容（如红色邮件线条） |
| `ThermosCup` | `x,y,seed,progress,scale?` | 老吴的保温杯（带蒸汽） |
| `DeskLine` | `x1,x2,y,seed,progress` | 地面/桌面线 |
| `CuteFace` | `cx,cy,scale?` | 萌脸本体（一般不直接用） |

## ui.tsx — 文字层（放在 `<Svg>` 外、`<Paper>` 内）

| 组件 | 关键 props | 说明 |
|---|---|---|
| `Paper` | children | 场景根容器：纸底+字体+开场淡入，每个场景最外层 |
| `prog(frame, start, dur)` | — | 进度 helper，返回 0..1 |
| `HandText` | `x,y,size?,color?,start,weight?,align?` | 手写文字淡入上移；默认 x 为中心；支持 `\n` |
| `RedTitle` | `x,y,width,start,size?,color?` | 场景标题+手绘下划线（width 是下划线宽） |
| `Narration` | `start,color?,y?,size?` | 底部居中旁白（默认 y960） |
| `Bubble` | `x,y,w,start,size?,tail?,color?` | 对话气泡，x/y 左上角，tail 指向说话者 |
| `Svg` | children | 1920×1080 全屏 SVG 图层 |
