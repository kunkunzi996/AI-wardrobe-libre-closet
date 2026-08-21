# 废除衣物库存状态 PLAN

- 阶段：P3
- 最后更新：2026-08-21
- 上游：用户已认可的共识（Q2A / Q3A+B / Q4A+B / Q5A）+ `docs/adr/0005-miniapp-is-the-only-user-product.md` + `docs/adr/0006-no-garment-inventory-status.md`

## 1 目标与非目标

### 上游条目索引

| 编号 | 类型 | 上游位置 | 条目 |
|---|---|---|---|
| MVP-01 | MVP 做 | ADR 0006；用户确认「小程序接口去掉 status、statusLabel、wearableCount 分叉；AI 不再看状态」 | 小程序对外不再出现库存状态，穿搭也不再按状态筛选或提醒 |
| MVP-02 | MVP 做 | ADR 0006；用户确认 Q3B「网页衣橱去掉状态下拉、筛选、展示」 | 网页衣橱不再编辑、筛选或展示库存状态 |
| MVP-03 | MVP 做 | 用户确认 Q5A | 备份 zip 不再写状态，导入忽略；管理员 Excel 去掉「状态」列 |
| MVP-04 | MVP 做 | 用户确认 Q4A+B | 生产库旧 status 全部改为可穿，列保留，不 drop |
| AC-01 | 验收标准 | 用户确认「小程序看不到状态」 | 小程序衣物详情、搭配结果看不到待洗/收纳/可穿状态文案 |
| AC-02 | 验收标准 | ADR 0006 | `GET /api/miniapp/outfits/ready`、`POST /api/miniapp/outfits/recommend`、衣橱列表/详情 JSON 不含 `status`、`statusLabel`；ready 不含 `wearableCount` |
| AC-03 | 验收标准 | 用户确认 Q3B | 网页衣橱列表、详情、表单、筛选没有状态控件和状态文案 |
| AC-04 | 验收标准 | 用户确认 Q5A | 备份 `manifest.json` 的衣物对象不含 `status`；导入调用 create 时不传 status |
| AC-05 | 验收标准 | 用户确认 Q5A | 管理员库存 Excel 表头没有「状态」 |
| AC-06 | 验收标准 | 用户确认 Q4B | 生产抽查：衣物件数不少、照片还在、status 均为 wearable |
| EX-01 | 严重异常 | 用户确认「衣服和照片不动」 | 生产 UPDATE 不得改照片、不得删衣物 |
| EX-02 | 严重异常 | 项目既有禁止 | 不得清空真实衣橱 |
| EX-03 | 严重异常 | 用户确认「不拆整个网站」 | 不得拆除网页应用本身，只拆状态相关 UI |

### 继承自上游的硬约束

| 编号 | 上游原文 |
|---|---|
| HC-01 | 现在是基于小程序原生开发的，网页版是不会再使用了 |
| HC-02 | 当前用户产品里不再使用这个概念。衣服在衣橱里就是能拿来穿，不区分可穿、待洗、收纳、清洁、需修补、已归档。 |
| HC-03 | 本轮拆除小程序接口上的状态字段与分叉（含 `status` / `statusLabel` / `wearableCount`）、给 AI 的 status，以及网页衣橱的状态下拉、筛选和展示；不拆除整个网页应用。 |
| HC-04 | 管理员 Excel 与备份 zip 不再读写状态，导入时忽略旧字段。 |
| HC-05 | 数据库 `status` 列先保留：旧行全部改为可穿，新行默认仍是可穿。本轮不 drop 列。 |
| HC-06 | 旧数据全部改成可穿（困困子、老婆、沙盒都改这一列，衣服和照片不动） |
| HC-07 | 改生产数据必须单独一张卡：先备份，再 UPDATE，再抽查件数 |

### 目标

1. 用户产品（小程序 + 仍存在的网页衣橱页）不再把库存状态当作业务概念：接口不返回、页面不展示、AI 看不见、备份和 Excel 不写。
2. 写入路径不再接受调用方设置 status；新建衣物仍由实体默认成可穿。
3. 用单独任务把生产库已有非可穿行改为可穿，同时保留数据库列。

### 非目标

- 不拆除整个网页应用、登录页、分析页骨架或 Nest 视图引擎。
- 不 drop `garment.status` 列，不删除 `GarmentStatus` 枚举和实体字段。
- 不上传新体验版，不宣布新版穿搭正式启用。
- 不改衣橱复制、补标、沙盒标记。
- 不把网页「待洗件数」以外的分析能力整页拆掉；只去掉库存状态相关展示。

## 2 现状调查

- 当前无活跃 `docs/spec.md` / `plan.md` / `task.md` / `test.md`；上一轮已冻结在 `docs/archive/2026-08-20-衣橱复制到验收沙盒/`。（出处：`PROJECT_STATE.md` 轮次文档；`docs/` 目录）
- 小程序搭配与衣橱 JSON 仍返回 `status` / `statusLabel`。当前工作树把它们写死为可穿，属于补丁，不是根方案。（出处：`src/wardrobe/miniapp-outfit.controller.ts` `toGarmentCard`；`src/wardrobe/miniapp-wardrobe.controller.ts` `toViewModel`）
- `GET /api/miniapp/outfits/ready` 仍返回 `wearableCount`。当前工作树令其等于 `garmentCount`，仍是分叉字段。（出处：`src/wardrobe/miniapp-outfit.controller.ts` `ready()`）
- 发给 AI 的 `availableGarments` 仍带 `status`。当前工作树在小程序模式写死 `'wearable'`，模型仍看见该字段。（出处：`src/wardrobe/recommendation/outfit-generator.service.ts` `generateWithAi`）
- 网页衣橱表单、列表筛选、详情仍有状态。（出处：`views/wardrobe/form.hbs`、`index.hbs`、`show.hbs`、`ai-confirm.hbs`；`src/wardrobe/wardrobe.controller.ts` `statusOptions`；`src/wardrobe/wardrobe-views.spec.ts`）
- 网页分析页仍展示可穿/待洗件数。（出处：`views/analytics/index.hbs`；`src/wardrobe/analytics/wardrobe-analytics.service.ts`）
- 备份 manifest 仍写 `status`，导入仍传给 `garmentService.create`。（出处：`src/wardrobe/miniapp-wardrobe.controller.ts` 备份导出映射与 `importBackup`）
- 管理员 Excel 表头含「状态」。（出处：`src/wardrobe/miniapp-admin.controller.ts` `sheet.columns`）
- 实体列 `status` 默认 `wearable`，create/update DTO 仍可写入。（出处：`src/dal/entity/garment.entity.ts`；`src/wardrobe/garment.service.ts` create `status: dto.status ?? GarmentStatus.Wearable`；update `'status' in dto`）
- 小程序前端表单本来就不能改状态；详情和搭配页当前工作树已去掉展示。（出处：`miniprogram/pages/garment-form/` 无 status 字段；`miniprogram/pages/garment-detail/index.wxml`；`miniprogram/pages/outfit/index.wxml`）
- 小程序客户端不读取 `wearableCount`。（出处：`miniprogram/` 全文搜索无 `wearableCount`）

### 相关项目规则

| 相关规则 | 来源 | 对本方案的影响 | 规划后复核 |
|---|---|---|---|
| 唯一用户产品是微信小程序 | `docs/adr/0005-miniapp-is-the-only-user-product.md` | 不能再以网页还要用为由保留状态工作流 | 通过 |
| 用户产品不再有衣物库存状态 | `docs/adr/0006-no-garment-inventory-status.md` | 必须拆接口、网页 UI、备份、Excel；列保留并回写可穿 | 通过 |
| 禁止清空真实衣橱；生产数据单独卡 | 用户确认 HC-06/HC-07 | 生产 UPDATE 独立任务，先备份 | 通过 |
| 不拆整个网站 | ADR 0006；用户 Q3 非 C | 白名单不得包含整包删除 `views/` | 通过 |
| AUTO_DEPLOY_MAIN=false | `docs/github-actions-auto-deploy.md` | 本轮 PLAN 不含自动部署 | 通过 |

### 改前测试基线

工作目录：`E:\orca\Libre-Closet\AI搭配进行调优`（当前分支 `feature/miniapp-all-clothes-available`，含未提交补丁）。这不是 Git 固定点。

- `npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts src/wardrobe/recommendation/outfit-generator.service.spec.ts src/ai/outfit-ai.service.spec.ts src/wardrobe/wardrobe-views.spec.ts src/wardrobe/analytics/wardrobe-analytics.service.spec.ts`
  - 退出码 0；6 个套件、80 项通过。
- `npm run test:miniapp`
  - 退出码 0；`Native mini-program validation passed.`

## 3 方案

### 模块与数据流

不新增模块。根方案是：库存状态不再出现在用户产品和公开契约上；数据库列作为未使用的默认值留下。

1. 小程序衣橱/搭配 JSON 删除 `status`、`statusLabel`；`ready` 删除 `wearableCount`。
2. 发给 AI 的衣物对象删除 `status`（`OutfitAiGarment.status` 改为可选或从 miniapp 映射中省略）。
3. `GarmentService.create` 不再读取 dto.status，只靠实体默认；`update` 不再接受 status。
4. 网页衣橱去掉状态下拉、筛选、详情文案；分析页去掉可穿/待洗两块状态数字。
5. 备份导出不写 status；导入不把旧 status 传给 create。
6. Excel 去掉「状态」列。
7. 单独任务：生产备份后执行只改 `status` 列的 UPDATE。

当前工作树上「写死可穿 / 隐藏文案」的补丁，施工时按白名单改成删除字段，不得保留假可穿字段。

### 模块边界契约

| 模块 / Owner | 职责与数据归属 | 公开契约 / 入口 | 允许依赖（方向） | 禁止依赖 |
|---|---|---|---|---|
| 衣物库存 Owner：`GarmentService` + `Garment` 实体 | 持有衣物行与默认 status 列；本轮起不再把 status 当业务输入 | `GarmentService.create` / `update` / `findAll` | → 实体与仓储 | 小程序控制器不得直写实体 status |
| 小程序衣橱入口：`MiniappWardrobeController` | 列表/详情/备份 JSON | `/api/miniapp/garments*` | → GarmentService | 不得把 status 泄漏给客户端 |
| 小程序搭配入口：`MiniappOutfitController` | ready / recommend | `/api/miniapp/outfits/*` | → OutfitGeneratorService、GarmentService | 不得返回 status / wearableCount |
| 穿搭生成 Owner：`OutfitGeneratorService` | 组套与后核 | `generateWithAi` | → OutfitAiService、Garment 仓储 | 不得把真实库存状态传给 AI |
| 管理员导出：`MiniappAdminController` | Excel | `/api/miniapp/admin/users/:id/garments.xlsx`（现有导出入口） | → MiniappAdminService | 不得输出状态列 |
| 网页衣橱：`WardrobeController` + `views/wardrobe/*` | 网页 CRUD 展示 | `/wardrobe*` | → GarmentService | 不得再渲染状态控件 |

无新增模块；边界沿用现状，只收缩公开字段。证据：上述控制器已是唯一 HTTP 入口。

### 跨模块连接与验证

| 消费者 → 提供者 | 公开契约与数据 | Test Seam | 最小集成检查 |
|---|---|---|---|
| MiniappOutfitController → OutfitGeneratorService | `generateWithAi` 返回的 garments；控制器再映射 JSON | `MiniappOutfitController.recommend` | jest recommend 断言 JSON 无 status 字段 |
| MiniappOutfitController / Generator → OutfitAiService | `availableGarments` 不含 status | `OutfitGeneratorService.generateWithAi` 对 `recommend` 的调用参数 | jest 断言调用参数无 status |
| MiniappWardrobeController → GarmentService | create 入参不含 status | `importBackup` / `create` | jest 断言 create 未被传入 status |
| WardrobeController → 模板 | 渲染数据不再含 statuses / statusLabel | `wardrobe-views.spec.ts` 读 hbs | 模板不含状态控件 |

### 契约影响面闭环

| 编号 | 产品行为 / 契约 | 真源 / Owner | 当前消费者与公开配套面 | 关系证据 | 处置 |
|---|---|---|---|---|---|
| CC-01 | 小程序衣物/搭配 JSON 不再含 `status`、`statusLabel` | MiniappOutfitController.toGarmentCard；MiniappWardrobeController.toViewModel | 小程序页面；对应 `*.spec.ts` | 搜索 `statusLabel` 于 `miniprogram/` 与 `src/wardrobe/miniapp-*.ts` | 修改 |
| CC-02 | `GET /api/miniapp/outfits/ready` 不再含 `wearableCount` | MiniappOutfitController.ready | 当前小程序未读取该字段；`miniapp-outfit.controller.spec.ts` | 搜索 `wearableCount` | 修改 |
| CC-03 | 发给 AI 的衣物不含库存状态 | OutfitGeneratorService.generateWithAi 映射 | OutfitAiService.recommend；outfit-ai.service.spec / generator spec | 搜索 `status: miniappMode` / `availableGarments` | 修改 |
| CC-04 | 网页衣橱无状态 UI | views/wardrobe/* + WardrobeController | wardrobe-views.spec.ts | 搜索 `name="status"`、`statusLabel`、`statusOptions` | 修改 |
| CC-05 | 备份 manifest 无 status，导入忽略 | MiniappWardrobeController 导出/导入 | miniapp-wardrobe.controller.spec.ts 备份用例 | 搜索 `status: garment.status`、BackupManifestGarment.status | 修改 |
| CC-06 | 管理员 Excel 无「状态」列 | MiniappAdminController sheet.columns | miniapp-admin.controller.spec.ts 读表头 | 搜索 `header: '状态'` | 修改 |

历史排除：`docs/archive/**` 中旧穿搭 TEST-001/006 状态提醒语义已过时，只作 adapt 来源，不回写归档。

### 关键决定

- 删除字段，不写死「可穿」。写死仍是补丁，客户端和测试还会以为有状态。
- 保留实体列和枚举，因为本轮不 drop 列；写入路径忽略外部 status。
- 分析页的可穿/待洗数字属于状态展示，随 Q3B 去掉，不拆整页分析。
- 生产 UPDATE 只改 `status` 列，独立任务，先备份。

### 硬约束落实

| 硬约束 | 工程落实方式 |
|---|---|
| HC-01 | 以小程序为用户产品改公开契约；网页只删状态 UI，不作为保留状态的理由 |
| HC-02 | 公开契约和 UI 去掉五种状态；内部列仅默认 wearable |
| HC-03 | 白名单含小程序控制器/生成器/网页模板，禁止删除整个 `views/` 应用 |
| HC-04 | 备份映射删除 status；导入不传；Excel 删除状态列 |
| HC-05 | 不改实体 `@Property status`；不写 drop migration |
| HC-06 | TASK-04 的 SQL 只 `UPDATE ... SET status = 'wearable' WHERE status <> 'wearable'` |
| HC-07 | TASK-04 单卡，Depends On 前面功能点；人工步骤含备份 |

### 放弃的选项

- 继续对客户端写死 `status: wearable`：用户已否定为打补丁。
- 本轮 drop 数据库列：用户选 Q4A+B 且明确不 C。
- 本轮拆除整个网站：用户选 Q3 非 C。

### Test Seam

| Seam | 覆盖的上游条目 | 现有先例 | 选择理由 |
|---|---|---|---|
| MiniappOutfitController.ready / recommend 响应 JSON | AC-01、AC-02、CC-01、CC-02 | `src/wardrobe/miniapp-outfit.controller.spec.ts` | 现有最高公开 HTTP 边界 |
| MiniappWardrobeController 列表 JSON | AC-02、CC-01 | `src/wardrobe/miniapp-wardrobe.controller.spec.ts` | 衣橱入口 |
| OutfitGeneratorService 调用 OutfitAiService 的入参 | AC-02、CC-03 | `src/wardrobe/recommendation/outfit-generator.service.spec.ts` | 能看见发给 AI 的字段 |
| wardrobe hbs 源码 | AC-03、CC-04 | `src/wardrobe/wardrobe-views.spec.ts` | 现有模板契约测试 |
| 备份 zip 中的 manifest 与 create 入参 | AC-04、CC-05 | `miniapp-wardrobe.controller.spec.ts` 备份用例 | 现成导出/导入 |
| 管理员 Excel 表头 | AC-05、CC-06 | `miniapp-admin.controller.spec.ts` `readExportedRows` | 已按表头名断言 |
| 无生产库自动 Seam | AC-06、EX-01 | 无 | 生产 UPDATE 不能对真实库做 jest |

## 4 界面与流程

**小程序**

- 衣物详情：只显示品类、颜色等现有信息，不显示状态。
- 搭配结果：每件衣服不显示状态标签，不出现「待洗衣物请先确认」。
- 加载/失败：沿用现有，不因状态为空而报错。
- 真源：服务端 JSON 不再带状态字段；页面不得再读 `statusLabel`。

**网页衣橱（仍存在但不作为产品入口）**

- 列表不再显示 statusLabel，筛选弹层不再有状态。
- 表单/AI 确认页不再有状态下拉；保存不提交 status。
- 详情不再显示状态行。
- 分析页不再显示可穿/待洗两块数字。

**管理员小程序库存导出**

- 下载的 xlsx 表头无「状态」。

无新页面、无新按钮。

## 5 文件白名单

### 允许范围与文件职责

| 精确路径 | 动作 | 职责 | 不负责 | 本次变化 |
|---|---|---|---|---|
| `src/wardrobe/miniapp-outfit.controller.ts` | 修改 | 小程序搭配 HTTP | 组套规则 | 删除 status/statusLabel/wearableCount |
| `src/wardrobe/miniapp-outfit.controller.spec.ts` | 修改 | 搭配入口测试 | 实现 | 断言旧字段退出 |
| `src/wardrobe/miniapp-wardrobe.controller.ts` | 修改 | 小程序衣橱与备份 | 搭配生成 | 列表 JSON 删除状态；备份不写、导入忽略 |
| `src/wardrobe/miniapp-wardrobe.controller.spec.ts` | 修改 | 衣橱/备份测试 | 实现 | 断言 JSON 与备份 |
| `src/wardrobe/recommendation/outfit-generator.service.ts` | 修改 | 发给 AI 的衣物映射与默认核心 | HTTP | 映射去掉 status；默认核心继续最新一件 |
| `src/wardrobe/recommendation/outfit-generator.service.spec.ts` | 修改 | 生成器测试 | 实现 | 断言 AI 入参无 status |
| `src/ai/outfit-ai.service.ts` | 修改 | AI 入参类型与提示 | 生成器组套 | `OutfitAiGarment.status` 不再作为 miniapp 必填；提示不谈库存状态 |
| `src/ai/outfit-ai.service.spec.ts` | 修改 | AI 服务测试 | 实现 | 不再要求 status 业务规则 |
| `src/wardrobe/dto/create-garment.dto.ts` | 修改 | 创建入参 | HTTP 路由 | 删除 status |
| `src/wardrobe/dto/update-garment.dto.ts` | 修改 | 更新入参 | HTTP 路由 | 删除 status |
| `src/wardrobe/dto/search-garment.dto.ts` | 修改 | 查询入参 | HTTP 路由 | 删除 status |
| `src/wardrobe/garment.service.ts` | 修改 | 写入与查询 | 控制器映射 | create/update 不接受 status；findAll 不再按 status 过滤 |
| `src/wardrobe/garment.service.spec.ts` | 修改 | 衣物服务测试 | 实现 | 去掉按 status 写入/筛选的期望 |
| `src/wardrobe/miniapp-admin.controller.ts` | 修改 | 管理员 Excel | 补标 | 删除状态列 |
| `src/wardrobe/miniapp-admin.controller.spec.ts` | 修改 | Excel 测试 | 实现 | 表头不含「状态」 |
| `src/wardrobe/wardrobe.controller.ts` | 修改 | 网页衣橱数据 | 小程序 | 不再提供 statuses / statusLabel |
| `src/wardrobe/wardrobe-views.spec.ts` | 修改 | 模板契约测试 | 实现 | 断言无状态控件 |
| `views/wardrobe/form.hbs` | 修改 | 网页表单 | 小程序 | 去掉状态下拉 |
| `views/wardrobe/index.hbs` | 修改 | 网页列表筛选 | 小程序 | 去掉状态筛选与展示 |
| `views/wardrobe/show.hbs` | 修改 | 网页详情 | 小程序 | 去掉状态行 |
| `views/wardrobe/ai-confirm.hbs` | 修改 | 网页 AI 确认 | 小程序 | 去掉状态下拉 |
| `views/analytics/index.hbs` | 修改 | 网页分析数字 | 穿搭 | 去掉可穿/待洗块 |
| `src/wardrobe/analytics/wardrobe-analytics.service.ts` | 修改 | 分析汇总 | 衣物写入 | 不再输出 laundry/wearable 状态计数 |
| `src/wardrobe/analytics/wardrobe-analytics.service.spec.ts` | 修改 | 分析测试 | 实现 | 去掉待洗计数断言 |
| `miniprogram/pages/garment-detail/index.wxml` | 修改 | 小程序详情展示 | 后端 | 确认不绑定状态 |
| `miniprogram/pages/outfit/index.wxml` | 修改 | 小程序搭配展示 | 后端 | 确认不绑定状态 |
| `miniprogram/pages/outfit/index.wxss` | 修改 | 搭配样式 | 后端 | 确认无状态样式 |
| `scripts/normalize-garment-status-to-wearable.sql` | 新建 | 生产只改 status 列的语句 | 任意其它列 | 仅 UPDATE status |
| `docs/test.md` | 修改 | 本轮 TEST 账本 | 实现 | P4 写入定义与证据 |

### 禁止触碰

- `src/dal/entity/garment.entity.ts` 的 `status` 字段与默认值（不 drop 列）
- `src/wardrobe/garment-status.enum.ts`（列仍在，枚举留下）
- 不得删除整个 `views/`、`public/` 网页应用
- 衣橱复制、补标、沙盒标记相关文件
- 生产数据库以外的衣物照片文件
- `.github/` 自动部署开关

## 6 验证方式

### 自动验证

- `E:\orca\Libre-Closet\AI搭配进行调优`：`npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts src/wardrobe/recommendation/outfit-generator.service.spec.ts src/ai/outfit-ai.service.spec.ts src/wardrobe/wardrobe-views.spec.ts src/wardrobe/analytics/wardrobe-analytics.service.spec.ts src/wardrobe/miniapp-admin.controller.spec.ts src/wardrobe/garment.service.spec.ts`
  - 改前结果：相关套件在未加入 admin/garment.service 时 80 项通过；admin 与 garment.service 基线于 P4 a 卡补跑
  - 覆盖：AC-01～AC-05
- 模块边界：无独立架构 lint；靠控制器 spec 穿过公开 JSON

### TEST 资产策略

| 上游条目 | 影响范围 / 风险词 / Seam | 历史检索证据 | 决策 | Asset ID | 来源或 derived-from |
|---|---|---|---|---|---|
| AC-02 / CC-01 / CC-02 | miniapp JSON statusLabel wearableCount | 归档 `docs/archive/2026-08-18-小程序穿搭出口与调用模式收敛/test.md` TEST-006 是「返回 status-caution」旧语义，不能原样 reuse | adapt | TEST-001 | derived-from 归档 TEST-006 的 HTTP 入口，断言改为旧字段退出 |
| CC-03 | AI availableGarments status | 归档 TEST-001 状态提醒语义相反；当前 generator spec 已有「无状态提醒」 | adapt | TEST-002 | derived-from 当前 generator spec「allows every inventory status」 |
| AC-03 / CC-04 | 网页模板 name="status" | 无归档 test.md 命中 wardrobe-views；现有 `wardrobe-views.spec.ts` | adapt | TEST-003 | derived-from 当前 wardrobe-views.spec.ts |
| AC-04 / CC-05 | 备份 manifest status | 无归档命中；现有 export/import 用例不断言 status | new | TEST-004 | 无 |
| AC-05 / CC-06 | Excel 表头「状态」 | 无归档命中；现有 export 用例按表头取值 | adapt | TEST-005 | derived-from `exports taxonomy tags...` 表头断言 |
| AC-06 / EX-01 | 生产 UPDATE | 无自动 Seam | 无自动化 TEST | 不适用 | 无 |

### 人工验收

1. 打开微信开发者工具本仓库小程序 → 登录沙盒号 → 打开衣物详情 → 看不到可穿/待洗/收纳。
2. 同一窗口打开搭配页生成一套 → 卡片上没有状态，理由/注意里没有待洗提醒。
3. 管理员库存导出沙盒用户 → 用 Excel 打开 → 表头没有「状态」。
4. （TASK-04 后）确认已做生产备份 → 执行 SQL → 抽查困困子、老婆、沙盒衣物件数与照片仍在。

### 上游覆盖检查

| 上游条目 | 负责的 PLAN/TASK | 验证方式 | 状态 |
|---|---|---|---|
| MVP-01 / AC-01 / AC-02 / CC-01 / CC-02 / CC-03 | TASK-01a/01b | TEST-001、TEST-002；人工 1～2 | 已覆盖 |
| MVP-02 / AC-03 / CC-04 | TASK-02a/02b | TEST-003；看网页模板 | 已覆盖 |
| MVP-03 / AC-04 / AC-05 / CC-05 / CC-06 | TASK-03a/03b | TEST-004、TEST-005 | 已覆盖 |
| MVP-04 / AC-06 / EX-01 / HC-06 / HC-07 | TASK-04 | 人工备份 + SQL + 抽查 | 已覆盖 |
| HC-01～HC-05 / EX-02 / EX-03 | 方案非目标与白名单禁止项 | 代码审查 | 已覆盖 |

## 7 回滚与暂停条件

### 回滚

- 代码：`git revert` 本分支提交；未合并则丢弃工作树。
- 生产 UPDATE：列仍在，可用备份恢复 `garment` 表；不得用删库回滚。
- 小程序：未上传体验版则只需不预览该分支。

### 暂停条件

- SQL 将改到 `status` 以外的列，或备份未完成。
- 需要 drop 列或删除整个网页应用。
- 发现小程序旧体验版强依赖 `wearableCount` 且用户要求兼容（当前代码未引用，若新证据出现则停）。
- 白名单外文件必须改才能编译。
