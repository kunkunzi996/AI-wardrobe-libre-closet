# 衣橱复制到验收沙盒 PLAN

- 阶段：P3
- 最后更新：2026-08-19
- 上游：用户已认可的 `docs/spec.md`（衣橱复制到验收沙盒）

## 1 目标与非目标

### 上游条目索引

| 编号 | 类型 | 上游位置 | 条目 |
|---|---|---|---|
| MVP-01 | MVP 做 | SPEC 第 2 章第 1 项 | 管理员在库存页把某个已经出现过的衣橱主人标成验收沙盒；困困子和老婆不得被标成验收沙盒。 |
| MVP-02 | MVP 做 | SPEC 第 2 章第 2 项 | 管理员从任意衣橱主人向已标记的验收沙盒做衣橱复制，带走衣物、照片、标签、搭配和品味记录；源衣橱只读，目标得到独立衣橱副本。 |
| MVP-03 | MVP 做 | SPEC 第 2 章第 3 项 | 管理员确认源、目标和将带走的件数后，复制才会执行。 |
| MVP-04 | MVP 做 | SPEC 第 2 章第 4 项 | 对已有副本的验收沙盒再次复制时，系统必须整橱覆盖，不得追加成两套。 |
| MVP-05 | MVP 做 | SPEC 第 2 章第 5 项 | 复制结束后，管理员能看到这次是否拷全，以及搭配、今日穿搭和反馈是否对上沙盒里的那批衣服。 |
| AC-01 | 验收标准 | SPEC 第 3 章第 1 项 | 管理员把已登录的第三只微信标成验收沙盒后能看到已允许写入；把困困子或老婆标成验收沙盒时标记不生效。 |
| AC-02 | 验收标准 | SPEC 第 3 章第 2 项 | 确认复制后，沙盒里能看到对应的衣物、照片、标签、搭配、今日穿搭和反馈，且对上沙盒里的衣服。 |
| AC-03 | 验收标准 | SPEC 第 3 章第 3 项 | 复制完成后，源真人衣橱的件数、内容、照片、搭配和品味记录与复制前一致。 |
| AC-04 | 验收标准 | SPEC 第 3 章第 4 项 | 对已有副本的沙盒再次确认复制后，只剩这一次的新副本。 |
| AC-05 | 验收标准 | SPEC 第 3 章第 5 项 | 对未标记为验收沙盒的衣橱主人发起复制时拒绝写入，源和目标都保持原样。 |
| EX-01 | 严重异常 | SPEC 第 4 章第 1 项 | 未在验收沙盒白名单中的衣橱主人不得被写入。 |
| EX-02 | 严重异常 | SPEC 第 4 章第 2 项 | 未先让管理员确认源、目标和件数前，不得覆盖。 |
| EX-03 | 严重异常 | SPEC 第 4 章第 3 项 | 未完成的复制不得显示为成功，源衣橱仍不得被改动。 |
| EX-04 | 严重异常 | SPEC 第 4 章第 4 项 | 品味记录只能进入已标记的验收沙盒。 |

### 继承自上游的硬约束

| 编号 | 上游原文 |
|---|---|
| HC-01 | 源衣橱只读，衣橱复制不是搬家，也不删除源里的任何衣物、搭配或品味记录。 |
| HC-02 | 只有管理员能做衣橱复制和验收沙盒标记；普通衣橱主人不能复制别人的衣橱。 |
| HC-03 | 衣橱副本只能写入验收沙盒白名单；困困子和老婆不得被标成验收沙盒。 |
| HC-04 | 衣橱副本必须独立：改沙盒不影响源，源后来新增的内容也不会自动进入沙盒。 |
| HC-05 | 手动再拷必须整橱覆盖，不得追加、按名字去重或只更新增量。 |
| HC-06 | 第一版必须带走搭配和品味记录，不得只拷衣物文字或只拷照片。 |
| HC-07 | 衣橱复制验收只看副本是否拷全、对得上，以及源是否未被改动；不得用穿搭好不好用判断本次成功。 |
| HC-08 | 本轮即使复制成功，也不宣布新版穿搭正式启用。 |

### 目标

1. 管理员能在库存页标记验收沙盒，并把任意衣橱主人的整橱做成独立副本写入该沙盒。
2. 再拷时整橱覆盖；源只读；未标记目标拒绝写入。
3. 管理员能按件数和对应关系核对这次是否拷全。

### 非目标

- 不自动同步、不搬家、不给普通用户复制入口。
- 不在本轮验收穿搭好不好用，也不宣布新版穿搭正式启用。
- 不清理磁盘上因覆盖或失败留下的无主照片文件。
- 不修复当前 `npm run test:miniapp` 里与天气穿搭合同有关的既有失败。

## 2 现状调查

- 小程序管理员入口已在 `MiniappAdminController` / `MiniappAdminService`，路径前缀 `/api/miniapp/admin`，只允许环境变量白名单管理员访问。（出处：`src/wardrobe/miniapp-admin.controller.ts`、`src/wardrobe/miniapp-admin.service.ts`、`docs/backend-architecture-source-of-truth.md` 第 8、12 章）
- 用户列表只返回 `id/displayName/nickname/wechatOpenIdMasked/garmentCount`，没有验收沙盒标记。（出处：`src/wardrobe/miniapp-admin.service.ts` 的 `MiniappAdminUserSummary` 与 `listUsers`）
- `User` 实体没有沙盒或保护标记字段。（出处：`src/dal/entity/user.entity.ts`）
- 现成 ZIP 备份只导出当前登录用户的衣物和照片，导入时 `garmentService.create(..., 当前 userId)` 换主人、换新 ID、照片当新上传并走抠图；不带搭配、今日穿搭、反馈，也不覆盖旧数据。（出处：`src/wardrobe/miniapp-wardrobe.controller.ts` 的 `exportBackup` / `importBackup`）
- 没有跨用户复制接口。管理员能读别人库存、导出 Excel、给别人补标，不能把 A 的衣橱写进 B。（出处：`src/wardrobe/miniapp-admin.controller.ts`）
- 衣物、搭配、日历、反馈都按 `owner` 隔离；搭配 `slots.garmentId` 与反馈 `garmentIds` / `coreGarmentId` 记的是数字 ID。（出处：`src/dal/entity/garment.entity.ts`、`src/dal/entity/outfit.entity.ts`、`src/dal/entity/outfit-calendar.entity.ts`、`src/dal/entity/outfit-feedback.entity.ts`）
- `GarmentService.create` 在传入 `photo` 时走 `storeImageFromFileUpload`（会抠图）；`OutfitService.create` 按目标用户的新衣物 ID 关联；`CalendarService.create` 要求目标用户已拥有对应搭配；`OutfitFeedbackService` 没有按用户清空的方法。（出处：`src/wardrobe/garment.service.ts`、`src/wardrobe/outfit.service.ts`、`src/wardrobe/calendar.service.ts`、`src/wardrobe/outfit-feedback.service.ts`）
- 库存页目前只有导出和 AI 补标签，没有沙盒勾选或复制入口。（出处：`miniprogram/pages/admin-inventory/index.wxml`、`miniprogram/pages/admin-inventory/index.js`、`miniprogram/utils/api.js`）
- 归档 TEST 的 Asset ID、名称和 Seam 全部属于穿搭推荐 / 天气，没有衣橱复制、沙盒标记或跨用户备份资产。（出处：`docs/archive/2026-08-18-小程序穿搭出口与调用模式收敛/test.md` 的 Manifest 表）

### 相关项目规则

| 相关规则 | 来源 | 对本方案的影响 | 规划后复核 |
|---|---|---|---|
| 新增衣橱业务优先放在 `WardrobeModule`；API 进 `*controller.ts`，判断进 `*service.ts`，字段进实体和迁移 | `docs/backend-architecture-source-of-truth.md` 第 5 章 | 复制逻辑新建 `WardrobeCopyService`，不另起大模块 | 通过 |
| Controller 只接请求、调 Service、组返回，不写复杂业务 | 同文档第 4 章 | 确认件数、覆盖、重接线都放 Service | 通过 |
| 管理员接口必须先校验当前 JWT 用户在白名单内 | 同文档第 8、12 章 | 标记和复制都走现有 `isAdmin` | 通过 |
| 衣物查询保存走 `GarmentService`；文件存储不进衣橱规则 | 同文档第 3、7、8 章 | 照片独立副本由 `FileService` 公开方法完成，不在复制服务里写磁盘路径 | 通过 |
| 小程序 API 优先沿用现有 JSON 形状 | 同文档第 9 章 | 用户列表仍 `{ items }`；复制结果用计数对象，不发明外层包装 | 通过 |
| 验收沙盒只能由管理员在库存页标记；困困子和老婆不能当沙盒 | `CONTEXT.md`、ADR 0004、SPEC HC-03 | 用「新标成沙盒时，目标已有衣物/搭配/今日穿搭/反馈则拒绝」落实，不把姓名写死进代码 | 通过 |

### 改前基线

- 工作目录：`C:\Users\Administrator\orca\workspaces\Libre-Closet\把老婆的仓库copy一份用到测试环境`
- `npm test -- --runInBand src/wardrobe/miniapp-admin.service.spec.ts src/wardrobe/miniapp-admin.controller.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts`：退出码 `0`，3 个套件、53 项通过。
- `npm run test:miniapp`：退出码 `1`。失败原因是天气穿搭合同两条断言（`recommendOutfit` 形参解析），与本轮衣橱复制无关。本轮不用这条命令做入场门。

## 3 方案

### 模块与数据流

1. 给 `User` 增加 `acceptanceSandbox` 布尔字段，默认否。管理员把某个用户标成验收沙盒时写入该字段。
2. 新标成沙盒时，若该用户已经拥有衣物、搭配、今日穿搭或反馈，拒绝标记。困困子和老婆的真人衣橱都有数据，因此标不上；刚登录、还是空衣橱的第三只微信可以标。已经是沙盒的用户保持标记，即使复制后已有副本。
3. 新增 `WardrobeCopyService`：先预览源/目标的显示名和件数，再在管理员确认且件数与预览一致后执行复制。
4. 首次复制要求目标沙盒当前没有衣物、搭配、今日穿搭和反馈。再拷必须显式确认覆盖，先清空目标这四类数据，再写入新副本。
5. 复制顺序：衣物（含标签和独立照片）→ 建立旧衣物 ID 到新衣物 ID 的对照表 → 搭配（重写 `slots.garmentId` 和关联）→ 今日穿搭（挂到新搭配）→ 反馈（重写 `garmentIds` 与 `coreGarmentId`）。源记录只读。
6. 照片通过 `FileService` 新增的公开复制方法按字节拷到新文件和新 `File` 行，`createdBy` 为目标用户，不走抠图。
7. 整次复制放在同一数据库事务里。事务失败则接口不得返回成功；源不变。磁盘上可能留下未引用的新照片，本轮不清理。
8. 库存页：每张用户卡片可勾选「验收沙盒」；另提供选择源、选择已标记沙盒、展示预览件数、确认后复制、展示是否拷全。

### 模块边界契约

| 模块 / Owner | 职责与数据归属 | 公开契约 / 入口 | 允许依赖（方向） | 禁止依赖 |
|---|---|---|---|---|
| MiniappAdminService | 管理员校验、用户列表、验收沙盒标记 | `isAdmin`、`listUsers`、`setAcceptanceSandbox` | → User / 衣橱相关实体仓库（只读计数）、ConfigService | 不得执行复制、不得写文件存储 |
| WardrobeCopyService | 预览、确认件数、整橱覆盖、ID 重接、拷全结果 | `preview`、`copy` | → MiniappAdminService（只校验管理员）、Garment/Outfit/Calendar/Feedback 的公开创建与查询、FileService.copyStoredFile | 不得写 `FileService` 内部磁盘路径，不得改源记录 |
| FileService | 独立照片字节副本 | `copyStoredFile(sourceFileName, userId)` | → 文件存储实现 | 不得判断谁是沙盒、不得改衣物字段 |
| MiniappAdminController | 管理员 HTTP 入口 | `/api/miniapp/admin/users`、`/api/miniapp/admin/users/:id/acceptance-sandbox`、`/api/miniapp/admin/wardrobe-copy/preview`、`/api/miniapp/admin/wardrobe-copy` | → MiniappAdminService、WardrobeCopyService | 不得直接写 ORM 复制循环 |
| 库存页 / api.js | 管理员可见操作 | 标记沙盒、预览、确认复制 | → 上述管理员 HTTP 入口 | 不得在前端重接线或直接改别人衣橱 |

### 跨模块连接与验证

| 消费者 → 提供者 | 公开契约与数据 | Test Seam | 最小集成检查 |
|---|---|---|---|
| MiniappAdminController → MiniappAdminService | 用户列表与 `setAcceptanceSandbox` | `MiniappAdminController` + `MiniappAdminService` | 管理员可标记空用户；有衣物的用户标记失败 |
| MiniappAdminController → WardrobeCopyService | `preview` / `copy` 的源、目标、确认件数、覆盖开关、拷全计数 | `WardrobeCopyService` | 空沙盒复制后源不变、新 ID 对得上；非沙盒拒绝 |
| WardrobeCopyService → FileService | `copyStoredFile` | `WardrobeCopyService` 对 FileService 的调用断言 | 复制后目标照片文件名与源不同，且未调用抠图存储 |
| 库存页 → 管理员 HTTP | 标记、预览、复制 | `scripts/validate-admin-wardrobe-copy.cjs` | 页面含沙盒标记、源/目标选择、件数确认和结果展示 |

### 契约影响面闭环

| 编号 | 产品行为 / 契约 | 真源 / Owner | 当前消费者与公开配套面 | 关系证据 | 处置 |
|---|---|---|---|---|---|
| CC-01 | 用户列表增加是否验收沙盒、能否新标记 | `MiniappAdminService.listUsers` | `MiniappAdminController.users`、库存页、`getAdminUsers` | `listUsers` 返回值；`api.js` 的 `getAdminUsers` | 修改 |
| CC-02 | 新增标记沙盒、预览复制、执行复制三个管理员入口 | `MiniappAdminController` | `api.js`、库存页、架构真源第 8/9/12 章 | 现有 `/api/miniapp/admin/*` 前缀；架构文档管理员接口表 | 修改 |
| CC-03 | `FileService` 增加不抠图的文件复制 | `FileService.copyStoredFile` | `LocalFileService`、`S3FileService`、`file-service.abstract.spec.ts` 的测试替身、`WardrobeCopyService` | 抽象类现有 `storeImageFromFileUpload` / `get` | 修改 |
| CC-04 | 架构真源补充管理员复制入口 | `docs/backend-architecture-source-of-truth.md` | 后续施工与评审按该文档核对入口 | 第 8、9、12 章现有管理员接口 | 修改 |

历史排除：`docs/archive/2026-08-18-小程序穿搭出口与调用模式收敛/**` 是已冻结穿搭轮次，不消费本轮契约。

### 关键决定

- 复制做成 `WardrobeCopyService`，不把跨实体重接线塞进已经很重的 `MiniappAdminService`。
- 「困困子和老婆不能标成沙盒」落实为：把一个尚未是沙盒的用户标成沙盒时，若其已有衣物、搭配、今日穿搭或反馈则拒绝。不把姓名或用户 ID 写死。
- 照片必须独立复制且不抠图，避免一百多件再次走阿里云分割。
- 首次复制与再拷分开：目标非空且未确认覆盖则拒绝；确认覆盖才清空目标四类数据后重拷。
- 执行复制必须带上预览时的源/目标 ID 和源侧件数；对不上就拒绝，防止未确认覆盖。
- 放弃继续用 ZIP 两人倒手：SPEC 要求管理员一键，且 ZIP 不含品味记录、会追加、还会抠图。
- 放弃环境变量沙盒名单：SPEC 要求库存页勾选。

### 硬约束落实

| 硬约束 | 工程落实方式 |
|---|---|
| HC-01 | `copy` 只 `find` 源记录并 `create` 目标记录，不 `remove` / `assign` 源实体。 |
| HC-02 | 标记和复制入口都先走 `isAdmin`；非管理员 `ForbiddenException`。 |
| HC-03 | 写入前检查 `acceptanceSandbox === true`；新标记时拒绝已有衣橱数据的用户。 |
| HC-04 | 目标衣物/照片/搭配/反馈使用新 ID 和新文件；不复用源 `File` 行。 |
| HC-05 | 再拷必须 `overwrite: true`，先删目标四类数据再拷，不做追加或按名去重。 |
| HC-06 | `copy` 固定拷衣物、照片、搭配、今日穿搭、反馈；没有「只拷衣服」开关。 |
| HC-07 | 成功响应只含计数和对得上的统计，不含穿搭方案。 |
| HC-08 | 本轮文档和界面不出现「正式启用」文案；成功文案只谈副本是否拷全。 |

### 放弃的选项

- 复用 ZIP 导入导出：会追加、会抠图、不带品味记录，也不满足管理员一键。
- 沙盒名单写进环境变量：与「库存页勾选」不符，改一次要重启。
- 源目标共享同一 `File` 行：沙盒删照片会伤到真人衣橱。

### Test Seam

| Seam | 覆盖的上游条目 | 现有先例 | 选择理由 |
|---|---|---|---|
| `MiniappAdminService.setAcceptanceSandbox` / `listUsers` | MVP-01、AC-01、HC-02、HC-03 | `src/wardrobe/miniapp-admin.service.spec.ts` | 现有管理员服务单测就是用户列表和权限的公开边界 |
| `WardrobeCopyService.preview` / `copy` | MVP-02~05、AC-02~05、EX-01~04、HC-01、HC-04~07 | 无直接先例；风格对齐 `miniapp-admin.service.spec.ts` | 重接线和覆盖规则属于复制服务，不测私有循环 |
| `MiniappAdminController` 管理员入口 | MVP-03、EX-02、HC-02 | `src/wardrobe/miniapp-admin.controller.spec.ts` | 确认件数和未登录/非管理员拒绝必须停在 HTTP 入口 |
| `scripts/validate-admin-wardrobe-copy.cjs` | MVP-01、MVP-03、MVP-05 | `scripts/validate-miniapp-shell.cjs` 的库存页静态校验 | 现有 `test:miniapp` 基线已红且范围过大；本轮用专用脚本锁库存页文案和调用 |

## 4 界面与流程

入口：小程序「库存管理」页，仅管理员可见（沿用现页）。

1. 加载用户列表。每张卡片显示是否已是验收沙盒；空衣橱且还不是沙盒的，显示可勾选「设为验收沙盒」。已有衣物/搭配/今日穿搭/反馈且还不是沙盒的，不提供生效的标记动作。
2. 管理员选择一个源用户、一个已标记沙盒，先看预览：两边名字，以及将带走的衣物、照片、搭配、今日穿搭、反馈件数。
3. 目标是空沙盒时，确认后执行复制。
4. 目标已有副本时，确认文案必须写明将整橱覆盖；未确认不得调用覆盖复制。
5. 成功：展示源件数、写入件数、是否拷全；失败：展示未成功，且页面再拉列表后源件数不变。
6. 加载中禁用重复提交。空用户列表沿用现有「暂无用户」。

真实写入点：确认复制成功后，只发生在目标沙盒；源不写。

## 5 文件白名单

### 允许范围与文件职责

| 精确路径 | 动作 | 职责 | 不负责 | 本次变化 |
|---|---|---|---|---|
| `src/dal/entity/user.entity.ts` | 修改 | 持有 `acceptanceSandbox` | 不放复制计数或衣物数据 | 新增布尔字段，默认 false |
| `src/dal/migrations/sqlite/Migration20260819000100.ts` | 新建 | SQLite 增加 `acceptance_sandbox` | 不改衣物表 | 只加用户表一列 |
| `src/dal/migrations/postgres/Migration20260819000100.ts` | 新建 | Postgres 增加同列 | 不改其它表 | 与 SQLite 同语义 |
| `src/wardrobe/miniapp-admin.service.ts` | 修改 | 管理员校验、列表、标记沙盒 | 不执行复制 | 列表增加沙盒字段；新增 `setAcceptanceSandbox` |
| `src/wardrobe/miniapp-admin.service.spec.ts` | 修改 | 锁定标记规则与列表形状 | 不测复制重接线 | 新增沙盒用例 |
| `src/wardrobe/wardrobe-copy.service.ts` | 新建 | 预览、确认、复制、覆盖、重接线、拷全计数 | 不改管理员白名单，不抠图 | 本轮复制 Owner |
| `src/wardrobe/wardrobe-copy.service.spec.ts` | 新建 | 锁定复制、覆盖、拒绝、源只读 | 不测库存页 | 本轮主自动化载体 |
| `src/wardrobe/miniapp-admin.controller.ts` | 修改 | 暴露标记、预览、复制 HTTP 入口 | 不写重接线循环 | 三个入口，校验确认字段 |
| `src/wardrobe/miniapp-admin.controller.spec.ts` | 修改 | 锁定入口权限和确认参数 | 不测 Service 内部映射 | 新增入口用例 |
| `src/wardrobe/wardrobe.module.ts` | 修改 | 注册 `WardrobeCopyService` | 不改其它模块导出范围除非复制需要 | providers 增加复制服务 |
| `src/file/file-service.abstract.ts` | 修改 | 声明 `copyStoredFile` | 不判断沙盒 | 新增公开复制方法 |
| `src/file/local-file/local-file.service.ts` | 修改 | 本地实现字节复制 | 不跑抠图 | 实现 `copyStoredFile` |
| `src/file/s3-file/s3-file.service.ts` | 修改 | S3 实现字节复制 | 不跑抠图 | 实现 `copyStoredFile` |
| `src/file/file-service.abstract.spec.ts` | 修改 | 测试替身补齐新抽象方法 | 不测复制业务 | 避免抽象类测试无法实例化 |
| `src/file/local-file/local-file.service.spec.ts` | 修改 | 锁定本地复制不走抠图 | 不测衣橱规则 | 仅当现有套件需要为新方法补最小用例 |
| `docs/backend-architecture-source-of-truth.md` | 修改 | 登记管理员标记/复制入口 | 不写任务卡 | 第 8/9/12 章补三条入口 |
| `miniprogram/utils/api.js` | 修改 | 封装标记、预览、复制请求 | 不写业务判断 | 三个函数 |
| `miniprogram/pages/admin-inventory/index.js` | 修改 | 标记、选源选沙盒、确认、展示结果 | 不直接改数据库 | 新流程 |
| `miniprogram/pages/admin-inventory/index.wxml` | 修改 | 沙盒标记、预览确认、结果 | 不改其它页面 | 新控件 |
| `miniprogram/pages/admin-inventory/index.wxss` | 修改 | 新控件样式 | 不改全局皮肤 | 仅本页 |
| `scripts/validate-admin-wardrobe-copy.cjs` | 新建 | 静态锁住库存页复制流程 | 不测天气、不测后端 | 本轮 UI TEST 载体 |

### 禁止触碰

- `src/wardrobe/recommendation/**`、`src/weather/**`、`src/ai/**`
- `miniprogram/pages/outfit/**`、`miniprogram/pages/daily-outfit/**`
- `src/wardrobe/miniapp-wardrobe.controller.ts` 的 ZIP 导入导出行为
- `scripts/validate-miniapp-shell.cjs`（既有天气合同失败，本轮不顺手修）
- `docs/archive/**`
- 生产环境变量文件和服务器数据

## 6 验证方式

### 自动验证

- `C:\Users\Administrator\orca\workspaces\Libre-Closet\把老婆的仓库copy一份用到测试环境`：`npm test -- --runInBand src/wardrobe/miniapp-admin.service.spec.ts src/wardrobe/miniapp-admin.controller.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts`
  - 改前结果：退出码 `0`，3 个套件、53 项通过
  - 覆盖：现有管理员与备份回归，本轮标记/复制用例将加在前两个套件和新复制套件
- 模块边界：无独立架构 lint。跨模块检查走 `WardrobeCopyService` 单测对 `FileService.copyStoredFile` 的调用断言，以及 Controller 只转发、不写 ORM。

### TEST 资产策略

| 上游条目 | 影响范围 / 风险词 / Seam | 历史检索证据 | 决策 | Asset ID | 来源或 derived-from |
|---|---|---|---|---|---|
| AC-01、MVP-01、EX-01 | 验收沙盒、管理员用户列表、`MiniappAdminService` | 归档 Manifest 仅有穿搭/天气 TEST-001~013，无沙盒/管理员标记 | new | TEST-001 | 无 |
| AC-02、AC-03、AC-05、MVP-02、MVP-03、MVP-05、EX-01~04、HC-01、HC-04、HC-06 | 衣橱复制、重接线、源只读、`WardrobeCopyService` | 同上，无跨用户复制资产；现有 ZIP 导入测的是追加到当前用户 | new | TEST-002 | 无 |
| AC-04、MVP-04、EX-02、HC-05 | 整橱覆盖、再拷 | 归档无覆盖复制资产 | new | TEST-003 | 无 |
| MVP-01、MVP-03、MVP-05 | 库存页标记/确认/结果、专用校验脚本 | `validate-miniapp-shell.cjs` 只锁补标签，且当前整命令已红 | new | TEST-004 | 无 |

### 人工验收

1. 打开微信开发者工具库存管理页 → 用第三只已登录微信对应的空用户点「设为验收沙盒」→ 看到该用户已是验收沙盒；对困困子和老婆点同样动作 → 标记不生效。
2. 选择老婆为源、该沙盒为目标 → 确认预览件数 → 复制完成后，用沙盒微信打开衣橱/搭配/今日穿搭 → 能看到对应衣服和品味记录，点开搭配不会对空。
3. 再用老婆微信打开衣橱 → 件数和内容与复制前一致。
4. 在库存页对同一沙盒再复制一次并确认覆盖 → 沙盒只剩这一批，看不到上次改过的痕迹。
5. 选一个未标记用户当目标去复制 → 被拒绝，两边衣橱都不变。

### 上游覆盖检查

| 上游条目 | 负责的 PLAN/TASK | 验证方式 | 状态 |
|---|---|---|---|
| MVP-01、AC-01、HC-02、HC-03 | 方案第 3 章、TASK-01a/01b、TASK-04a/04b | TEST-001、TEST-004、人工 1 | 已覆盖 |
| MVP-02、MVP-03、MVP-05、AC-02、AC-03、AC-05、EX-01、EX-03、EX-04、HC-01、HC-04、HC-06、HC-07 | 方案第 3 章、TASK-02a/02b | TEST-002、人工 2/3/5 | 已覆盖 |
| MVP-04、AC-04、EX-02、HC-05 | 方案第 3 章、TASK-03a/03b、TASK-04a/04b | TEST-003、TEST-004、人工 4 | 已覆盖 |
| HC-08 | 方案关键决定、TASK-04b 成功文案 | 人工 2 的成功说明只谈拷全 | 已覆盖 |

## 7 回滚与暂停条件

### 回滚

- 代码：按任务白名单逐个撤回文件。
- 数据库：跑 `Migration20260819000100` 的 `down`，去掉 `acceptance_sandbox`。
- 若已在真实库执行复制：不得用回滚脚本清源；只允许在用户确认后处理目标沙盒。本轮默认先在空沙盒验证。

### 暂停条件

- 施工时发现必须改白名单外文件。
- 照片复制不得不走抠图或共享同一 `File` 行才能过测试。
- 「已有衣橱数据则不能新标沙盒」无法挡住困困子或老婆（例如某真人衣橱零数据）。
- 复制无法放进同一事务，出现成功响应但只写了一半。
- 需要改生产数据或环境变量才能继续。
