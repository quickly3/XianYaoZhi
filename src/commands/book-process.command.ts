import { Command, CommandRunner, Option } from 'nest-commander';
import { BookMapModelService } from '../service/book-map-model.service';
import { BookSplitService } from '../service/book-split.service';

interface BookProcessOptions {
  command?: string;
  input?: string;
  output?: string;
  book?: string;
  chapter?: string;
  sourceDir?: string;
  merge?: string;
}

@Command({
  name: 'book-process',
  description:
    '古籍处理命令，支持拆分章节与 txt→md 转换等操作。使用 `yarn cli book-process --help` 查看帮助。',
})
export class BookProcessCommand extends CommandRunner {
  constructor(
    private readonly bookSplitService: BookSplitService,
    private readonly bookMapModelService: BookMapModelService,
  ) {
    super();
  }

  async run(
    _passedParam: string[],
    options?: BookProcessOptions,
  ): Promise<void> {
    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }
    console.log('运行命令:', options.command);
    switch (options.command) {
      // yarn cli book-process -c split -i ShanHaiJing/Shanhaijing.txt
      case 'split':
        this.bookSplitService.splitBook(options);
        break;
      // yarn cli book-process -c txt2md -b ShanHaiJing
      // yarn cli book-process -c txt2md -b ShanHaiJing -n 01
      case 'txt2md':
        this.bookSplitService.txt2md(
          options.book ?? 'ShanHaiJing',
          options.chapter,
        );
        break;
      // yarn cli book-process -c map-model -b ShanHaiJing -n 01
      // yarn cli book-process -c map-model -i book/ShanHaiJing/md_chapters/01-南山经.md
      case 'map-model':
        this.bookMapModelService.buildMapModel({
          book: options.book ?? 'ShanHaiJing',
          chapter: options.chapter,
          input: options.input,
          output: options.output,
          sourceDir: options.sourceDir,
        });
        break;

      // importToDb
      // yarn cli book-process -c import-db
      case 'import-db':
        await this.bookSplitService.importToDb();
        break;

      default:
        console.log(`未找到子命令: ${options.command}`);
        this.printRuntimeGuide();
        break;
    }
  }

  @Option({
    flags: '-c, --command [command]',
    description: '要执行的子命令，例如 split、merge',
  })
  getSubCommand(val: string): string {
    return val;
  }

  @Option({
    flags: '-i, --input [input]',
    description: '源文件路径（默认 book/ShanHaiJing/Shanhaijing.txt）',
  })
  getInput(val: string): string {
    return val;
  }

  @Option({
    flags: '-o, --output [output]',
    description: '输出目录（默认 book/ShanHaiJing/chapters）',
  })
  getOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '-b, --book [book]',
    description: '书籍目录名（默认 ShanHaiJing），用于 txt2md 等子命令',
  })
  getBook(val: string): string {
    return val;
  }

  @Option({
    flags: '-n, --chapter [chapter]',
    description: '可选，仅转换指定章节前缀（如 01），用于 txt2md',
  })
  getChapter(val: string): string {
    return val;
  }

  @Option({
    flags: '--source-dir [sourceDir]',
    description:
      '章节来源目录名，默认 md_chapters，可选 txt_chapters 或其他目录',
  })
  getSourceDir(val: string): string {
    return val;
  }

  @Option({
    flags: '--merge [merge]',
    description: '合并模式：将拆分后的章节文件合并到指定路径',
  })
  getMerge(val: string): string {
    return val;
  }

  private printRuntimeGuide() {
    console.log('BookProcessCommand 运行说明:');
    console.log(
      'for linux yarn cli book-process -c <command> [-i <input>] [-o <output>]',
    );
    console.log(
      'for windows  yarn cli book-process -c <command> [-i <input>] [-o <output>]',
    );
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log(
      'yarn cli book-process -c split' +
        ' -i ./book/ShanHaiJing/Shanhaijing.txt' +
        ' -o ./book/ShanHaiJing/chapters',
    );
    console.log(
      '  yarn cli book-process -c merge' +
        ' -o ./book/ShanHaiJing/chapters' +
        ' --merge ./book/ShanHaiJing/merged.txt',
    );
    console.log('yarn cli book-process -c txt2md' + ' -b ShanHaiJing');
    console.log('yarn cli book-process -c txt2md' + ' -b ShanHaiJing -n 01');
    console.log(
      '  yarn cli book-process -c map-model' + ' -b ShanHaiJing -n 01',
    );
    console.log(
      '  yarn cli book-process -c map-model' +
        ' -i book/ShanHaiJing/md_chapters/01-南山经.md',
    );
  }

  private getCommandDescriptions() {
    return [
      { name: 'split', description: '按章节拆分古籍文件为独立章节' },
      { name: 'merge', description: '将拆分后的章节文件合并为单一文件' },
      {
        name: 'txt2md',
        description: '将 txt_chapters 转换为 md_chapters（Markdown）',
      },
      {
        name: 'map-model',
        description: '将章节古文抽取为地图建模数据（graph/entities/summary）',
      },
    ];
  }
}
