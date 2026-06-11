import { Command, CommandRunner, Option } from 'nest-commander';
import { ExtractEntitiesService } from 'src/service/book/extract-entities.service';
import { FindEntityOriginService } from 'src/service/book/find-entity-origin.service';

interface ExtractEntitiesOptions {
  command?: string;
  book?: string;
  chapter?: string;
}

@Command({
  name: 'extract-entities',
  description:
    '古籍实体提取命令。从数据库读取 status=init 的章节，使用 DeepSeek 提取命名实体并写入 Entity 表。使用 `yarn cli extract-entities --help` 查看帮助。',
})
export class ExtractEntitiesCommand extends CommandRunner {
  constructor(
    private readonly extractEntitiesService: ExtractEntitiesService,
    private readonly findEntityOriginService: FindEntityOriginService,
  ) {
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
      // yarn cli extract-entities -- -c extract -b ShanHaiJing
      // yarn cli extract-entities -c extract -b ShanHaiJing -n 01
      case 'extract':
        await this.extractEntitiesService.extract({
          book: options.book ?? 'ShanHaiJing',
          chapter: options.chapter,
        });
        break;
      // yarn cli extract-entities -c origin -b ShanHaiJing
      // yarn cli extract-entities -c origin -b ShanHaiJing -n 01
      case 'origin':
        await this.findEntityOriginService.findOrigins({
          book: options.book ?? 'ShanHaiJing',
          chapter: options.chapter,
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
    description: '可选，仅处理指定章节标题前缀（如 01）',
  })
  getChapter(val: string): string {
    return val;
  }

  private printRuntimeGuide() {
    console.log('ExtractEntitiesCommand 运行说明:');
    console.log('for linux yarn cli extract-entities -c <command> [options]');
    console.log(
      'for windows  yarn cli extract-entities -c <command> [options]',
    );
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  yarn cli extract-entities -c extract -b ShanHaiJing');
    console.log('  yarn cli extract-entities -c extract -b ShanHaiJing -n 01');
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
      {
        name: 'origin',
        description: '查询实体出处，读取 entities JSON 为每个实体查找原文段落',
      },
    ];
  }
}
