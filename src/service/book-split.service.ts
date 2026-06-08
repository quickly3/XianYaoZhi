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
    const outputDir = `${dirName}/chapters`;
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
}
