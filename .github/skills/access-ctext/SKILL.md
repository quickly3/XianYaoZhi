---
name: access-ctext
description: 访问 ctext.org（中國哲學書電子化計劃），提取古籍中文原文，写入对应的 txt_chapters 文件
triggers:
  - ctext
  - ctext.org
  - 中国哲学书电子化计划
  - 访问古籍网站
  - 获取古籍原文
  - 从ctext获取文本
---

# 访问 ctext.org 获取古籍原文

## 适用场景

- 需要从 [ctext.org](https://ctext.org)（中國哲學書電子化計劃）获取古籍中文原文
- 需要将获取的原文写入 `book/` 目录下的 `txt_chapters/` 文件
- 需要对比 ctext.org 版本与现有版本的文字差异（异体字、罕用字等）
- 需要批量获取多章节古籍原文

## 触发提示词示例

- "访问 ctext.org 上的《南山经》"
- "从 ctext 获取《西山经》原文"
- "用浏览器打开 ctext 的《山海经》页面"
- "把 ctext 版本的古文写入文件"

## 执行原则

1. **保留原始字符** — ctext.org 提供简体字版本，其中包含异体字和罕用字（如 𪊨、𪁺𩿧、䨼 等），写入时原样保留，不要作现代简化替换
2. **可追溯来源** — 最终输出的文件应注明来源为 ctext.org，便于后续对照不同版本
3. **尊重原文结构** — 保持 ctext.org 的段落划分和文本顺序，不要自行合并或重组段落
4. **仅取中文正文** — 优先提取纯中文原文内容，过滤英文翻译、导航菜单、侧边栏等无关信息
5. **保留准确性** — ctext 原文字段中带逗号分隔的写法（如"多犀、兕"）予以保留

## 执行步骤

### 第一步：打开浏览器页面

使用内置浏览器工具打开目标 URL。ctext.org 的古籍页面 URL 格式为：
`https://ctext.org/{书籍拼音}/{章节拼音}/zhs`

例如《山海经·南山经》：`https://ctext.org/shan-hai-jing/nan-shan-jing/zhs`

**推荐工具链（已验证可行）：**

```
mcp_chrome_devtoo_new_page → 导航到 URL
```

> ⚠️ 注意：`open_browser_page` 可能无法正确加载页面（页面停留在 about:blank）。优先使用 `mcp_chrome_devtoo_new_page` 打开新标签页。

### 第二步：定位主内容表格

ctext.org 的古籍正文以 HTML `<table>` 结构呈现。使用以下方式定位：

```javascript
// 找到正文表格（特征为行数较多，通常 80+ 行）
const tables = document.querySelectorAll('table');
let mainTable = null;
tables.forEach(t => {
  if (t.rows && t.rows.length > 50) {  // 南山经为 86 行，其他章节目测类似
    mainTable = t;
  }
});
```

### 第三步：提取中文正文

遍历表格行，提取包含中文的行，过滤掉：
- 英文翻译行（以 "The" 开头等）
- "打开字典"、"显示相似段落" 等操作链接文本
- 章节标题标记行（如 "南山经:"）

```javascript
// 提取纯中文正文
for (let i = 0; i < mainTable.rows.length; i++) {
  const cells = mainTable.rows[i].cells;
  for (let j = 0; j < cells.length; j++) {
    const cellText = cells[j].innerText || '';
    if (cellText.trim()) {
      const lines = cellText.trim().split('\n');
      for (const line of lines) {
        if (/[\u4e00-\u9fff]/.test(line)  // 包含汉字
            && !line.includes('English')
            && !line.includes('translation')
            && !line.includes('打开字典')
            && !line.includes('显示相似段落')) {
          const trimmed = line.trim();
          if (trimmed !== '南山经:'  // 跳过章节标题标记
              && !/^The\s/.test(trimmed)) {  // 跳过英文
            text += trimmed + '\n\n';
          }
        }
      }
    }
  }
}
```

### 第四步：写入目标文件

将提取的文本写入 `book/{书籍名}/txt_chapters/{章节文件名}`，需要注意：

- 文件命名规则：`{序号}-{章节名}.txt`，与现有章节文件保持一致
- 若目标文件**已有内容**，使用 `replace_string_in_file` 将全文替换
- 若目标文件**不存在**，使用 `create_file` 创建新文件
- 写入后验证首尾几行是否正确

### 第五步：验证写入结果

读取文件的前几行和后几行，确认：
- 首行内容正确（如 "南山经之首曰䧿山..."）
- 尾行统计信息正确（如 "右南经之山志，大小凡四十山，万六千三百八十里"）
- 未混入英文翻译或导航文本
- 特殊字符（异体字、罕用字）正确保留

## 常见字符差异对照

ctext.org 版本与传统/其他版本常见的字符差异（以《南山经》为例）：

| ctext.org 版本 | 其他版本 | 说明 |
|---------------|---------|------|
| 䧿山 | 鹊山 | 山名用字差异 |
| 招摇 | 招瑶 | 山名用字差异 |
| 谷 | 榖 | 木名（谷树）用字差异 |
| 青花 | 青华 | "花"与"华"通假 |
| 𪊨 | [鹿/旨] | 造字描述 vs Unicode 扩展字 |
| 魼 | [鱼去] | 鱼名用字 |
| 猼訑 | [犭専][讠也] | 兽名用字差异 |
| 𪁺𩿧 | [尚鸟][付鸟] | 鸟名用字差异 |
| 䨼 | [青護-言]/青雘 | 矿物名用字 |
| 鱬 | [鱼需] | 鱼名用字 |
| 祗山 | 柢山 | 山名差异 |

> 写入时以 ctext.org 原文为准，保留其用字。如有其他版本的差异，可在单独的对比笔记中记录。

## 注意事项

1. **浏览器选择**：`mcp_chrome_devtoo_new_page` 是首选工具。如果不可用，可尝试 `open_browser_page` + `mcp_browser_mcp_browser_navigate` 组合。
2. **页面加载**：确保页面完全加载后再提取内容。可以用 `mcp_chrome_devtoo_evaluate_script` 检查 `document.title` 和 `document.body.innerHTML.length`。
3. **英文翻译**：ctext.org 每段古文后附带英文翻译，提取时需要过滤掉（特征为以 "The" 开头或包含英文单词）。
4. **内容完整性**：提取后应检查是否遗漏了段落。ctext.org 的行号编号（1, 2, 3...）在提取时会被自然过滤掉。
5. **指令约束**：本仓库的 `book-text.instructions.md` 规定不要擅自改写原文。此 skill 的执行逻辑是"用 ctext.org 版本替换"，属于用户明确要求的变更，不违反该原则。
