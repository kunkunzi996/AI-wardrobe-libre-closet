# 后端架构实施真源文档

更新时间：2026-06-28

## 1. 当前后端语言和框架

- 语言：TypeScript / Node.js 22
- 框架：NestJS 11 + Fastify
- 数据库：MikroORM，默认 SQLite，可切 PostgreSQL
- 页面：Handlebars 服务端渲染，同时提供微信小程序原生 API

## 2. 规则来源

- 架构说明：`docs/ARCHITECTURE_HANDOFF.md`
- 项目状态：`PROJECT_STATE.md`
- 运行脚本：`package.json`
- 后端入口：`src/main.ts`、`src/app.module.ts`

## 3. 目录责任表

| 目录           | 负责什么                                    | 不放什么                          |
| -------------- | ------------------------------------------- | --------------------------------- |
| `src/auth`     | Web 登录、微信小程序登录、JWT、鉴权 Guard   | 衣物业务规则                      |
| `src/wardrobe` | 衣物、搭配、日历、统计、小程序衣橱 API      | AI 模型调用细节、底层文件存储实现 |
| `src/ai`       | 衣物图片识别、AI 搭配文本生成               | 衣物入库保存、数据库查询          |
| `src/file`     | 图片上传、读取、本地/S3 存储、抠图/白底处理 | 衣物业务字段判断                  |
| `src/dal`      | MikroORM 连接、实体、迁移                   | Controller 或页面逻辑             |
| `views`        | Web/PWA 服务端页面模板                      | 小程序原生页面逻辑                |
| `miniprogram`  | 微信小程序原生页面和 API 请求封装           | 后端业务逻辑                      |

## 4. 请求入口规则

- Web 页面请求进 `WardrobeController`、`OutfitController`、`CalendarController` 等页面 Controller。
- 微信小程序请求进 `MiniappWardrobeController`、`MiniappOutfitController`、`MiniappDailyOutfitController`、`MiniappAuthController`。
- 小程序手动保存今日穿搭仍走 `MiniappDailyOutfitController`，请求为 multipart，照片字段名为 `photo`。
- Controller 只负责接请求、读参数、调用 Service、组织返回，不直接写复杂业务规则。

## 5. 新增模块文件组织规则

新增衣橱业务功能时优先放在已有 `WardrobeModule` 内：

- API 入口：`src/wardrobe/*controller.ts`
- 业务判断：`src/wardrobe/*service.ts`
- AI 模型请求：`src/ai/*service.ts`
- 数据字段：`src/dal/entity/*.entity.ts`
- 单测：跟随被测文件放同目录，命名为 `*.spec.ts`

不要为了一个小功能新建独立大模块，除非它有清楚的长期职责。

## 6. 参数校验规则

- 小程序上传图片必须先在 Controller 校验文件存在和 `image/*` 类型。
- 今日穿搭全身照必须上传图片，但不要求选择衣柜单品；衣柜单品只作为可选关联。
- 分类等必填字段在 Controller 做入口校验。
- 字段标准化在 Service 内处理，例如 `GarmentService` 负责尺寸、标签、数字、日期标准化。

## 7. 业务规则放置位置

- 与衣物库存、入库、更新、查询有关的规则放 `GarmentService`。
- 与小程序请求格式、multipart 字段读取、返回给小程序的 view model 有关的规则放 `MiniappWardrobeController`。
- 与今日穿搭 multipart 读取、全身照校验、返回给小程序的今日穿搭 view model 有关的规则放 `MiniappDailyOutfitController`。
- 今日穿搭整体照片保存归 `FileService.storeOriginalImageFromFileUpload`，不走衣物抠图；`Outfit.photo` 关联归 `OutfitService`；场合、评分、反馈等口味字段归 `CalendarService`。
- 与模型提示词、AI 返回规范有关的规则放 `GarmentVisionService` 或 `OutfitAiService`。

## 8. 数据库访问规则

- 数据库访问通过 MikroORM Repository 或 EntityManager。
- 衣物数据查询和保存统一走 `GarmentService`。
- `Outfit` 可通过 `photo_id` 关联一张整体穿搭照片；读取今日穿搭时需要 populate `outfit.photo`，否则小程序看不到全身照。
- 小程序用户隔离必须带 `userId`，有登录用户时查 `owner.id`，无登录模式只查 `owner=null`。

## 9. 接口响应规则

小程序 API 当前返回普通 JSON：

| 场景          | 返回形状                                       |
| ------------- | ---------------------------------------------- |
| 衣物列表      | `{ items: [...] }`                             |
| 衣物详情      | `{ item: {...} }`                              |
| 新增/更新衣物 | `{ item: {...} }`                              |
| AI 识别草稿   | `{ draft: {...}, duplicateCandidates: [...] }` |
| 今日穿搭查询  | `{ date, items: [...] }`                       |
| 今日穿搭保存  | `{ item: {...} }`                              |
| 删除成功      | `{ ok: true }`                                 |
| 备份导入      | `{ imported, skipped }`                        |
| 参数错误      | NestJS `BadRequestException`                   |
| 未登录/无权限 | `ConditionalAuthGuard` 或 Service 抛错         |

新增小程序 API 时优先沿用这些形状，不要临时发明新的外层格式。

## 10. 错误处理规则

- 参数错误使用 `BadRequestException`。
- 找不到资源使用 `NotFoundException`。
- 越权访问使用 `ForbiddenException`。
- Web 页面错误最终由 `ErrorViewFilter` 渲染错误页；JSON API 由 Nest/Fastify 返回错误响应。

## 11. HTTP 状态码规则

- `GET` 成功默认 200。
- `POST` 创建/更新当前沿用 200/201 的 Nest 默认行为。
- `DELETE` 衣物接口显式使用 200 并返回 `{ ok: true }`。
- 参数错误、未登录、无权限、未找到优先使用 Nest 标准异常。

## 12. 权限校验入口

- Web 和小程序衣橱相关 Controller 使用 `ConditionalAuthGuard`。
- 小程序登录通过 `/api/miniapp/auth/login` 换取 JWT。
- 后续小程序请求必须带 `Authorization: Bearer ...`，Guard 会把 `request.user.userId` 写入请求。

## 13. 配置读取规则

- 全局配置在 `src/app.module.ts` 的 `ConfigModule.forRoot` 中声明和校验。
- 生产 `.env` 不提交 GitHub。
- Qwen 识图必须确认 `QWEN_API_KEY`、`QWEN_API_BASE_URL`、`QWEN_VISION_MODEL=qwen3.7-plus`。

## 14. 日志入口和日志格式

- 日志模块在 `src/app.module.ts` 中配置 `nestjs-pino`。
- 日志输出到控制台和 `DATA_PATH/app.log`。
- 业务服务可使用 Nest `Logger` 记录 AI、文件、微信登录等失败原因。

## 15. 启动命令和健康检查证据

常用命令：

```bash
npm run build
npm test -- miniapp-wardrobe.controller.spec.ts garment.service.spec.ts conditional-auth.guard.spec.ts garment-vision.service.spec.ts --runInBand
npm run test:miniapp
```

生产容器验证：

```bash
docker ps
curl https://aimatchwear.asia/api/miniapp/garments
docker exec ai-wardrobe sh -c 'echo "QWEN_VISION_MODEL=$QWEN_VISION_MODEL"'
```

2026-06-19 验收结果：

- `npm run build` 通过。
- 后端关键单测 4 个 suite、25 个测试通过。

## 16. 数据库连接验证方式

- 本地/生产启动时 `AppModule.onModuleInit` 执行 MikroORM migration。
- `DalModule.onModuleInit` 会根据 `DATABASE_TYPE` 初始化 SQLite 或 PostgreSQL。
- SQLite 会执行 `PRAGMA journal_mode = WAL;` 并记录日志。

## 17. 框架最大化利用原则

- 路由、依赖注入、异常、Guard、配置校验优先使用 NestJS 原生机制。
- 数据库实体、Repository、迁移优先使用 MikroORM 机制。
- 不为 MVP 小功能提前引入复杂队列、微服务或自定义框架层。

## 18. 项目自定义封装边界

- `FileService` 是文件存储抽象，允许本地/S3 切换。
- 衣物照片使用 `storeImageFromFileUpload`，会做衣物抠图/白底处理；今日穿搭全身照使用 `storeOriginalImageFromFileUpload`，只做原图方向校正、WebP 转换和尺寸标准化。
- `ConditionalAuthGuard` 是本项目的 Web/小程序共用鉴权入口。
- `GarmentVisionService` 是衣物图片识别边界。
- `OutfitAiService` 是搭配文本生成边界。

这些封装已经在当前代码中被使用；新增功能优先复用，不要绕开。

## 19. 禁止事项

- 不要把小程序业务规则直接写进 `miniprogram` 前端绕过后端。
- 不要在 Controller 里堆数据库查询和复杂算法。
- 不要让 AI 识图结果直接保存入库，必须先让用户确认。
- 不要破坏微信用户隔离，所有衣橱查询和保存都必须考虑 `userId`。
- 不要提交 `.env`、微信 AppSecret、Qwen Key。

## 20. 后续变更规则

任何新增后端功能都必须先回答：

1. 请求从哪个 Controller 进入？
2. 业务规则放哪个 Service？
3. 数据怎么按用户隔离？
4. 返回给小程序的 JSON 形状是什么？
5. 有哪条单测证明它没有破坏旧流程？

如果目录责任、接口形状、环境变量或部署命令变化，必须同步更新本文档和 `PROJECT_STATE.md`。
