---
name: create-frontend-page-guide
description: 根据 NestJS controller docs（ApiQuery、ApiOkResponse.schema.example）生成前端页面指导文档，明确筛选项、列表字段、分页规则、接口契约与页面交互
---

# 生成前端页面指导文件

## 适用场景

- 已有后端 Swagger docs 组合装饰器文件（例如 `src/controller/docs/*.controller.docs.ts`）
- 需要快速输出可执行的前端页面实现说明（给前端同学或 AI 编码助手）
- 需要把接口参数与返回结构转换成页面筛选区、列表区、分页与状态逻辑

## 输入要求

- 必需：controller docs 文件（包含 `ApiOperation`、`ApiQuery`、`ApiOkResponse`）
- 建议：对应 examples 文件（`src/controller/docs/examples/*.controller.examples.ts`）
- 可选：controller/service 文件，用于补齐路由路径与字段语义

## 执行原则

- 以 docs 为单一事实来源：优先使用 `ApiQuery` 与 `schema.example`
- 不臆造字段：example 中没有的字段标记为“待后端确认”
- 先数据契约，再页面结构：避免先画 UI 再反推接口
- 输出可落地：结果应可直接用于页面开发，不写空泛建议
- 与现有风格一致：命名、分页规则、错误处理遵循项目约定

## 标准步骤

1. 提取接口清单
- 从 docs 文件中收集每个导出的装饰器函数
- 读取 `ApiOperation.summary` 作为页面/模块名称
- 识别是否为“基础列表”和“带关联信息列表”（如含 dataSource）

2. 提取查询参数并映射到筛选区
- 收集全部 `ApiQuery` 项：`name`、`type`、`required`、`description`
- 识别通用分页参数：`page`、`pageSize`
- 将字符串模糊查询参数（如 `keyword`、`indicator`）映射到输入框
- 将数值精确过滤参数（如 `sourceId`）映射到选择器/数字输入
- 输出默认值与边界（例如 `page=1`、`pageSize=20`、最大 100）

3. 提取响应结构并映射到列表区
- 从 `ApiOkResponse.schema.example` 引用对象读取分页壳与 `items` 结构
- 拆分字段为：主列、次要列、可折叠列、关联对象列
- 若存在“含关联对象”响应，补充展开列或详情侧栏方案

4. 生成页面交互规范
- 查询：输入变更后手动点击查询；重置恢复默认参数
- 分页：切页仅修改 `page`；改 pageSize 后重置 `page=1`
- 排序：若 docs 未声明排序参数，默认不开放服务端排序
- 空态：无数据展示空状态，不报错
- 异常：请求失败展示错误提示并保留当前筛选条件

5. 生成前端实现建议
- 定义请求参数类型与响应类型（TypeScript interface）
- 定义 API 方法签名（list/query）
- 定义页面状态：`loading`、`list`、`total`、`query`
- 约定防抖策略（仅对文本输入可选防抖）

6. 给出验收清单
- 参数名与后端 docs 一致
- 默认分页与最大页大小正确
- 列表字段与 example 对齐
- 查询、重置、分页、错误提示可用

## 输出格式（必须）

输出一个“前端页面指导文件”，按以下结构组织：

1. 页面目标
- 页面名称
- 对应接口
- 使用场景

2. 接口契约
- 查询参数表（参数名、类型、必填、默认值、说明、控件类型）
- 响应结构（分页字段 + 列表项字段）

3. 页面结构
- 筛选区
- 列表区
- 分页区
- 空态/异常态

4. 交互流程
- 初次加载
- 查询
- 重置
- 分页切换

5. 类型与伪代码
- TypeScript 类型定义
- 请求函数签名
- 页面状态与核心调用流程

6. 待确认项
- docs/example 未覆盖的字段或规则
- 与后端需确认的边界条件

## 针对当前 WBG docs 的快速映射示例

- 筛选区：`code`、`keyword`、`sourceId`、`indicator`
- 分页：`page`、`pageSize`（默认 1/20，pageSize 最大 100）
- 列表数据来源：
  - `dataSourcePageExample`
  - `indicatorPageExample`
  - `indicatorWithSourcePageExample`
- 页面可拆分为：
  - 数据源列表页
  - 指标列表页
  - 指标+数据源关联列表页
