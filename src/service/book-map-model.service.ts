import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { BookMapModelOutputService } from './book-map-model-output.service';
import { BookMapModelParserService } from './book-map-model-parser.service';
import {
  BuildMapModelOptions,
  MapModelParseResult,
} from './book-map-model.types';

@Injectable()
export class BookMapModelService {
  constructor(
    private readonly parser: BookMapModelParserService,
    private readonly outputService: BookMapModelOutputService,
  ) {}

  buildMapModel(options: BuildMapModelOptions = {}): void {
    const inputFiles = this.resolveInputFiles(options);

    if (inputFiles.length === 0) {
      console.error('错误：没有找到可用于地图建模的章节文件。');
      return;
    }

    const outputDir = this.resolveOutputDir(options, inputFiles[0]);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`地图建模输出目录: ${outputDir}`);
    console.log(`处理文件数: ${inputFiles.length}`);

    for (const filePath of inputFiles) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const book = options.book ?? this.inferBookName(filePath);
      const result = this.parseDocument(raw, {
        book,
        sourceFile: this.toRelativeBookPath(filePath),
      });
      const baseName = path.basename(filePath, path.extname(filePath));

      this.outputService.writeResult(outputDir, baseName, result);

      console.log(`  ✓ ${baseName}`);
    }
  }

  parseDocument(
    content: string,
    options: { book: string; sourceFile: string },
  ): MapModelParseResult {
    return this.parser.parseDocument(content, options);
  }

  private resolveInputFiles(options: BuildMapModelOptions): string[] {
    if (options.input) {
      return [path.resolve(options.input)];
    }

    const book = options.book ?? 'ShanHaiJing';
    const sourceDir = options.sourceDir ?? 'md_chapters';
    const dir = path.resolve(`book/${book}/${sourceDir}`);

    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs
      .readdirSync(dir)
      .filter((file) => /\.(md|txt)$/i.test(file))
      .sort();

    return options.chapter
      ? files
          .filter((file) => file.startsWith(options.chapter!))
          .map((file) => path.join(dir, file))
      : files.map((file) => path.join(dir, file));
  }

  private resolveOutputDir(
    options: BuildMapModelOptions,
    inputFile: string,
  ): string {
    if (options.output) {
      return path.resolve(options.output);
    }

    const book = options.book ?? this.inferBookName(inputFile);
    return path.resolve(`book/${book}/map`);
  }

  private inferBookName(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const match = normalized.match(/book\/([^/]+)\//);
    return match?.[1] ?? 'UnknownBook';
  }

  private toRelativeBookPath(filePath: string): string {
    const normalized = path.resolve(filePath).replace(/\\/g, '/');
    const root = path.resolve(process.cwd()).replace(/\\/g, '/');
    if (normalized.startsWith(root)) {
      return normalized.slice(root.length + 1);
    }
    return normalized;
  }
}
