# 废除衣物库存状态 TASKS

- 上游：`docs/plan.md`（用户认可后方可施工）
- 功能点：4/10

## TASK-01a · 准备 TEST：小程序对外不再出现库存状态

### 任务定义

- 状态：red
- 来源：MVP-01、AC-01、AC-02、CC-01、CC-02、CC-03
- 契约影响面：CC-01、CC-02、CC-03
- 阻塞依赖（Depends On）：无
- 可并行（Parallel With）：TASK-02a
- Consumes：PLAN 白名单中的现有 miniapp 搭配/衣橱/生成器 spec；归档 TEST-006 仅作 adapt 来源
- Produces：TEST-001、TEST-002 红灯定义与 `docs/test.md` 复跑凭证
- Test Seam：MiniappOutfitController / MiniappWardrobeController JSON；OutfitGeneratorService 对 OutfitAiService 的入参
- TEST Asset ID：TEST-001、TEST-002
- 来源类型：adapt
- TEST 记录：`docs/test.md#TEST-001`、`docs/test.md#TEST-002`
- 历史来源：归档 `docs/archive/2026-08-18-小程序穿搭出口与调用模式收敛/test.md` TEST-006；当前 generator spec「allows every inventory status」
- 边界约束：只断言公开 JSON 形状和 generateWithAi 调用入参；禁止为测内部私有方法而改生成器可见性
- 跨模块检查：recommend 响应来自 Generator 映射后的控制器 JSON
- 允许改：`docs/test.md` 对应资产小节、`src/wardrobe/miniapp-outfit.controller.spec.ts`、`src/wardrobe/miniapp-wardrobe.controller.spec.ts`、`src/wardrobe/recommendation/outfit-generator.service.spec.ts`、`src/ai/outfit-ai.service.spec.ts`、`src/wardrobe/garment.service.spec.ts`
- 禁止碰：实现文件（控制器、生成器、DTO、页面）
- 验收：adapt 得到原因正确的 red（现实现仍返回 status/statusLabel/wearableCount 或写死可穿）
- 回滚：还原上述 spec 与 `docs/test.md` 本轮记录

### 施工后填写

- TEST 记录：`docs/test.md#TEST-001`、`docs/test.md#TEST-002`（P4 基线均为 red）
- 实际改动：把小程序 JSON 和 AI 入参的断言从「写死可穿」改成「字段不存在」；create/update 传入待洗时仍应落成可穿
- 未完成项：无

## TASK-01b · 写实现：小程序对外不再出现库存状态

### 任务定义

- 状态：green
- 来源：MVP-01、AC-01、AC-02、CC-01、CC-02、CC-03
- 契约影响面：CC-01、CC-02、CC-03
- 阻塞依赖（Depends On）：TASK-01a（须 red）
- 可并行（Parallel With）：TASK-02b
- Consumes：TEST-001、TEST-002 的 `docs/test.md` 复跑凭证
- Produces：小程序 JSON 无 status/statusLabel/wearableCount；AI 入参无 status；create/update 不接受 status
- 边界约束：只改小程序控制器映射、生成器 AI 映射、DTO 与 GarmentService 写入；不 drop 实体列
- 跨模块检查：原样复跑 TEST-001、TEST-002
- 允许改：`src/wardrobe/miniapp-outfit.controller.ts`、`src/wardrobe/miniapp-wardrobe.controller.ts`、`src/wardrobe/recommendation/outfit-generator.service.ts`、`src/ai/outfit-ai.service.ts`、`src/wardrobe/dto/create-garment.dto.ts`、`src/wardrobe/dto/update-garment.dto.ts`、`src/wardrobe/dto/search-garment.dto.ts`、`src/wardrobe/garment.service.ts`、`miniprogram/pages/garment-detail/index.wxml`、`miniprogram/pages/outfit/index.wxml`、`miniprogram/pages/outfit/index.wxss`
- 禁止碰：TASK-01a 的断言意图；实体 `status` 列；网页模板（属 TASK-02）；备份映射可在本卡删除列表 JSON 字段，备份导入导出细节属 TASK-03
- 自测：`npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts src/wardrobe/recommendation/outfit-generator.service.spec.ts src/ai/outfit-ai.service.spec.ts src/wardrobe/garment.service.spec.ts`
- 人工验收：打开开发者工具衣物详情和搭配页 → 看不到状态文案
- 回滚：还原本卡允许改的实现文件

### 施工后填写

- 实际改动：删除小程序 ready 的 wearableCount 和衣物 JSON 的 status/statusLabel；发给 AI 的衣物去掉 status；create 固定可穿、update/findAll 忽略 status
- TEST 记录：引用 `docs/test.md#TEST-001`、`docs/test.md#TEST-002`
- 执行结果：TEST-001、TEST-002 退出码 0；自测 5 个套件 78 项通过
- 未完成项：create/update/search DTO 仍有可选 status 字段（测试还在传入），服务层已忽略

## TASK-02a · 准备 TEST：网页衣橱不再展示库存状态

### 任务定义

- 状态：red
- 来源：MVP-02、AC-03、CC-04
- 契约影响面：CC-04
- 阻塞依赖（Depends On）：无
- 可并行（Parallel With）：TASK-01a
- Consumes：现有 `wardrobe-views.spec.ts`、`wardrobe-analytics.service.spec.ts`
- Produces：TEST-003 红灯定义
- Test Seam：wardrobe / analytics hbs 源码与分析汇总
- TEST Asset ID：TEST-003
- 来源类型：adapt
- TEST 记录：`docs/test.md#TEST-003`
- 历史来源：当前 `src/wardrobe/wardrobe-views.spec.ts`
- 边界约束：只断言模板与分析汇总公开形状
- 跨模块检查：无
- 允许改：`docs/test.md` 对应资产小节、`src/wardrobe/wardrobe-views.spec.ts`、`src/wardrobe/analytics/wardrobe-analytics.service.spec.ts`
- 禁止碰：实现文件
- 验收：原因正确的 red（模板仍含 name="status" / statusLabel / 待洗数字）
- 回滚：还原上述 spec

### 施工后填写

- TEST 记录：`docs/test.md#TEST-003`（P4 基线 red）
- 实际改动：网页模板和分析汇总改为断言「没有状态」
- 未完成项：无

## TASK-02b · 写实现：网页衣橱不再展示库存状态

### 任务定义

- 状态：green
- 来源：MVP-02、AC-03、CC-04
- 契约影响面：CC-04
- 阻塞依赖（Depends On）：TASK-02a（须 red）
- 可并行（Parallel With）：TASK-01b
- Consumes：TEST-003
- Produces：网页衣橱与分析页不再展示或筛选库存状态
- 边界约束：只改网页衣橱模板、WardrobeController 状态选项、分析汇总；不删整个网站
- 跨模块检查：原样复跑 TEST-003
- 允许改：`views/wardrobe/form.hbs`、`views/wardrobe/index.hbs`、`views/wardrobe/show.hbs`、`views/wardrobe/ai-confirm.hbs`、`views/analytics/index.hbs`、`src/wardrobe/wardrobe.controller.ts`、`src/wardrobe/analytics/wardrobe-analytics.service.ts`
- 禁止碰：TASK-02a 断言；小程序页面；实体列
- 自测：`npx jest --runInBand src/wardrobe/wardrobe-views.spec.ts src/wardrobe/analytics/wardrobe-analytics.service.spec.ts`
- 人工验收：打开网页 `/wardrobe` 列表和表单（若本地可开）→ 无状态下拉和状态文字
- 回滚：还原本卡允许改文件

### 施工后填写

- 实际改动：去掉网页衣橱表单/列表/详情/AI确认的状态控件，分析页去掉可穿/待洗数字
- TEST 记录：引用 `docs/test.md#TEST-003`
- 执行结果：TEST-003 退出码 0，10 项通过
- 未完成项：无

## TASK-03a · 准备 TEST：备份和 Excel 不再出现状态

### 任务定义

- 状态：red
- 来源：MVP-03、AC-04、AC-05、CC-05、CC-06
- 契约影响面：CC-05、CC-06
- 阻塞依赖（Depends On）：TASK-01a（衣橱 spec 与备份用例同文件，先定 JSON 断言以免互相覆盖）
- 可并行（Parallel With）：无
- Consumes：现有备份与 Excel spec
- Produces：TEST-004、TEST-005 红灯定义
- Test Seam：exportBackup manifest；exportUserGarments 表头
- TEST Asset ID：TEST-004、TEST-005
- 来源类型：new / adapt
- TEST 记录：`docs/test.md#TEST-004`、`docs/test.md#TEST-005`
- 历史来源：TEST-004 无归档；TEST-005 derived-from 现有 Excel 表头用例
- 边界约束：只断言 zip 内 JSON 与 xlsx 表头
- 跨模块检查：导入路径断言 create 入参无 status
- 允许改：`docs/test.md` 对应资产小节、`src/wardrobe/miniapp-wardrobe.controller.spec.ts`、`src/wardrobe/miniapp-admin.controller.spec.ts`
- 禁止碰：实现文件
- 验收：原因正确的 red
- 回滚：还原 spec

### 施工后填写

- TEST 记录：`docs/test.md#TEST-004`、`docs/test.md#TEST-005`（P4 基线均为 red）
- 实际改动：备份 zip 不得含 status；导入 create 不得带 status；Excel 表头不得含「状态」
- 未完成项：无

## TASK-03b · 写实现：备份和 Excel 不再出现状态

### 任务定义

- 状态：green
- 来源：MVP-03、AC-04、AC-05、CC-05、CC-06
- 契约影响面：CC-05、CC-06
- 阻塞依赖（Depends On）：TASK-03a（须 red）、TASK-01b（`miniapp-wardrobe.controller.ts` 同文件，须先完成列表 JSON）
- 可并行（Parallel With）：无
- Consumes：TEST-004、TEST-005；TASK-01b 已删除列表 JSON 状态字段
- Produces：备份不写 status、导入忽略、Excel 无状态列
- 边界约束：只改备份映射/导入与 Excel 列定义
- 跨模块检查：原样复跑 TEST-004、TEST-005
- 允许改：`src/wardrobe/miniapp-wardrobe.controller.ts`、`src/wardrobe/miniapp-admin.controller.ts`
- 禁止碰：TASK-03a 断言；实体列
- 自测：`npx jest --runInBand src/wardrobe/miniapp-wardrobe.controller.spec.ts src/wardrobe/miniapp-admin.controller.spec.ts`
- 人工验收：管理员导出 Excel → 表头没有「状态」
- 回滚：还原本卡允许改文件

### 施工后填写

- 实际改动：备份导出不再写 status，导入忽略旧字段；Excel 去掉「状态」列
- TEST 记录：引用 `docs/test.md#TEST-004`、`docs/test.md#TEST-005`
- 执行结果：TEST-004、TEST-005 退出码 0；自测 2 个套件 32 项通过
- 未完成项：无

## TASK-04 · 生产库旧 status 全部改为可穿

### 任务定义

- 状态：implemented
- 来源：MVP-04、AC-06、EX-01、HC-06、HC-07
- 契约影响面：无
- 阻塞依赖（Depends On）：TASK-01b、TASK-02b、TASK-03b（用户可见状态已拆完，再改生产数据）
- 可并行（Parallel With）：无
- Consumes：白名单 SQL 文件；生产备份步骤
- Produces：生产 `garment.status` 全部为 wearable；件数和照片不变
- 边界约束：只允许提交 SQL 文件；生产执行须用户在场确认备份完成
- 跨模块检查：无
- 允许改：`scripts/normalize-garment-status-to-wearable.sql`
- 禁止碰：实体定义、任意 drop、衣物照片、清空表
- 人工验收：确认备份存在 → 执行 SQL → 抽查困困子、老婆、沙盒衣物件数与照片仍在，status 均为 wearable
- 回滚：用本次生产备份恢复 `garment` 表，不得删库

### 施工后填写

- 实际改动：新增 `scripts/normalize-garment-status-to-wearable.sql`；生产已对该语句执行
- TEST 记录：无自动化 TEST，原因见 `docs/test.md` 生产 UPDATE 小节
- 执行结果：2026-08-21 对生产 SQLite 执行 UPDATE。执行前非可穿 0 件，updated_rows=0；总数 311、有照片 311 未变。owner 1=15、3=143、4=143 全是 wearable。integrity=ok
- 未完成项：无
