/**
 * 独立运行脚本：将《山海经》原文按章节拆分为独立文件。
 *
 * 用法：
 *   npx tsx src/scripts/split-shanhaijing.ts
 *
 *   或指定输入/输出：
 *   npx tsx src/scripts/split-shanhaijing.ts --input path/to/file.txt --output path/to/dir
 */
import * as fs from 'fs';
import * as path from 'path';

const CN_NUM_MAP: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8,
  九: 9, 十: 10, 十一: 11, 十二: 12, 十三: 13, 十四: 14,
  十五: 15, 十六: 16, 十七: 17, 十八: 18,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') {
      options.input = args[++i];
    } else if (args[i] === '--output' || args[i] === '-o') {
      options.output = args[++i];
    }
  }
  return options;
}

function splitBook(inputPath: string, outputDir: string) {
  const raw = fs.readFileSync(inputPath, 'utf-8');
  const lines = raw.split(/\r?\n/);

  // 匹配章节标题行：XX经第Y（如 "南山经第一", "海外东经第九"）
  const chapterRegex = /^(.+经)第(十[一二三四五六七八]|[一二三四五六七八九十])$/;

  const chapters: { index: number; title: string; content: string }[] = [];
  let preambleLines: string[] = [];
  let currentLines: string[] = [];
  let currentTitle = '';
  let chapterIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(chapterRegex);
    if (match) {
      const num = CN_NUM_MAP[match[2]];
      if (num == null) {
        currentLines.push(line);
        continue;
      }

      // 保存上一章节
      if (chapterIndex > 0 && currentLines.length > 0) {
        chapters.push({ index: chapterIndex, title: currentTitle, content: currentLines.join('\n') });
      }

      // 第一个章节之前的内容为前言
      if (chapterIndex === 0) {
        preambleLines = [...currentLines];
      }

      chapterIndex = num;
      currentTitle = match[1]; // e.g. "南山经"
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  // 保存最后一个章节
  if (chapterIndex > 0 && currentLines.length > 0) {
    chapters.push({ index: chapterIndex, title: currentTitle, content: currentLines.join('\n') });
  }

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 写入前言
  if (preambleLines.length > 0) {
    const filePath = path.join(outputDir, '00-前言.txt');
    fs.writeFileSync(filePath, preambleLines.join('\n'), 'utf-8');
    console.log(`  写入: 00-前言.txt`);
  }

  // 按序号排序后写入各章节
  chapters.sort((a, b) => a.index - b.index);
  for (const ch of chapters) {
    const name = `${String(ch.index).padStart(2, '0')}-${ch.title}.txt`;
    fs.writeFileSync(path.join(outputDir, name), ch.content, 'utf-8');
    console.log(`  写入: ${name}`);
  }

  console.log(`\n拆分完成：共 ${chapters.length} 个章节，输出至 ${outputDir}`);
}

// --- 执行 ---
const options = parseArgs();
const inputFile = options.input || path.resolve(__dirname, '../../book/ShanHaiJing/Shanhaijing.txt');
const outputDir = options.output || path.resolve(__dirname, '../../book/ShanHaiJing/chapters');

console.log(`输入文件: ${inputFile}`);
console.log(`输出目录: ${outputDir}\n`);
splitBook(inputFile, outputDir);
