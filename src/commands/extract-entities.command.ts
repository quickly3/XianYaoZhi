import { Command, CommandRunner, Option } from 'nest-commander';
import { ExtractEntitiesService } from 'src/service/book/extract-entities.service';

interface ExtractEntitiesOptions {
  command?: string;
  book?: string;
  chapter?: string;
  sourceDir?: string;
}

@Command({
  name: 'extract-entities',
  description:
    '古籍实体提取命令。使用 DeepSeek 从章节文本中提取命名实体，结果保存到 entities 目录。使用 `npm run cli -- extract-entities --help` 查看帮助。',
})
export class ExtractEntitiesCommand extends CommandRunner {
  constructor(private readonly extractEntitiesService: ExtractEntitiesService) {
    super();
  }

  async run(
    _passedParam: string[],
    options?: ExtractEntitiesOptions,
  ): Promise<void> {
    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }

    switch (options.command) {
      // npm run cli extract-entities -- -c extract -b ShanHaiJing
      // npm run cli extract-entities -- -c extract -b ShanHaiJing -n 01
      case 'extract':
        await this.extractEntitiesService.extract({
          book: options.book ?? 'ShanHaiJing',
          chapter: options.chapter,
          sourceDir: options.sourceDir,
        });
        break;
      default:
        console.log(`未找到子命令: ${options.command}`);
        this.printRuntimeGuide();
        break;
    }
  }

  @Option({
    flags: '-c, --command [command]',
    description: '要执行的子命令，例如 extract',
  })
  getSubCommand(val: string): string {
    return val;
  }

  @Option({
    flags: '-b, --book [book]',
    description: '书籍目录名（默认 ShanHaiJing）',
  })
  getBook(val: string): string {
    return val;
  }

  @Option({
    flags: '-n, --chapter [chapter]',
    description: '可选，仅处理指定章节前缀（如 01）',
  })
  getChapter(val: string): string {
    return val;
  }

  @Option({
    flags: '--source-dir [sourceDir]',
    description: '章节来源目录路径，默认 book/{book}/txt_chapters',
  })
  getSourceDir(val: string): string {
    return val;
  }

  private printRuntimeGuide() {
    console.log('ExtractEntitiesCommand 运行说明:');
    console.log(
      'for linux npm run cli extract-entities -- -c <command> [options]',
    );
    console.log(
      'for windows  npm run cli extract-entities -- -c <command> [options]',
    );
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  npm run cli extract-entities -- -c extract -b ShanHaiJing');
    console.log(
      '  npm run cli extract-entities -- -c extract -b ShanHaiJing -n 01',
    );
    console.log(
      '  npm run cli extract-entities -- -c extract -b ShanHaiJing --source-dir book/ShanHaiJing/txt_chapters',
    );
  }

  private getCommandDescriptions(): Array<{
    name: string;
    description: string;
  }> {
    return [
      {
        name: 'extract',
        description: '提取实体的主要命令，遍历章节文件并调用 AI 提取',
      },
    ];
  }
}
