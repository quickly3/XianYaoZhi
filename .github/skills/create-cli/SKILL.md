---
name: create-cli
description: 创建 CLI 命令
---

# 创建 CLI 命令

## 适用场景

- 需要新增一个可通过 `npm run cli` 执行的命令行任务
- 需要为现有命令组添加新的子命令
- 需要创建独立的一次性命令（如数据迁移、同步脚本）

## 执行原则

- 先确认是新增命令文件还是在已有命令中追加子命令
- 命令只做流程调度，业务逻辑放在 service 中
- 复用现有 service，不在 command 中直接写数据访问或业务细节
- 变更最小化，只修改与需求直接相关的文件

## 技术栈

- 使用 `nest-commander` 库（`Command`、`CommandRunner`、`Option` 装饰器）
- CLI 入口：`src/cli.ts` → `CommandFactory.run(CliModule)`
- 命令注册模块：`src/modules/cli.module.ts`
- 命令文件目录：`src/commands/`

## 命令模式

项目中有两种命令模式：

### 模式一：带子命令的复合命令（推荐）

适用于同一领域下有多个操作的场景（如 `ai`、`spider`），通过 `-c` 参数分发子命令。

```typescript
import { Command, CommandRunner, Option } from 'nest-commander';
import { XxxService } from 'src/service/xxx.service';

@Command({
  name: 'xxx',
  description:
    'xxx 相关命令入口。使用 `npm run cli -- xxx --help` 查看帮助，使用 `npm run cli -- xxx -c <command>` 执行具体子命令。',
})
export class XxxCommand extends CommandRunner {
  constructor(
    private readonly xxxService: XxxService,
  ) {
    super();
  }

  async run(_passedParam: string[], options?: any): Promise<void> {
    void _passedParam;

    if (!options?.command) {
      this.printRuntimeGuide();
      return;
    }

    switch (options.command) {
      case 'sub1':
        await this.sub1();
        break;
      case 'sub2':
        await this.sub2();
        break;
      default:
        console.log(`未找到子命令: ${options.command}`);
        this.printRuntimeGuide();
        break;
    }
  }

  @Option({
    flags: '-c, --command [command]',
    description: '要执行的子命令，例如 sub1、sub2',
  })
  getSubCommand(val: string): string {
    return val;
  }

  /**
   * 打印运行时帮助指引。
   *
   * ⚠️ 重要：必须以当前命令的实际名称为准，不要从其他命令复制粘贴。
   * - 命令名、示例中的命令名必须与 @Command({ name }) 一致
   * - 选项说明应与 @Option 定义的 flags 对齐
   */
  private printRuntimeGuide() {
    console.log('XxxCommand 运行说明:');
    console.log('for linux npm run cli xxx -- -c <command> [options]');
    console.log('for windows  npm run cli -- xxx -- -c <command> [options]');
    console.log('');
    console.log('可用子命令:');

    for (const item of this.getCommandDescriptions()) {
      console.log(`  ${item.name.padEnd(20, ' ')}${item.description}`);
    }

    console.log('');
    console.log('示例:');
    console.log('  npm run cli -- xxx -- -c sub1');
    console.log('  npm run cli -- xxx -- -c sub2');
  }

  /**
   * 返回子命令名称与描述的映射。
   *
   * ⚠️ 重要：
   * - 必须与 run() 中 switch/case 分支一一对应
   * - 新增子命令时，需同时更新 switch/case 和本方法
   * - 不要从其他命令复制，名称和描述必须匹配当前命令
   */
  private getCommandDescriptions(): Array<{ name: string; description: string }> {
    return [
      { name: 'sub1', description: '子命令1的描述' },
      { name: 'sub2', description: '子命令2的描述' },
    ];
  }

  private async sub1() {
    await this.xxxService.doSomething();
  }

  private async sub2() {
    const result = await this.xxxService.doOther();
    console.log(result);
  }
}
```

### 模式二：单一命令

适用于职责单一、不需要子命令分发的场景。

```typescript
import { Command, CommandRunner } from 'nest-commander';
import { XxxService } from 'src/service/xxx.service';

@Command({
  name: 'xxx:action',
  description: '该命令的描述',
})
export class XxxCommand extends CommandRunner {
  constructor(
    private readonly xxxService: XxxService,
  ) {
    super();
  }

  async run(_passedParam: string[], _options?: any): Promise<void> {
    void _passedParam;
    void _options;
    await this.xxxService.doSomething();
  }
}
```

## 标准步骤

1. **确定命令归属**
   - 查看 `src/commands/` 下是否已有同领域的命令文件
   - 若已有，在对应文件中新增子命令（switch case + 私有方法 + getCommandDescriptions 条目）
   - 若不存在，创建新文件 `src/commands/{domain}.command.ts`

2. **编写命令类**
   - 使用 `@Command()` 装饰器定义命令名称和描述
   - 继承 `CommandRunner`，实现 `run()` 方法
   - 通过构造函数注入所需的 service
   - 如果需要子命令，添加 `@Option()` 装饰器、`switch/case` 分发、`printRuntimeGuide()` 和 `getCommandDescriptions()`
   - ⚠️ `printRuntimeGuide()` 和 `getCommandDescriptions()` 必须与 `@Command({ name })` 及 `switch/case` 分支保持一致，**禁止从其他命令复制粘贴后忘记修改**

3. **确保 service 已就绪**
   - 命令调用的 service 方法必须已存在或同步创建
   - 如需新 service，先在 `src/service/` 下创建

4. **注册到 CliModule**
   - 在 `src/modules/cli.module.ts` 中：
     - 添加命令类的 import 语句
     - 将命令类加入 `providers` 数组
     - 如有新 service，同样加入 `providers` 数组

5. **最小验证**
   - 编译通过，无新增类型错误
   - 命令可通过 `npm run cli -- {name} --help` 查看帮助
   - 子命令可通过 `npm run cli -- {name} -- -c {subcommand}` 执行

## 输出要求（完成定义）

- 命令类已在 `src/commands/` 下创建或更新
- 对应 service 方法已实现并被命令调用
- `src/modules/cli.module.ts` 注册完整，依赖注入可用
- 包含 `printRuntimeGuide()` 和 `getCommandDescriptions()` 提供使用指引（复合命令模式）
- 命名、目录与现有代码风格保持一致
- 导入路径使用从 `src/` 根目录的绝对路径

