# 后端架构实施真源文档

更新时间：2026-10-08（本轮仅同步衣物整理验收与归档引用）

## 1. 当前后端语言和框架

- 语言：TypeScript / Node.js 22
- 框架：NestJS 11 + Fastify
- 数据库：MikroORM，默认 SQLite，可切 PostgreSQL
- 页面：Handlebars 服务端渲染，同时提供微信小程序原生 API

## 2. 规则来源

- 架构决策：`docs/adr/`
- 领域术语：`CONTEXT.md`
- 项目状态：`PROJECT_STATE.md`
- 运行脚本：`package.json`
- 后端入口：`src/main.ts`、`src/app.module.ts`

## 3. 目录责任表

| 目录           | 负责什么                                    | 不放什么                          |
| -------------- | ------------------------------------------- | --------------------------------- |
| `src/auth`     | Web 登录、微信小程序登录、JWT、鉴权 Guard   | 衣物业务规则                      |
| `src/wardrobe` | 衣物、搭配、日历、统计、小程序衣橱 API；穿搭候选、温度/状态规则、方案去重和整套颜色关系 | AI 模型调用细节、底层文件存储实现 |
| `src/ai`       | 衣物图片识别、AI 搭配请求、JSON 解析和响应形状清洗 | 衣物入库保存、数据库查询、小程序穿搭确定性规则 |
| `src/weather`  | 腾讯天气代理、天气归一化、缓存与降级        | 穿搭筛选、位置持久化              |
| `src/file`     | 图片上传、读取、本地/S3 存储、抠图/白底处理 | 衣物业务字段判断                  |
| `src/dal`      | MikroORM 连接、实体、迁移                   | Controller 或页面逻辑             |
| `views`        | Web/PWA 服务端页面模板                      | 小程序原生页面逻辑                |
| `miniprogram`  | 微信小程序原生页面和 API 请求封装           | 后端业务逻辑                      |

## 4. 请求入口规则

- Web 页面请求进 `WardrobeController`、`OutfitController`、`CalendarController` 等页面 Controller。
- 微信小程序请求进 `MiniappWardrobeController`、`MiniappOutfitController`、`MiniappDailyOutfitController`、`MiniappAuthController`。
- 小程序穿搭推荐可携带 `auto`、`manual` 或 `unavailable` 天气选择；原始坐标只随当前推荐请求发送，后端返回城市、当前温度、未来八小时温度或降级原因。
- **穿搭推荐调用方必须显式声明规则模式**：`OutfitGeneratorService` 的入口以必填 `mode` 字段区分 `legacy-web` 与 `miniapp-taxonomy-v1`，调用方按自身身份声明，不得由天气字段或其它数据是否存在来推断模式。小程序入口恒定声明 `miniapp-taxonomy-v1`，网页入口恒定声明 `legacy-web`。
- 与此配套：「用哪套规则」是调用方身份，「本次有没有拿到实时温度」是数据事实，两者不得互相推断。温度不可用时用 `status: 'unavailable'` 的上下文表达，不用字段缺省表达；请求里天气字段缺省应归一为 `unavailable` 后继续按原规则生成，天气字段存在但格式非法才是参数错误。
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
- 管理员存量衣物 AI 补标签的合并、镜像字段同步和单件事务落库也放 `GarmentService`；`MiniappAdminService` 只负责管理员校验、批次、超时和并发锁。
- 与小程序请求格式、multipart 字段读取、返回给小程序的 view model 有关的规则放 `MiniappWardrobeController`。
- 与今日穿搭 multipart 读取、全身照校验、返回给小程序的今日穿搭 view model 有关的规则放 `MiniappDailyOutfitController`。
- 今日穿搭整体照片保存归 `FileService.storeOriginalImageFromFileUpload`，不走衣物抠图；`Outfit.photo` 关联归 `OutfitService`；场合、评分、反馈等口味字段归 `CalendarService`。
- 与模型提示词、AI 返回规范有关的规则放 `GarmentVisionService` 或 `OutfitAiService`。

## 8. 数据库访问规则

- 数据库访问通过 MikroORM Repository 或 EntityManager。
- 衣物数据查询和保存统一走 `GarmentService`。
- `Outfit` 可通过 `photo_id` 关联一张整体穿搭照片；读取今日穿搭时需要 populate `outfit.photo`，否则小程序看不到全身照。
- 小程序用户隔离必须带 `userId`，有登录用户时查 `owner.id`，无登录模式只查 `owner=null`。
- 管理员库存导出不新增角色表，使用 `MINIAPP_ADMIN_USER_IDS` / `MINIAPP_ADMIN_WECHAT_OPEN_IDS` 环境变量做白名单；管理员接口读取其他用户库存时必须先校验当前 JWT 用户是否在白名单内。
- 管理员补标签接口为 `POST /api/miniapp/admin/users/:id/garments/backfill-tags`。它只允许白名单管理员调用，按目标用户隔离并对同一目标用户加进程内运行锁；本版本的正式试点范围仅为老婆账号。
- 管理员标记验收沙盒接口为 `POST /api/miniapp/admin/users/:id/acceptance-sandbox`。只允许白名单管理员调用；目标用户尚不是沙盒且已有衣物、搭配、今日穿搭或反馈时拒绝标记。
- 管理员衣橱复制预览为 `GET /api/miniapp/admin/wardrobe-copy/preview`，执行为 `POST /api/miniapp/admin/wardrobe-copy`。只允许白名单管理员调用；目标必须已是验收沙盒；确认件数必须与源一致；照片通过 `FileService.copyStoredFile` 复制，不走抠图。

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
| 标记验收沙盒  | `{ item: { id, acceptanceSandbox } }`          |
| 衣橱复制预览  | `{ source, target }`                             |
| 衣橱复制结果  | `{ complete, copied, matched }`                  |
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
- 小程序管理员接口统一放在 `MiniappAdminController`，入口为 `/api/miniapp/admin/*`，只允许配置白名单里的管理员访问。
- 管理员补标签接口在 Controller 手动校验 `limit` 必须是 1 至 3 的整数；项目没有全局 `ValidationPipe`，不能只依赖 DTO 装饰器。

## 13. 配置读取规则

- 全局配置在 `src/app.module.ts` 的 `ConfigModule.forRoot` 中声明和校验。
- 腾讯天气只通过后端 `TencentWeatherService` 调用；canonical 配置只有 `TENCENT_LBS_KEY`、`TENCENT_LBS_BASE_URL`、`TENCENT_LBS_TIMEOUT_MS`。小程序包不包含腾讯 Key，设备本地只保存天气模式和可选城市，不保存经纬度。
- 生产 `.env` 不提交 GitHub。
- Qwen 识图必须确认 `QWEN_API_KEY`、`QWEN_API_BASE_URL`、`QWEN_VISION_MODEL=qwen3.7-plus`。
- 管理员入口显示和管理员导出依赖 `MINIAPP_ADMIN_USER_IDS` 或 `MINIAPP_ADMIN_WECHAT_OPEN_IDS`，生产环境至少配置其中一个；不配置时普通用户和当前登录用户都看不到管理员入口。

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
- 普通新增/编辑衣物仍必须由用户确认 AI 结果。只有管理员对指定存量衣物执行补标签时，才允许在一次明确确认的批处理里自动追加白名单内的缺失标签；该例外不得覆盖已有标量或数组标签，也不得修改 `garment.category`。
- 不要破坏微信用户隔离，所有衣橱查询和保存都必须考虑 `userId`。
- 不要提交 `.env`、微信 AppSecret、Qwen Key。

## 20. 后续变更规则

### 功能分支：衣物手动整理（TASK-05b，尚未正式上线）

- 新上传原图归 GarmentService.originalPhoto；FileService 先保存上传原字节，再沿用一次抠图。历史原图关系为空，不回填。
- MiniappGarmentImageController 提供 POST/GET /api/miniapp/garments/:id/normalization，JSON 均为 {item: NormalizationView}；入口复用 JWT Guard 并显式拒绝无主人。GET 图片 original/display/candidate 带 v=File.id，私有图按主人及当前版本读取，private,no-store；公开文件三入口拒绝私有名和路径绕路。
- GarmentImageNormalizationService 拥有每件衣物一份当前记录及确定性五类路由；不直接修改衣物资料/展示。Worker 经公开 claimQueued/saveProviderResult/completeCandidate/markFailed/markUncertain 操作，在独立 RequestContext 中先持久化领取与 dispatchedAt，再发送一次模型请求。小程序请求不等待生成，不拥有后台任务生命周期。
- GarmentImageService 拥有固定文本、输入归一和供应商边界，公开 generate 返回 {requestId,imageUrl,usage}；GARMENT_IMAGE_FETCH 可注入。没有自由 prompt 或额外 Vision 识别。downloadImage 只下载已返回图片；供应商 URL 不进入公开快照。
- QWEN_IMAGE_ENABLED 默认 false；新增 QWEN_IMAGE_MODEL/QWEN_IMAGE_API_URL/QWEN_IMAGE_TIMEOUT_MS，沿用 QWEN_API_KEY。只允许 qwen-image-3.0-pro，固定 n=1/1024*1024/seed=701/禁止扩写与水印。前端不持有 Key。
- 详情通过窄辅助文件组织开始、状态和候选预览；未明确采用时 photo 不变。后台停轮询、返回先查、超时只查原次与晚到失效已支持。
- POST normalization/adopt 仅接收 attemptKey，整理 Owner 校验 ready/当前候选并调用 GarmentService.adoptNormalizedPhoto；衣物 Owner 校验主人及 File 所属，条件切换 photo，重复同候选幂等、冲突 409，不上传/删除/改资料。adopted 始终从真实照片关系派生。
- view-models/garment-photo.view-model.ts 是唯一当前图 URL 映射；私有图 display?v=File.id，旧公开 URL 兼容。衣橱及采用响应共用无 ORM/物理文件名的 garmentViewModel，重复候选、规则/AI 推荐和今日穿搭卡片共用 garmentPhotoUrl。api.js 图片业务出口统一认证下载并局部保留图片失败的资料，三种图片字段及嵌套数组由 image-source 解析；身份/完整版本 URL 隔离，推荐 onShow 仅更新已有卡片 photoUrl。
- Worker 启动通过 Owner.recoverDispatched 将已派发记录保守置为 uncertain，queued 才可首次 POST。claimResultDownloads 仅条件领取已有 URL 的下载，下载失败不转 failed，也不重生；数据库恢复后耗时生成在后台执行，不阻塞服务器监听。写回必须同时匹配记录/attempt，ready 后不覆盖候选。
- 一条当前记录不增加历史字段；新手动 retry 仅 failed 可用，通过递增 base36 时间前缀的 attemptKey 拒绝所有旧次重放，并条件更新失败记录。unknown/ready 和同次 key 始终只返回当前快照，前端不自动重试 POST。
- GarmentImageTransferService 是备份/复制的窄协调层，只使用 GarmentService.exportPhotoSnapshot/create、整理 Owner 的 exportSnapshot/restoreSnapshot 及 FileService 字节端口，不访问内部 Repository。版本 3 按 File ID 去重导出四类图片；导入先全包预检声明引用，版本 1/2 无原图保持空，再按包内引用去重建立目标主人文件。沙盒复制沿用原有权限/计数限制，源仅只读。
- 整理快照仅包含状态、类别、提示词版本、模型及输入/候选引用；不携带 attemptKey、供应商请求信息或结果 URL。目标生成独立本地 key，ready 候选静态可读，queued/processing/uncertain 恢复为 uncertain，不进入 Worker 派发。
- Local/S3.copyStoredFile 识别私有标记，原字节、MIME 和目标主人保留，不抠图或发布公有 ACL。普通换图也保留带原图衣物及私有图片的旧字节，防止损坏整理输入/候选；无原图的普通历史公开图仍沿用既有清理行为。

以上是本地施工事实，不是正式上线或真实桶权限证明；P5 已通过，P6 已获用户按约定范围确认关闭。真实 S3 桶权限等未验项仍保留，正式部署、提交和后续收费联调仍须独立授权。

后续已按单独授权搭建独立手机验收后台、上传 1.0.9 体验版；这不是生产业务替换或正式发布。用户手机补测和受控派发次数见 [手机验收记录](archive/2026-10-08-衣物手动-AI-整理与预览采用/test.md#P6-CURRENT-PHONE-20261008)，用户于 2026-10-08 确认的整轮范围、保留的 SPEC GAP 和未验项见 [整轮收口](archive/2026-10-08-衣物手动-AI-整理与预览采用/test.md#P6-CURRENT-CLOSED-20261008)。手机夹具仍不证明真实 S3 桶权限。

任何新增后端功能都必须先回答：

1. 请求从哪个 Controller 进入？
2. 业务规则放哪个 Service？
3. 数据怎么按用户隔离？
4. 返回给小程序的 JSON 形状是什么？
5. 有哪条单测证明它没有破坏旧流程？

如果目录责任、接口形状、环境变量或部署命令变化，必须同步更新本文档和 `PROJECT_STATE.md`。
