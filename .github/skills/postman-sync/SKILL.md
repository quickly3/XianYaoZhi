---
name: postman-async
description: 生成并更新本地 Postman Collection（异步脚本），包含运行示例、输出路径与常见故障排查
triggers:
	- 生成 postman 文件
	- 更新 postman collection
	- 生成 collection
	- 从 API 生成 Postman 集合
	- 根据 Swagger 生成 Postman 文件
	- 自动同步 Postman 集合
	- generate postman collection
	- sync postman collection
---

# Postman Collection 同步 Skill

这是用于生成并更新本地 Postman Collection 的说明文档。项目内使用的脚本位于 `script/sync-postman.ts`，可通过 npm 脚本触发。

**主要目的**：自动从 NestJS 的 Swagger/OpenAPI 文档生成 Postman Collection，方便在 Postman 中导入并调用 API。

**脚本位置**：
- `script/sync-postman.ts`

**输出文件**：
- `postman/bean-engine.collection.json`（脚本会确保目录存在并覆盖写入）

**命令（推荐）**：

运行项目根目录下的 npm 命令：

```bash
npm run postman:async
```

该命令应执行项目内已经配置的脚本（一般会使用 `ts-node` 或已构建的 Node 可执行文件来运行 `script/sync-postman.ts`）。如果仓库没有对应 npm 脚本，请使用下面的替代命令直接运行：

```bash
npx ts-node script/sync-postman.ts
# 或 (如果已编译到 dist)
node dist/script/sync-postman.js
```

**脚本功能要点**：
- 使用 Nest 的 `SwaggerModule.createDocument()` 从运行时 AppModule 生成 OpenAPI JSON。
- 使用 `openapi-to-postmanv2` 将 OpenAPI 转为 Postman Collection。
- 将 collection 中的每个请求名替换为真实的 route path，便于识别。
- 写入到 `postman/bean-engine.collection.json`。

**环境与前置条件**：
- 需要在能启动 Nest 应用的 Node 环境下运行（脚本会短暂创建 Nest 应用上下文）。
- 若使用 TypeScript 直接运行，需安装并可用 `ts-node`。项目通常在 `devDependencies` 中已有。
- 若脚本报错，请确保 `src/modules/app.module.ts` 注册了 controller/providers，且没有在启动时依赖缺失的外部服务（数据库、Elasticsearch 等），否则建议在启动脚本中使用 mock/替代配置或在 CI 环境准备好依赖。

**运行示例**：

```bash
# 在仓库根目录执行
npm run postman:async

# 输出示例
# Postman collection updated: /path/to/repo/postman/bean-engine.collection.json
```

**常见问题与排查**：
- 错误：`Failed to convert OpenAPI to Postman collection` —— 检查 `openapi-to-postmanv2` 的输入是否为合法的 OpenAPI JSON，尝试把 `openApiDocument` 写到临时文件并用 validator 校验。
- 错误：Nest 应用启动卡住/报依赖注入错误 —— 临时在 `AppModule` 中注入 `ConfigModule.forRoot({ ignoreEnvFile: true })` 或在脚本中 mock 需要的配置；或在脚本中捕获并记录更详细的错误堆栈。
- 输出 collection 请求路径不正确 —— 脚本中有 `renameApiItemsByRoutePath` 函数，会把请求名改为 `path` 数组拼接的结果；如路由使用变量或 basePath，确认 `item.request.url.path` 是否为预期结构。

**建议的改进点（可选）**：
- 增加一个 CLI 参数以指定输出路径（默认 `postman/bean-engine.collection.json`）。
- 支持仅生成某个 tag/分组的 collection（通过过滤 OpenAPI paths）。
- 在 CI/CD 中加入步骤，自动在 master/main 分支变更时更新 collection 并提交到仓库。

如果你希望，我可以：
- 把该说明同步到 README 或 repo 文档中；
- 为 `script/sync-postman.ts` 增加 CLI 参数支持（输出路径、包含/排除 tag）；
- 检查并（如需要）在 `package.json` 中添加或修正 `postman:async` 脚本。
