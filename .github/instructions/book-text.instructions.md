---
applyTo: "book/**/*.txt"
description: "Use when reading or editing ancient Chinese text files, corpus source files, or mythology source material under the book directory."
---

# Book Text Handling

- `book/` 目录下的 `.txt` 文件默认视为原始语料或参考文本，不要为了“润色”而直接改写原文。
- 如果任务要求从文本中提取信息，优先输出结构化结果或新增旁路文件，而不是覆盖原文。
- 处理古汉语、异体字、罕见字、方括号造字描述时，保留原样，并在必要时补充解释，不要擅自现代化替换。
- 如果必须修改原文文件，只做用户明确要求的范围性变更，并尽量避免破坏段落、空行和章节结构。
- 引用文本内容时，优先保持与源文件一致，避免无依据的纠错。