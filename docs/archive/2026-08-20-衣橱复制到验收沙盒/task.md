# 衣橱复制到验收沙盒 TASKS

- 上游：`docs/plan.md`（用户认可后方可施工）
- 功能点：4/10

## TASK-01a · 准备 TEST：空用户能标成验收沙盒，有衣橱数据的用户标不上

### 任务定义

- 状态：red
- 来源：MVP-01、AC-01、HC-02、HC-03、EX-01
- 契约影响面：CC-01、CC-02
- 阻塞依赖（Depends On）：无
- 可并行（Parallel With）：无
- Consumes：SPEC 标记规则；现有 `MiniappAdminService.isAdmin` / `listUsers`
- Produces：TEST-001 红灯，锁定空用户可标记、已有衣物/搭配/今日穿搭/反馈的用户不能新标记、非管理员不能标记、列表带出沙盒状态
- Test Seam：`MiniappAdminService.setAcceptanceSandbox` / `listUsers`，以及 `MiniappAdminController` 标记入口
- TEST Asset ID：TEST-001
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-001`
- 历史来源：无，检索证据见 PLAN
- 边界约束：只通过管理员服务和 Controller 公开方法验证；禁止断言迁移 SQL 文本
- 跨模块检查：Controller 调用 `setAcceptanceSandbox` 后，列表项的沙盒字段与拒绝原因一致
- 允许改：`docs/test.md` 对应资产小节、`src/wardrobe/miniapp-admin.service.spec.ts`、`src/wardrobe/miniapp-admin.controller.spec.ts`
- 禁止碰：实现文件、`src/dal/entity/user.entity.ts`、迁移、复制服务
- 验收：原因正确的 red。失败只能是「还没有标记能力 / 有衣物的用户仍被标上 / 列表没有沙盒字段」，不得是语法或环境错误
- 回滚：撤回两份 spec 中本卡新增用例

### 施工后填写

- TEST 记录：`docs/test.md#TEST-001`
- 实际改动：`src/wardrobe/miniapp-admin.service.spec.ts`、`src/wardrobe/miniapp-admin.controller.spec.ts` 新增 `acceptance sandbox` 用例
- 未完成项：实现留给 TASK-01b

## TASK-01b · 写实现：验收沙盒标记

### 任务定义

- 状态：green
- 来源：MVP-01、AC-01、HC-02、HC-03、EX-01
- 契约影响面：CC-01、CC-02
- 阻塞依赖（Depends On）：TASK-01a（必须 red）
- 可并行（Parallel With）：无
- Consumes：TEST-001、`docs/test.md` 复跑凭证
- Produces：`acceptanceSandbox` 字段、管理员可标记空用户、有衣橱数据的用户标记失败、`listUsers` 带出沙盒状态
- 边界约束：只通过 `MiniappAdminService` / `MiniappAdminController` 改变标记；不得在库存页先做无后端的假勾选
- 跨模块检查：管理员用户列表接口返回的沙盒字段与 Service 一致
- 允许改：`src/dal/entity/user.entity.ts`、`src/dal/migrations/sqlite/Migration20260819000100.ts`、`src/dal/migrations/postgres/Migration20260819000100.ts`、`src/wardrobe/miniapp-admin.service.ts`、`src/wardrobe/miniapp-admin.controller.ts`、`docs/backend-architecture-source-of-truth.md`
- 禁止碰：TASK-01a 的测试定义与断言、复制服务、小程序页面
- 自测：原样执行 TEST-001 命令，预期退出码 `0`
- 人工验收：打开库存管理 → 给空的第三只微信用户标记验收沙盒 → 看到已允许写入；给困困子或老婆标记 → 不生效
- 回滚：撤回本卡允许改的文件，并执行该迁移 `down`

### 施工后填写

- 实际改动：`User.acceptanceSandbox`、SQLite/Postgres 迁移、`MiniappAdminService.setAcceptanceSandbox`、管理员标记入口、架构真源补记
- TEST 记录：`docs/test.md#TEST-001`
- 执行结果：见 TEST-001「P4 绿灯（TASK-01b）」
- 未完成项：无

## TASK-02a · 准备 TEST：确认后把整橱拷到空沙盒，源不动，非沙盒拒绝

### 任务定义

- 状态：red
- 来源：MVP-02、MVP-03、MVP-05、AC-02、AC-03、AC-05、EX-01、EX-03、EX-04、HC-01、HC-04、HC-06、HC-07
- 契约影响面：CC-02、CC-03
- 阻塞依赖（Depends On）：TASK-01b（没有沙盒标记就无法定义合法目标）
- 可并行（Parallel With）：无
- Consumes：TASK-01b 的沙盒字段与管理员校验；PLAN 中的预览/复制契约
- Produces：TEST-002 红灯，锁定空沙盒复制、ID 重接、源只读、件数确认、非沙盒拒绝、源=目标拒绝
- Test Seam：`WardrobeCopyService.preview` / `copy`，以及管理员复制入口
- TEST Asset ID：TEST-002
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-002`
- 历史来源：无，检索证据见 PLAN
- 边界约束：只断言公开预览/复制结果和 FileService.copyStoredFile 被调用；禁止断言私有对照表结构
- 跨模块检查：复制成功后，目标搭配/反馈里的衣物 ID 能在目标衣物中找到；源衣物 ID 集合保持不变
- 允许改：`docs/test.md` 对应资产小节、`src/wardrobe/wardrobe-copy.service.spec.ts`、`src/wardrobe/miniapp-admin.controller.spec.ts`
- 禁止碰：复制实现、FileService 实现、库存页
- 验收：原因正确的 red。失败只能是复制服务/入口不存在，或新测试断言未满足，不得是语法或环境错误
- 回滚：删除本卡新建的复制 spec 用例，撤回 controller spec 中本卡新增用例

### 施工后填写

- TEST 记录：`docs/test.md#TEST-002`
- 实际改动：新建 `src/wardrobe/wardrobe-copy.service.spec.ts`；`miniapp-admin.controller.spec.ts` 增加 `wardrobe copy` 入口用例
- 未完成项：实现留给 TASK-02b

## TASK-02b · 写实现：空沙盒整橱复制

### 任务定义

- 状态：green
- 来源：MVP-02、MVP-03、MVP-05、AC-02、AC-03、AC-05、EX-01、EX-03、EX-04、HC-01、HC-04、HC-06、HC-07
- 契约影响面：CC-02、CC-03、CC-04
- 阻塞依赖（Depends On）：TASK-02a（必须 red）
- 可并行（Parallel With）：无
- Consumes：TEST-002、TASK-01b 的沙盒标记
- Produces：预览与复制入口；空沙盒上的独立衣橱副本；源只读；非沙盒拒绝；拷全计数
- 边界约束：照片只通过 `FileService.copyStoredFile`；不得调用 `storeImageFromFileUpload`；不得修改源实体
- 跨模块检查：Controller 把确认字段交给 `WardrobeCopyService.copy`；复制服务调用 `copyStoredFile` 而不是抠图存储
- 允许改：`src/wardrobe/wardrobe-copy.service.ts`、`src/wardrobe/miniapp-admin.controller.ts`、`src/wardrobe/wardrobe.module.ts`、`src/file/file-service.abstract.ts`、`src/file/local-file/local-file.service.ts`、`src/file/s3-file/s3-file.service.ts`、`src/file/file-service.abstract.spec.ts`、`src/file/local-file/local-file.service.spec.ts`、`docs/backend-architecture-source-of-truth.md`
- 禁止碰：TASK-02a 的测试定义与断言、库存页、ZIP 导入导出
- 自测：原样执行 TEST-002 命令，预期退出码 `0`
- 人工验收：选择老婆为源、空沙盒为目标并确认件数 → 沙盒能看到对应衣物/搭配/品味记录；老婆衣橱不变
- 回滚：撤回本卡允许改的文件

### 施工后填写

- 实际改动：新增 `WardrobeCopyService`、管理员预览/复制入口、`FileService.copyStoredFile`（本地与 S3）
- TEST 记录：`docs/test.md#TEST-002`
- 执行结果：见 TEST-002「P4 绿灯（TASK-02b）」
- 未完成项：无

## TASK-03a · 准备 TEST：再拷确认覆盖后只剩新副本

### 任务定义

- 状态：red
- 来源：MVP-04、AC-04、EX-02、HC-05
- 契约影响面：CC-02
- 阻塞依赖（Depends On）：TASK-02b（先有可复制的空沙盒路径）
- 可并行（Parallel With）：无
- Consumes：TASK-02b 的 `preview` / `copy` 契约
- Produces：TEST-003 红灯，锁定目标非空且未确认覆盖时拒绝、确认覆盖后旧副本消失且源仍不变
- Test Seam：`WardrobeCopyService.copy`
- TEST Asset ID：TEST-003
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-003`
- 历史来源：无，检索证据见 PLAN
- 边界约束：只通过 `copy` 的覆盖开关和返回计数验证；禁止直接查内部删除顺序
- 跨模块检查：覆盖后目标旧衣物 ID 不再出现，新搭配只指向新衣物 ID
- 允许改：`docs/test.md` 对应资产小节、`src/wardrobe/wardrobe-copy.service.spec.ts`
- 禁止碰：复制实现、库存页、TASK-02a 已有断言原意
- 验收：原因正确的 red。失败只能是还没有覆盖行为，或未确认覆盖仍写进去
- 回滚：撤回本卡在复制 spec 中的新增用例

### 施工后填写

- TEST 记录：`docs/test.md#TEST-003`
- 实际改动：`src/wardrobe/wardrobe-copy.service.spec.ts` 新增 `overwrite sandbox` 用例
- 未完成项：实现留给 TASK-03b

## TASK-03b · 写实现：整橱覆盖

### 任务定义

- 状态：green
- 来源：MVP-04、AC-04、EX-02、HC-05
- 契约影响面：CC-02
- 阻塞依赖（Depends On）：TASK-03a（必须 red）
- 可并行（Parallel With）：TASK-04a、TASK-04b
- Consumes：TEST-003、TASK-02b 的复制入口
- Produces：目标非空时必须确认覆盖；确认后先清空目标衣物/搭配/今日穿搭/反馈再拷新副本
- 边界约束：清空只针对目标用户这四类数据；不得删除源记录，不得删管理员标记本身
- 跨模块检查：覆盖成功后，目标旧 ID 消失，源 ID 集合不变
- 允许改：`src/wardrobe/wardrobe-copy.service.ts`、`src/wardrobe/miniapp-admin.controller.ts`
- 禁止碰：TASK-03a 的测试定义与断言、库存页、源衣橱数据
- 自测：原样执行 TEST-003 命令，预期退出码 `0`
- 人工验收：对已有副本的沙盒再次确认覆盖复制 → 只剩新副本
- 回滚：撤回本卡允许改的文件

### 施工后填写

- 实际改动：`WardrobeCopyService.copy` 在 `overwrite: true` 时先清空目标的今日穿搭、搭配、反馈和衣物，再写入新副本
- TEST 记录：`docs/test.md#TEST-003`
- 执行结果：见 TEST-003「P4 绿灯（TASK-03b）」
- 未完成项：无

## TASK-04a · 准备 TEST：库存页能标记沙盒并确认件数后复制

### 任务定义

- 状态：red
- 来源：MVP-01、MVP-03、MVP-05、HC-08
- 契约影响面：CC-01、CC-02、CC-04
- 阻塞依赖（Depends On）：TASK-02b（页面要按已实现的预览/复制入口接线）、TASK-03a（`docs/test.md` 不能并行写入）
- 可并行（Parallel With）：TASK-03b
- Consumes：TASK-01b / TASK-02b 的公开入口名称
- Produces：TEST-004 红灯，锁定库存页含沙盒标记、源/目标选择、件数确认、拷全结果，且成功文案不谈正式启用
- Test Seam：`scripts/validate-admin-wardrobe-copy.cjs`
- TEST Asset ID：TEST-004
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-004`
- 历史来源：无，检索证据见 PLAN
- 边界约束：只静态检查库存页和 `api.js` 的公开函数/文案；禁止启动微信开发者工具
- 跨模块检查：页面调用的函数名与 `api.js` 导出、后端路径字符串一致
- 允许改：`docs/test.md` 对应资产小节、`scripts/validate-admin-wardrobe-copy.cjs`
- 禁止碰：库存页实现、后端实现、`scripts/validate-miniapp-shell.cjs`
- 验收：原因正确的 red。失败只能是页面/api 还没有复制流程
- 回滚：删除本卡新建的校验脚本

### 施工后填写

- TEST 记录：`docs/test.md#TEST-004`
- 实际改动：新建 `scripts/validate-admin-wardrobe-copy.cjs`
- 未完成项：实现留给 TASK-04b

## TASK-04b · 写实现：库存页标记、预览确认和拷全结果

### 任务定义

- 状态：green
- 来源：MVP-01、MVP-03、MVP-05、HC-08
- 契约影响面：CC-01、CC-02、CC-04
- 阻塞依赖（Depends On）：TASK-04a（必须 red）
- 可并行（Parallel With）：TASK-03b
- Consumes：TEST-004、已实现的标记/预览/复制入口
- Produces：库存页可标记沙盒、选择源和沙盒、确认件数后复制、展示是否拷全；成功文案不宣布正式启用
- 边界约束：只改库存页和 `api.js`；不得改衣橱首页或穿搭页
- 跨模块检查：页面请求路径与 Controller 入口一致
- 允许改：`miniprogram/utils/api.js`、`miniprogram/pages/admin-inventory/index.js`、`miniprogram/pages/admin-inventory/index.wxml`、`miniprogram/pages/admin-inventory/index.wxss`
- 禁止碰：TASK-04a 的校验脚本断言、穿搭页、ZIP 备份入口
- 自测：原样执行 TEST-004 命令，预期退出码 `0`
- 人工验收：打开库存管理 → 完成标记、预览确认、复制 → 看到拷全结果，且没有「正式启用」字样
- 回滚：撤回本卡允许改的四个小程序文件

### 施工后填写

- 实际改动：库存页可标记验收沙盒、选择源和沙盒、确认件数后复制并展示拷全结果；`api.js` 接上标记/预览/复制接口
- TEST 记录：`docs/test.md#TEST-004`
- 执行结果：见 TEST-004「P4 绿灯（TASK-04b）」
- 未完成项：无
