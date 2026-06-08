import { Command, CommandRunner, Option } from 'nest-commander';
import { BookSplitService } from '../service/book-split.service';

@Command({
  name: 'book-split',
  description:
    '将古籍文件按章节拆分为独立文件。使用 `npm run cli -- book-split --help` 查看帮助。',
})
export class BookSplitCommand extends CommandRunner {
  constructor(private readonly bookSplitService: BookSplitService) {
    super();
  }

  async run(
    _passedParam: string[],
    options?: Record<string, any>,
  ): Promise<void> {
    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }
    switch (options.command) {
      case 'split':
        this.bookSplitService.splitBook(options);
        break;
      case 'merge':
        this.bookSplitService.splitBook(options);
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
    flags: '--merge [merge]',
    description: '合并模式：将拆分后的章节文件合并到指定路径',
  })
  getMerge(val: string): string {
    return val;
  }

  private printRuntimeGuide() {
    console.log('BookSplitCommand 运行说明:');
    console.log(
      'for linux npm run cli book-split -- -c <command> [-i <input>] [-o <output>]',
    );
    console.log(
      'for windows  npm run cli -- book-split -- -c <command> [-i <input>] [-o <output>]',
    );
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log(
      '  npm run cli -- book-split -- -c split' +
        ' -i ./book/ShanHaiJing/Shanhaijing.txt' +
        ' -o ./book/ShanHaiJing/chapters',
    );
    console.log(
      '  npm run cli -- book-split -- -c merge' +
        ' -o ./book/ShanHaiJing/chapters' +
        ' --merge ./book/ShanHaiJing/merged.txt',
    );
  }

  private getCommandDescriptions() {
    return [
      { name: 'split', description: '按章节拆分古籍文件为独立章节' },
      { name: 'merge', description: '将拆分后的章节文件合并为单一文件' },
    ];
  }
}
