# JSX Unicode 字符陷阱 (TS1351)

## 现象

数学证明视频里大量出现 `²`(U+00B2)、`₁`(U+2081)、`₂`(U+2082)、`₃`(U+2083)、`ⁿ`(U+207F) 等上下标字符。

直接写 JSX 文本:

```tsx
<span>a² + b² = c²</span>
```

`npx tsc --noEmit` 报:

```
error TS1351: An identifier or keyword cannot immediately follow a numeric literal.
```

并伴随 TS1003 / TS1127 / TS1136 级联错误。

## 根因

TypeScript 把 Unicode No 类(Number, Other)字符解析为数字字面量的一部分。`²` 之类属于 No 类(不是 Nd 十进制数字,但仍是数字),在 JSX 文本位置被识别为数字字面量,后面紧跟的标识符(空格、`+`、`b`)触发了 TS1351。

涉及字符(不完全列表):
- 上标: `²³⁴⁵⁶⁷⁸⁹⁰ⁿ` (U+00B2/U+00B3/U+2074-2079/U+2070/U+207F)
- 下标: `₀₁₂₃₄₅₆₇₈₉` (U+2080-2089)
- 其他 No 类: `½⅓⅔¼¾` 等

## 解法

**所有含 Unicode 数字符号的 JSX 文本,一律包字符串表达式**:

```tsx
// ❌ 错误
<span>a² + b² = c²</span>
<span>S₁ + S₂ = ab</span>

// ✅ 正确
<span>{'a² + b² = c²'}</span>
<span>{'S₁ + S₂ = ab'}</span>
```

字符串字面量里的 Unicode 字符不会被当作数字字面量,所以包 `{}` 后 TS 就当字符串处理。

更复杂的混合:

```tsx
// ❌ 错误
<span>S = <span style={{color: C.yellow}}>(a + b)² / 2</span></span>

// ✅ 正确
<span>S = <span style={{color: C.yellow}}>{'(a + b)² / 2'}</span></span>
```

`className`、`src` 等属性的字符串值不受影响,只有 JSX children(标签之间的文本)需要包 `{}`。

## Edit 工具的限制

Edit 工具对含 Unicode No 字符的字符串匹配不稳定。即使 Python 的 `in` 检查返回 True,Edit 仍可能报"String to replace not found":

```
> python -c "print('a² + b²' in open('Proof.tsx').read())"
True

> Edit(old_string='a² + b²', new_string='a² + b² = c²')
Error: String to replace not found
```

推测原因:Edit 内部对 `²` 的字节/码点处理与 Python 不一致。

## 替代方案

### 方案 A: Python 一次性替换

```bash
python -c "
import io
p = 'src/Proof.tsx'
s = io.open(p, encoding='utf-8').read()
old = 'expr: <span>a\u00B2</span>,'
new = 'expr: <span>{\'a\u00B2 = b\u00B2\'}</span>,'
print('found:', old in s)
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
"
```

`\u00B2` 是 `²` 的 Unicode 转义,避免在 Python 字面量里直接写裸字符(避免编码歧义)。

### 方案 B: 整文件重写

如果修改点多(>3 处),直接 `Write` 整文件更省事。先把文件读完,在内存里改完所有 Unicode 文本,再 `Write` 回去。

### 方案 C: 写代码时预防

写 `Proof.tsx` 第一遍就养成习惯,所有数学文本一律 `<span>{'...'}</span>`。包括:
- 大字公式: `{'a² + b² = c²'}`
- 步骤 expr: `<span>{'S₁ = ab / 2'}</span>`
- Caption 文本: `{text: 'a² + b² = c²', tone: 'accent'}` (字符串字面量里 Unicode 不会触发 TS1351,但保持一致风格更安全)
- HookOverlay/EndingOverlay 的 title/result 是 prop 字符串,内部已包好;调用方直接传字符串字面量即可

## 排查命令

文件里哪些 Unicode 字符有问题:

```bash
python -c "
import io, unicodedata
s = io.open('src/Proof.tsx', encoding='utf-8').read()
for i, c in enumerate(s):
    if unicodedata.category(c).startswith('N') and not c.isdigit():
        print(f'pos {i}: {c!r} U+{ord(c):04X} {unicodedata.category(c)} {unicodedata.name(c)}')
"
```

输出每个 Unicode 数字符号的位置、码点、类别、名称。定位错误时把 pos 映射到行号即可。
