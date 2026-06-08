---
name: create-api
description: 在 controller 中新增 API 时，同步在对应 service 中实现方法、完成 module 注册，并按规范拆分 Swagger 文档
---

# 创建API

## 适用场景

- 需要新增一个 NestJS API（查询、创建、更新、删除等）
- 需要在 controller 与 service 间建立清晰调用链
- 需要确保新建 controller/service 在 module 中正确注册

## 执行原则

- 先确认归属模块，优先复用现有 controller 与 service
- controller 只做参数接收、校验与调用，不写业务细节
- 业务逻辑放在 service，方法命名与 API 语义一致
- 新创建的 function/method 必须写到对应代码文件的末尾（下方），不得插入已有代码中间
- Swagger 装饰器描述从 controller 中抽离：每个 controller 对应一个 docs 文件
- docs 文件使用组合装饰器（`applyDecorators`）封装接口文档，controller 只引用
- `schema.example` 统一从独立 examples 文件导入，避免 docs 文件过长
- 每个接口优先补充 `ApiOkResponse` 的 `schema.example`；若暂无真实样例可先给空模板
- 变更最小化，只修改与需求直接相关文件

## 标准步骤

1. 定位目标模块与现有文件
	- 查找相关 `*.controller.ts`、`*.service.ts`、`*.module.ts`
	- 若不存在，则在该模块下创建对应文件
2. 在 controller 中新增路由方法
	- 使用合适的 HTTP 装饰器（GET/POST/PATCH/DELETE）
	- 定义参数装饰器（Param/Query/Body）并调用 service
	- 新增方法统一放到 controller 类的最下方（末尾）
3. 新增/更新 Swagger docs 文件（与 controller 一一对应）
	- 文件位置：`src/controller/docs/<name>.controller.docs.ts`
	- 命名建议：与 controller 同名，如 `wbg-query.controller.ts` 对应 `wbg-query.controller.docs.ts`
	- 在 docs 文件中导出组合装饰器函数（示例：`ApiGetXxxDocs`）
	- 将 `ApiOperation`、`ApiQuery`、`ApiOkResponse` 等从 controller 移入 docs
	- 在 `ApiOkResponse` 中添加 `schema.example`，并从 examples 文件导入
4. 新增/更新 examples 文件（与 controller 一一对应）
	- 文件位置：`src/controller/docs/examples/<name>.controller.examples.ts`
	- 命名建议：与 controller 同名，如 `wbg-query.controller.examples.ts`
	- 只维护可复用的 example 常量（例如：`xxxPageExample`）
	- 无样例时可使用空字符串/空数组/null 占位，后续再替换真实数据
5. 在 controller 中引用 docs 组合装饰器
	- controller 保留路由与参数接收，仅使用 `@ApiGetXxxDocs()` 等单行装饰器
	- controller 中不再堆叠大量 `ApiQuery`/`ApiOperation`/`ApiOkResponse`
6. 在 service 中新增对应方法
	- 方法名与 controller 调用一致
	- 在 service 中实现业务逻辑与数据访问
	- 新增方法统一放到 service 类的最下方（末尾）
7. 完成依赖注入与模块注册
	- 确保 controller/service 在 `module` 的 `controllers`、`providers` 中注册
	- 若跨模块调用，检查 `exports/imports` 是否完整
8. 最小验证
	- 编译通过，无新增类型错误
	- 路由可访问，controller 能正确调用 service
	- Swagger 文档展示正常，example 结构与实际返回保持一致

## 输出要求（完成定义）

- API 路由已在 controller 暴露
- 对应 service 方法已实现并被 controller 调用
- module 注册完整，依赖注入可用
- 已新增/更新对应 controller 的 docs 文件（`src/controller/docs/*.controller.docs.ts`）
- 已新增/更新对应 controller 的 examples 文件（`src/controller/docs/examples/*.controller.examples.ts`）
- controller 内 Swagger 描述已抽离为 docs 组合装饰器调用
- 关键接口已提供 `ApiOkResponse.schema.example`，并由 examples 文件集中管理（无真实数据时可占位）
- 命名、目录与现有代码风格保持一致
