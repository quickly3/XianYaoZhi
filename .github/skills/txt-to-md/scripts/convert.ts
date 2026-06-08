/**
 * txt_chapters → md_chapters 转换脚本
 *
 * 将 book/<book>/txt_chapters/ 下的 .txt 章节文件
 * 转换为适合阅读文言文的 Markdown 格式，输出到 book/<book>/md_chapters/。
 *
 * 用法：
 *   npx ts-node .github/skills/txt-to-md/scripts/convert.ts --book ShanHaiJing
 *   npx ts-node .github/skills/txt-to-md/scripts/convert.ts --book ShanHaiJing --chapter 01
 */

import * as fs from 'fs';
import * as path from 'path';

interface Options {
  book: string;
  chapter?: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const opts: Options = { book: 'ShanHaiJing' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--book' && args[i + 1]) {
      opts.book = args[i + 1];
      i++;
    } else if (args[i] === '--chapter' && args[i + 1]) {
      opts.chapter = args[i + 1];
      i++;
    }
  }

  return opts;
}

/**
 * 判断某行是否为前言中的小节标题。
 *
 * 前言中的真实标题特征：
 * - 原文行首无全角空格缩进
 * - 行文本较短（≤ 30 字）
 * - 不以文言文常用句首词开头（如「又」「有」「凡」「自」「东」「南」「西」「北」）
 * - 不是「右…」结尾的总结行
 */
function isPrefaceHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  // 原文行首有全角空格缩进 → 非标题
  if (line.startsWith('\u3000')) return false;
  // 以文言文句首词开头 → 非标题
  const sentenceStarters = ['又', '有', '凡', '自', '东', '南', '西', '北', '其', '此', '是', '故', '则'];
  if (sentenceStarters.some((s) => trimmed.startsWith(s))) return false;
  // 以「右」开头 → 总结行，非标题
  if (trimmed.startsWith('右')) return false;
  // 以「(」或「[」开头 → 注记或造字描述
  if (trimmed.startsWith('(') || trimmed.startsWith('[')) return false;
  return true;
}

/**
 * 将 txt 内容转换为适合阅读文言文的 Markdown。
 *
 * @param isPreface 是否为前言文件（00-*），前言有独立的小节标题结构
 */
function convertToMarkdown(content: string, isPreface = false): string {
  const lines = content.split(/\r?\n/);
  const result: string[] = [];
  let isFirstLine = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 跳过纯空行
    if (trimmed === '') {
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    // 首行作为章节标题（所有文件）
    if (isFirstLine) {
      result.push(`## ${trimmed}`);
      result.push('');
      isFirstLine = false;
      continue;
    }

    // 前言中的小节标题检测
    if (isPreface && isPrefaceHeading(line)) {
      result.push(`### ${trimmed}`);
      result.push('');
      continue;
    }

    // 识别造字描述列表项（以 [ 开头的行）— 仅前言中出现
    if (isPreface && trimmed.startsWith('[')) {
      result.push(`- ${trimmed}`);
      continue;
    }

    // 普通段落：去除段首全角空格，保留原文
    result.push(trimmed);
    result.push('');
  }

  // 去除末尾多余空行
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }

  return result.join('\n') + '\n';
}

function convertFile(
  inputPath: string,
  outputPath: string,
): void {
  const raw = fs.readFileSync(inputPath, 'utf-8');
  const fileName = path.basename(inputPath);
  const isPreface = fileName.startsWith('00-');
  const md = convertToMarkdown(raw, isPreface);
  fs.writeFileSync(outputPath, md, 'utf-8');
  console.log(`  ✓ ${fileName} → ${path.basename(outputPath)}`);
}

function main(): void {
  const opts = parseArgs();
  const txtDir = path.join('book', opts.book, 'txt_chapters');
  const mdDir = path.join('book', opts.book, 'md_chapters');

  // 检查输入目录
  if (!fs.existsSync(txtDir)) {
    console.error(`错误：输入目录不存在 — ${txtDir}`);
    process.exit(1);
  }

  // 创建输出目录
  if (!fs.existsSync(mdDir)) {
    fs.mkdirSync(mdDir, { recursive: true });
    console.log(`创建输出目录: ${mdDir}`);
  }

  // 读取所有 txt 文件，按文件名排序
  const files = fs
    .readdirSync(txtDir)
    .filter((f) => f.endsWith('.txt'))
    .sort();

  if (files.length === 0) {
    console.error(`错误：${txtDir} 中没有 .txt 文件`);
    process.exit(1);
  }

  // 如果指定了章节，只转换匹配的文件
  const targetFiles = opts.chapter
    ? files.filter((f) => f.startsWith(opts.chapter!))
    : files;

  if (opts.chapter && targetFiles.length === 0) {
    console.error(
      `错误：未找到以 "${opts.chapter}" 开头的文件。可用文件：`,
    );
    for (const f of files) {
      console.error(`  ${f}`);
    }
    process.exit(1);
  }

  console.log(`转换 ${opts.book} …`);
  console.log(`  输入: ${txtDir}`);
  console.log(`  输出: ${mdDir}`);
  console.log(`  文件: ${targetFiles.length} 个`);

  for (const file of targetFiles) {
    const inputPath = path.join(txtDir, file);
    const outputFile = file.replace(/\.txt$/, '.md');
    const outputPath = path.join(mdDir, outputFile);
    convertFile(inputPath, outputPath);
  }

  console.log('\n转换完成。');
}

main();
