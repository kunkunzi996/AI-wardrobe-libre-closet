# 废除衣物库存状态 TESTS

- 上游：`docs/plan.md`、`docs/task.md`（用户认可后方可施工）
- 当前轮次：废除衣物库存状态
- 自动化 TEST：有
- 无自动化原因：不适用（生产 UPDATE 单独无自动化，见文末）
- 施工固定点：bc24209bcf92d5624b1a84c69558bf725836ac22

## 本轮 TEST Manifest

| Asset ID | 名称 | 来源类型 | 定义版本 | TEST 状态 | 对应 TASK | P5 状态 |
|---|---|---|---:|---|---|---|
| TEST-001 | miniapp JSON omits inventory status fields | adapt | 1 | green | TASK-01a/TASK-01b | passed |
| TEST-002 | outfit AI payload omits inventory status | adapt | 1 | green | TASK-01a/TASK-01b | passed |
| TEST-003 | web wardrobe templates omit status controls | adapt | 1 | green | TASK-02a/TASK-02b | passed |
| TEST-004 | wardrobe backup omits status and import ignores it | new | 1 | green | TASK-03a/TASK-03b | passed |
| TEST-005 | admin inventory excel has no status column | adapt | 1 | green | TASK-03a/TASK-03b | passed |

## TEST Asset · TEST-001 · miniapp JSON omits inventory status fields

### 资产定义

- Asset ID：TEST-001
- 来源类型：adapt
- 历史来源：`docs/archive/2026-08-18-小程序穿搭出口与调用模式收敛/test.md` TEST-006
- Derived From：归档 TEST-006
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：AC-01、AC-02、CC-01、CC-02
- Test Seam：`MiniappOutfitController.ready` / `recommend`；`MiniappWardrobeController` 列表 JSON
- 测试定义载体：`src/wardrobe/miniapp-outfit.controller.spec.ts`、`src/wardrobe/miniapp-wardrobe.controller.spec.ts`
- 工作目录：`E:\orca\Libre-Closet\AI搭配进行调优`
- 完整调用命令：`npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts`
- 对应 TASK：TASK-01a、TASK-01b
- 复用判断：归档 TEST-006 验证「待洗提醒仍返回」。本轮要的是字段退出，语义相反，故 adapt。

### 测试定义

- 状态：red
- 定义：`src/wardrobe/miniapp-outfit.controller.spec.ts` 中 `returns readiness status for miniapp outfit generation`、`marks the wardrobe ready when it contains only non-wearable inventory` 断言 ready 不含 `wearableCount`；`recommends outfits using existing generated AI plans` 与搭配结果用例断言每件衣服 JSON 不含 `status` / `statusLabel`。`src/wardrobe/miniapp-wardrobe.controller.spec.ts` 中 `returns garment list as miniapp JSON view models` 断言列表项不含这两个字段。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 2026-08-21 22:45 +08:00 | `feature/miniapp-all-clothes-available` 工作树，HEAD `bc24209bcf92d5624b1a84c69558bf725836ac22` | 1 | 6 failed / 27 passed。失败原因：ready 仍带 `wearableCount`；衣物 JSON 仍有 `status: "wearable"` | red |
| P4 绿灯（TASK-01b） | 2026-08-21 22:50 +08:00 | 同上工作树实现后 | 0 | 33 passed。ready 无 wearableCount；衣物 JSON 无 status / statusLabel | green |
| P5 整体回归 | 2026-08-21 23:56 +08:00 | 工作树相对 `bc24209bcf92d5624b1a84c69558bf725836ac22` | 0 | 33 passed | passed |

## TEST Asset · TEST-002 · outfit AI payload omits inventory status

### 资产定义

- Asset ID：TEST-002
- 来源类型：adapt
- 历史来源：当前 `outfit-generator.service.spec.ts`「allows every inventory status in mini-program AI output without status reminders」
- Derived From：该用例
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：CC-03
- Test Seam：`OutfitGeneratorService.generateWithAi` 调用 `OutfitAiService.recommend` 的入参
- 测试定义载体：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`、`src/ai/outfit-ai.service.spec.ts`
- 工作目录：`E:\orca\Libre-Closet\AI搭配进行调优`
- 完整调用命令：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/ai/outfit-ai.service.spec.ts`
- 对应 TASK：TASK-01a、TASK-01b
- 复用判断：现用例仍断言 `status: 'wearable'`。本轮改为入参衣物对象不含 status 字段。

### 测试定义

- 状态：red
- 定义：`src/wardrobe/recommendation/outfit-generator.service.spec.ts` 中 `allows every inventory status in mini-program AI output without status reminders` 断言发给 AI 的每件衣服没有 `status`。`src/ai/outfit-ai.service.spec.ts` 中 `sends the mini-program mode, temperature context, and normalized tag profiles with equal-group rules` 断言模型请求里的 `availableGarments` 没有 `status`。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 2026-08-21 22:45 +08:00 | `feature/miniapp-all-clothes-available` 工作树，HEAD `bc24209bcf92d5624b1a84c69558bf725836ac22` | 1 | 2 failed / 36 passed。失败原因：发给模型的衣物仍带 `status: "wearable"` | red |
| P4 绿灯（TASK-01b） | 2026-08-21 22:50 +08:00 | 同上工作树实现后 | 0 | 38 passed。发给 AI 的衣物对象无 status | green |
| P5 整体回归 | 2026-08-21 23:56 +08:00 | 工作树相对 `bc24209bcf92d5624b1a84c69558bf725836ac22` | 0 | 38 passed | passed |

## TEST Asset · TEST-003 · web wardrobe templates omit status controls

### 资产定义

- Asset ID：TEST-003
- 来源类型：adapt
- 历史来源：`src/wardrobe/wardrobe-views.spec.ts`
- Derived From：该文件现有「exposes metadata filters and detail fields」
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：AC-03、CC-04
- Test Seam：`views/wardrobe/*.hbs`、`views/analytics/index.hbs` 源码
- 测试定义载体：`src/wardrobe/wardrobe-views.spec.ts`、`src/wardrobe/analytics/wardrobe-analytics.service.spec.ts`
- 工作目录：`E:\orca\Libre-Closet\AI搭配进行调优`
- 完整调用命令：`npx jest --runInBand src/wardrobe/wardrobe-views.spec.ts src/wardrobe/analytics/wardrobe-analytics.service.spec.ts`
- 对应 TASK：TASK-02a、TASK-02b
- 复用判断：现断言模板必须含 status。本轮改为必须不含。

### 测试定义

- 状态：red
- 定义：`src/wardrobe/wardrobe-views.spec.ts` 断言表单/列表/详情/AI确认页不含 `name="status"`、`statusLabel`，分析页不含 `ANALYTICS_WEARABLE` / `ANALYTICS_LAUNDRY`。`src/wardrobe/analytics/wardrobe-analytics.service.spec.ts` 断言 `summary` 不含 `wearable` / `laundry`。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 2026-08-21 22:55 +08:00 | `feature/miniapp-all-clothes-available`，HEAD `bc24209bcf92d5624b1a84c69558bf725836ac22` | 1 | 5 failed / 5 passed。模板仍有状态下拉；分析汇总仍有 wearable/laundry | red |
| P4 绿灯（TASK-02b） | 2026-08-21 23:05 +08:00 | 同上工作树实现后 | 0 | 10 passed。模板无状态控件；summary 无 wearable/laundry | green |
| P5 整体回归 | 2026-08-21 23:56 +08:00 | 工作树相对 `bc24209bcf92d5624b1a84c69558bf725836ac22` | 0 | 10 passed | passed |

## TEST Asset · TEST-004 · wardrobe backup omits status and import ignores it

### 资产定义

- Asset ID：TEST-004
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：AC-04、CC-05
- Test Seam：`MiniappWardrobeController.exportBackup` / `importBackup`
- 测试定义载体：`src/wardrobe/miniapp-wardrobe.controller.spec.ts`
- 工作目录：`E:\orca\Libre-Closet\AI搭配进行调优`
- 完整调用命令：`npx jest --runInBand src/wardrobe/miniapp-wardrobe.controller.spec.ts -t "backup"`
- 对应 TASK：TASK-03a、TASK-03b
- 复用判断：现有备份用例不断言 status 字段，无法 reuse。

### 测试定义

- 状态：red
- 定义：`src/wardrobe/miniapp-wardrobe.controller.spec.ts` 中 `exports wardrobe backup as a zip buffer` 断言 zip 不含 `"status"`；`imports wardrobe backup zip files` 断言 create 入参无 `status`。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 2026-08-21 23:05 +08:00 | `feature/miniapp-all-clothes-available`，HEAD `bc24209bcf92d5624b1a84c69558bf725836ac22` | 1 | 2 failed。备份 zip 仍有 `"status": "wearable"`；导入仍把 status 传给 create | red |
| P4 绿灯（TASK-03b） | 2026-08-21 23:15 +08:00 | 同上工作树实现后 | 0 | 2 passed。备份 zip 无 status；导入 create 无 status | green |
| P5 整体回归 | 2026-08-21 23:56 +08:00 | 工作树相对 `bc24209bcf92d5624b1a84c69558bf725836ac22` | 0 | 2 passed / 13 skipped（命令带 `-t backup`） | passed |

## TEST Asset · TEST-005 · admin inventory excel has no status column

### 资产定义

- Asset ID：TEST-005
- 来源类型：adapt
- 历史来源：`src/wardrobe/miniapp-admin.controller.spec.ts`「exports taxonomy tags, fit, and the backfill timestamp so backfilled garments are identifiable」
- Derived From：该用例表头断言
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：AC-05、CC-06
- Test Seam：`MiniappAdminController.exportUserGarments` xlsx 表头
- 测试定义载体：`src/wardrobe/miniapp-admin.controller.spec.ts`
- 工作目录：`E:\orca\Libre-Closet\AI搭配进行调优`
- 完整调用命令：`npx jest --runInBand src/wardrobe/miniapp-admin.controller.spec.ts -t "exports taxonomy tags"`
- 对应 TASK：TASK-03a、TASK-03b
- 复用判断：现有表头断言不含「状态必须存在」，需补 not.toContain('状态')。属 adapt。

### 测试定义

- 状态：red
- 定义：`src/wardrobe/miniapp-admin.controller.spec.ts` 中 `exports taxonomy tags, fit, and the backfill timestamp so backfilled garments are identifiable` 断言表头不含「状态」。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 2026-08-21 23:05 +08:00 | `feature/miniapp-all-clothes-available`，HEAD `bc24209bcf92d5624b1a84c69558bf725836ac22` | 1 | 1 failed。表头仍含「状态」 | red |
| P4 绿灯（TASK-03b） | 2026-08-21 23:15 +08:00 | 同上工作树实现后 | 0 | 1 passed。表头不含「状态」 | green |
| P5 整体回归 | 2026-08-21 23:56 +08:00 | 工作树相对 `bc24209bcf92d5624b1a84c69558bf725836ac22` | 0 | 1 passed / 16 skipped（命令带 `-t "exports taxonomy tags"`） | passed |

## 生产 UPDATE（无自动化 TEST）

- 原因：AC-06 必须在真实生产库执行，jest 不能连生产。
- 仍适用：TASK-04 的 SQL 文件审查 + 备份确认 + 抽查件数。
- 对应 TASK：TASK-04
- SQL 文件：`scripts/normalize-garment-status-to-wearable.sql`（只 `UPDATE garment SET status = 'wearable' WHERE status IS NOT 'wearable'`）
- 生产执行：已执行。备份 `/root/ai-wardrobe-backup-20260821T152744Z`。UPDATE 前非可穿 0 件，`updated_rows=0`；总数 311、有照片 311；owner 1/3/4 分别为 15/143/143 且均为 wearable。`integrity_check=ok`。
- 待 P6 验收：用户可再抽查件数与照片；数据侧目标状态已满足。

## P5 Current 结果

| 检查 | 工作目录 | 完整命令 | 时间 | 退出码 | 结论 |
|---|---|---|---|---:|---|
| 证据预检 | `E:\orca\Libre-Closet\AI搭配进行调优` | 核对施工固定点 `bc24209bcf92d5624b1a84c69558bf725836ac22` = HEAD 且为祖先；manifest 五项命令与资产定义一致；TEST-004/005 的 skipped 由 `-t` 过滤产生，与命令字面一致；无自动化生产 UPDATE 已有执行记录 | 2026-08-21 23:56 +08:00 | 0 | passed |
| Manifest 全量执行 | `E:\orca\Libre-Closet\AI搭配进行调优` | TEST-001：33 passed；TEST-002：38 passed；TEST-003：10 passed；TEST-004：2 passed / 13 skipped；TEST-005：1 passed / 16 skipped | 2026-08-21 23:56 +08:00 | 0 | passed |
| 整体回归 | `E:\orca\Libre-Closet\AI搭配进行调优` | `npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts src/wardrobe/recommendation/outfit-generator.service.spec.ts src/ai/outfit-ai.service.spec.ts src/wardrobe/wardrobe-views.spec.ts src/wardrobe/analytics/wardrobe-analytics.service.spec.ts src/wardrobe/miniapp-admin.controller.spec.ts src/wardrobe/garment.service.spec.ts` | 2026-08-21 23:56 +08:00 | 0 | passed（8 suites / 105 passed；33+38+10+17+7=105，与分项对账） |

- 适用的其它检查：`npm run test:miniapp` 于 2026-08-21 23:56 +08:00 退出码 0，`Native mini-program validation passed.`
- P5 评审门禁：ready
