import * as fs from 'fs';
import * as path from 'path';

/** 中文数字 → 阿拉伯数字映射 */
const CN_NUM_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  十一: 11,
  十二: 12,
  十三: 13,
  十四: 14,
  十五: 15,
  十六: 16,
  十七: 17,
  十八: 18,
};

export interface ChapterInfo {
  /** 序号，从 1 开始 */
  index: number;
  /** 章节标题文本，如 "南山经" */
  title: string;
  /** 章节内容（含标题行） */
  content: string;
}

export class BookSplitService {
  /**
   * 将文件按章节拆分
   * @param filePath 源文件路径
   * @param outputDir 输出目录
   */

  splitBook(options) {
    const { input } = options;

    const inputFile = `book/${input}`;
    const dirName = path.dirname(inputFile);
    const outputDir = `${dirName}/txt_chapters`;
    this.split(inputFile, outputDir);
  }

  split(filePath: string, outputDir: string): void {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/);

    // 匹配章节标题行：XX经第Y
    const chapterRegex =
      /^(.+经)第(十[一二三四五六七八]|[一二三四五六七八九十])$/;

    const chapters: ChapterInfo[] = [];
    let preambleLines: string[] = [];
    let currentLines: string[] = [];
    let currentTitle = '';
    let chapterIndex = 0;

    for (const line of lines) {
      const match = line.trim().match(chapterRegex);
      if (match) {
        const titleBase = match[1]; // e.g. "南山经"
        const numCN = match[2]; // e.g. "一"
        const num = CN_NUM_MAP[numCN];

        if (num == null) {
          // 未能识别的章节号，作为普通内容处理
          currentLines.push(line);
          continue;
        }

        // 保存上一章节
        if (chapterIndex > 0 && currentLines.length > 0) {
          chapters.push({
            index: chapterIndex,
            title: currentTitle,
            content: currentLines.join('\n'),
          });
        }

        // 第一个章节之前的内容为前言
        if (chapterIndex === 0) {
          preambleLines = [...currentLines];
        }

        // 开始新章节
        chapterIndex = num;
        currentTitle = titleBase;
        currentLines = [line];
      } else {
        currentLines.push(line);
      }
    }

    // 保存最后一个章节
    if (chapterIndex > 0 && currentLines.length > 0) {
      chapters.push({
        index: chapterIndex,
        title: currentTitle,
        content: currentLines.join('\n'),
      });
    }

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 写入前言（第一个章节标题之前的内容）
    if (preambleLines.length > 0) {
      const preamblePath = path.join(outputDir, '00-前言.txt');
      fs.writeFileSync(preamblePath, preambleLines.join('\n'), 'utf-8');
    }

    // 按序号排序后写入各章节
    chapters.sort((a, b) => a.index - b.index);
    for (const ch of chapters) {
      const paddedIndex = String(ch.index).padStart(2, '0');
      const fileName = `${paddedIndex}-${ch.title}.txt`;
      const outputPath = path.join(outputDir, fileName);
      fs.writeFileSync(outputPath, ch.content, 'utf-8');
    }

    console.log(`拆分完成：共 ${chapters.length} 个章节，输出至 ${outputDir}`);
  }

  // ──────────── txt → md 转换 ────────────

  /**
   * 将 txt_chapters 下的章节文件转换为适合阅读文言文的 Markdown，输出到 md_chapters。
   *
   * @param book  书籍目录名，如 "ShanHaiJing"
   * @param chapter 可选的章节前缀，如 "01"，仅转换匹配的文件
   */
  txt2md(book: string, chapter?: string): void {
    const txtDir = `book/${book}/txt_chapters`;
    const mdDir = `book/${book}/md_chapters`;

    if (!fs.existsSync(txtDir)) {
      console.error(`错误：输入目录不存在 — ${txtDir}`);
      return;
    }

    if (!fs.existsSync(mdDir)) {
      fs.mkdirSync(mdDir, { recursive: true });
      console.log(`创建输出目录: ${mdDir}`);
    }

    const files = fs
      .readdirSync(txtDir)
      .filter((f) => f.endsWith('.txt'))
      .sort();

    if (files.length === 0) {
      console.error(`错误：${txtDir} 中没有 .txt 文件`);
      return;
    }

    const targetFiles = chapter
      ? files.filter((f) => f.startsWith(chapter))
      : files;

    if (chapter && targetFiles.length === 0) {
      console.error(`错误：未找到以 "${chapter}" 开头的文件。可用文件：`);
      for (const f of files) console.error(`  ${f}`);
      return;
    }

    console.log(`转换 ${book} …`);
    console.log(`  输入: ${txtDir}`);
    console.log(`  输出: ${mdDir}`);
    console.log(`  文件: ${targetFiles.length} 个`);

    for (const file of targetFiles) {
      this.convertTxtFile(file, txtDir, mdDir);
    }

    console.log('\n转换完成。');
  }

  /** 单个 txt 文件 → md 文件 */
  private convertTxtFile(file: string, txtDir: string, mdDir: string): void {
    const inputPath = path.join(txtDir, file);
    const outputFile = file.replace(/\.txt$/, '.md');
    const outputPath = path.join(mdDir, outputFile);
    const raw = fs.readFileSync(inputPath, 'utf-8');
    const isPreface = file.startsWith('00-');
    const md = this.convertToMarkdown(raw, isPreface);
    fs.writeFileSync(outputPath, md, 'utf-8');
    console.log(`  ✓ ${file} → ${outputFile}`);
  }

  /** 判断某行是否为前言中的小节标题 */
  private isPrefaceHeading(line: string): boolean {
    const trimmed = line.trim();
    if (trimmed.length < 2 || trimmed.length > 30) return false;
    if (line.startsWith('\u3000')) return false;
    const starters = [
      '又',
      '有',
      '凡',
      '自',
      '东',
      '南',
      '西',
      '北',
      '其',
      '此',
      '是',
      '故',
      '则',
    ];
    if (starters.some((s) => trimmed.startsWith(s))) return false;
    if (trimmed.startsWith('右')) return false;
    if (trimmed.startsWith('(') || trimmed.startsWith('[')) return false;
    return true;
  }

  /** 将 txt 内容转换为适合阅读文言文的 Markdown */
  private convertToMarkdown(content: string, isPreface: boolean): string {
    const lines = content.split(/\r?\n/);
    const result: string[] = [];
    let isFirstLine = true;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        if (result.length > 0 && result[result.length - 1] !== '') {
          result.push('');
        }
        continue;
      }

      if (isFirstLine) {
        result.push(`## ${trimmed}`);
        result.push('');
        isFirstLine = false;
        continue;
      }

      if (isPreface && this.isPrefaceHeading(line)) {
        result.push(`### ${trimmed}`);
        result.push('');
        continue;
      }

      if (isPreface && trimmed.startsWith('[')) {
        // 将 ]: 替换为 ]： 防止 Markdown 将其解释为参考式链接定义（方案2）
        const fixed = trimmed.replace(/\]\s*:\s*/, ']：');
        result.push(`- ${fixed}`);
        continue;
      }

      result.push(trimmed);
      result.push('');
    }

    while (result.length > 0 && result[result.length - 1] === '') {
      result.pop();
    }

    return result.join('\n') + '\n';
  }
}
