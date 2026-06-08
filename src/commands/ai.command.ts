import { Command, CommandRunner, Option } from 'nest-commander';

@Command({
  name: 'ai',
  description:
    'AI 相关命令入口。使用 `npm run cli -- ai --help` 查看帮助，使用 `npm run cli -- ai -c <command>` 执行具体子命令。',
})
export class AiCommand extends CommandRunner {
  constructor() {
    super();
  }

  run(passedParam: string[], options?: any): any {
    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }

    switch (options.command) {
      default:
        console.log(`未找到子命令: ${options.command}`);
        this.printRuntimeGuide();
        break;
    }
  }

  @Option({
    flags: '-c, --command [command]',
    description:
      '要执行的子命令，例如 syncPromptCn、gpt、gemini、getTopStories、anaUps',
  })
  getSubCommand(val: string): string {
    return val;
  }

  @Option({
    flags: '--min-count [minCount]',
    description: '精炼后每个大分类子分类的最小数量（默认 5）',
  })
  getMinCount(val: string): number {
    return parseInt(val, 10) || 5;
  }

  @Option({
    flags: '--max-count [maxCount]',
    description: '精炼后每个大分类子分类的最大数量（默认 8）',
  })
  getMaxCount(val: string): number {
    return parseInt(val, 10) || 8;
  }

  private printRuntimeGuide() {
    console.log('AiCommand 运行说明:');
    console.log('for linux npm run cli ai -- -c <command> [--mid <mid>]');
    console.log('for windows  npm run cli -- ai -- -c <command> [--mid <mid>]');
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  npm run cli ai -- -c gpt');
    console.log('  npm run cli ai -- -c getTopStories');
    console.log('  npm run cli ai -- -c anaUps --mid 23947287');
  }

  private getCommandDescriptions() {
    return [{ name: 'syncPromptCn', description: '同步中文提示词' }];
  }
}
