# 小程序穿搭出口与调用模式收敛 TESTS

- 上游：`docs/plan.md`、`docs/task.md`（用户认可后方可施工）
- 当前轮次：小程序穿搭出口与调用模式收敛
- 自动化 TEST：有
- 无自动化原因：不适用
- 迁移说明：TEST-001~TEST-004 原本只记录在 `docs/task.md` 的「施工后填写」段，本轮按 `kun-plan` 协议迁移为结构化资产记录。迁移只搬运既有证据原文，不改写历史结论；原始证据仍保留在 `docs/task.md` 对应任务卡。

## 本轮 TEST Manifest

| Asset ID | 名称 | 来源类型 | 定义版本 | TEST 状态 | 对应 TASK | P5 状态 |
|---|---|---|---:|---|---|---|
| TEST-001 | adds status and core temperature cautions to local plans when AI falls back | reuse | 2 | reused-green | TASK-01a/TASK-01b、TASK-03a/TASK-03b | passed |
| TEST-002 | adds the actual outfit color relationship to mini-program AI reasons | reuse | 2 | reused-green | TASK-01a/TASK-01b、TASK-03a/TASK-03b | passed |
| TEST-003 | preserves cautions from local generated plans | reuse | 2 | reused-green | TASK-01a/TASK-01b、TASK-03a/TASK-03b | passed |
| TEST-004 | returns zero recommendations for an empty wardrobe with %s weather | reuse | 2 | reused-green | TASK-02a/TASK-02b、TASK-03a/TASK-03b | passed |
| TEST-005 | keeps the mini-program rule mode explicit when the client sends no weather field | new | 1 | green | TASK-04a/TASK-04b | passed |
| TEST-006 | drops the legacy no-wearable fallback message and returns status-caution plans without a weather field | new | 1 | green | TASK-04a/TASK-04b | passed |
| TEST-007 | keeps the legacy web AI output unchanged | new | 1 | green | TASK-06a/TASK-06b | passed |
| TEST-008 | applies default core selection only in mini-program mode | new | 1 | green | TASK-07a/TASK-07b | passed |
| TEST-009 | warns about temperature when an explicit request overrides the exclusion | new | 1 | green | TASK-08a/TASK-08b | passed |
| TEST-010 | builds an available context from the real Tencent weather responses | new | 1 | green | TASK-09a/TASK-09b | not-run |
| TEST-011 | resolves a manual city to an adcode through the geocoder | new | 1 | green | TASK-10a/TASK-10b | not-run |

> 定义版本说明：TEST-001~TEST-004 当前生效版本为 `2`。TASK-03a 于 2026-08-16 以版本 `1` 复跑确认基线；TASK-03b 同日为这四个资产的调用参数补显式 `mode` 字段，测试文件路径、测试名称、Test Seam、调用命令与全部 `expect` 断言逐字不变，仅属兼容参数变化，按 `kun-plan` 协议保留 Asset ID 并把定义版本递增为 `2`。

### 无自动化 TEST 的任务卡

- TASK-05（把「规则模式必须显式声明」写入架构真源）：无自动化 TEST。原因是交付物为 `docs/backend-architecture-source-of-truth.md` 的规范条文，没有可执行行为，任何自动断言都只能检查字符串存在，不能证明规则被遵守。
- 已运行检查（2026-08-16，cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`）：
  - `git diff --stat docs/backend-architecture-source-of-truth.md`：`7 insertions(+), 2 deletions(-)`。其中本卡实际改动为第 4 章新增 2 条规则条目；其余增删属本轮更早卡片已在工作树中的既有改动（第 3 章目录责任表与天气配置条目），非本卡引入。
  - `grep -cE "^## [0-9]+\. " docs/backend-architecture-source-of-truth.md`：`20`，二十个章节标题齐全，未删除或重排任何章节。
  - 行尾核对：`CRLF=0 LF-only=198`，保持仓库既有 LF 风格，未引入行尾噪音。
  - `npm test -- --runInBand`：退出码 `0`，39 个套件、211 项全部通过，确认纯文档改动未波及测试。
- 待 P6 人工验收：打开该文件第 4 章「请求入口规则」，确认新增条目明确写出「穿搭推荐调用方必须显式声明规则模式，不得由天气字段或其它数据是否存在推断」，以及配套的「用哪套规则是调用方身份、有没有拿到实时温度是数据事实，两者不得互相推断」。本项不得以自动检查代替人眼确认。

## TEST Asset · TEST-001 · adds status and core temperature cautions to local plans when AI falls back

### 资产定义

- Asset ID：TEST-001
- 来源类型：reuse
- 历史来源：本轮 `docs/task.md` TASK-01a（无归档仓库，`docs/archive/**` 不存在）
- Derived From：无
- 定义版本：2
- 定义哈希：未记录（迁移前本项目未建立定义哈希机制，后续以测试名称加文件路径作为身份）
- 覆盖条目：BUG-06、AC-03、AC-05、HC-03、HC-05
- Test Seam：`OutfitGeneratorService.generateWithAi`
- 测试定义载体：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`（测试名 `adds status and core temperature cautions to local plans when AI falls back`）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts -t "adds status and core temperature cautions to local plans when AI falls back"`
- 对应 TASK：TASK-01a、TASK-01b、TASK-03a、TASK-03b
- 复用判断：TASK-03 只在调用参数上新增显式 `mode` 字段，断言语义、输入边界与运行条件均不变，按协议属 reuse，保留 ID 并把定义版本递增为 2。

### 测试定义

- 状态：green
- 定义：已存在于 `src/wardrobe/recommendation/outfit-generator.service.spec.ts`，验证 AI 降级时本地方案仍带状态提醒与核心温度提醒。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-01a） | 未记录 | `feature/outfit-taxonomy-consumption` 未提交工作树 | 1 | 与 TEST-002、TEST-003 合并运行：39 项中 36 通过、3 项按预期失败，本项失败为本地方案 `cautions` 为空 | red |
| P4 绿灯（TASK-01b） | 未记录 | 同上 | 0 | 与 TEST-002、TEST-003 合并运行：3 个套件、41 项全部通过 | green |
| P4 基线（TASK-03a） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，载体未改动 | 0 | 按本资产完整调用命令原样单独执行：1 个套件通过，26 项中 1 项匹配通过、25 项跳过；失败输出：无 | reused-green |
| P4 绿灯（TASK-03b） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，载体调用参数新增 `mode: 'miniapp-taxonomy-v1'` | 0 | 按本资产完整调用命令原样复跑：1 个套件通过，26 项中 1 项匹配通过、25 项跳过；2 条 `expect` 断言逐字未变；失败输出：无 | 绿灯（基线未变） |
| P5 整体回归 | 2026-08-16 | 同上 | 0 | `npm test -- --runInBand`：39 个套件、209 项全部通过 | green（BUG-09 修复后须重跑） |

- 断言清单快照（TASK-03a 于 2026-08-16 记录，供 TASK-03b 与 P5 逐字对账）：测试名 `adds status and core temperature cautions to local plans when AI falls back`，位于 `src/wardrobe/recommendation/outfit-generator.service.spec.ts`，`expect` 共 2 条，被断言对象为 `result.plans[0].cautions` 拼接后的字符串：
  1. `expect(cautions).toMatch(/待洗/);`
  2. `expect(cautions).toMatch(/温度|冲突|厚/);`
  TASK-03b 只允许为该用例的 `service.generateWithAi({...})` 调用参数补 `mode` 字段，上述两行必须保持逐字不变。

## TEST Asset · TEST-002 · adds the actual outfit color relationship to mini-program AI reasons

### 资产定义

- Asset ID：TEST-002
- 来源类型：reuse
- 历史来源：本轮 `docs/task.md` TASK-01a
- Derived From：无
- 定义版本：2
- 定义哈希：未记录（同 TEST-001）
- 覆盖条目：BUG-07、HC-04、AC-05
- Test Seam：`OutfitGeneratorService.generateWithAi`
- 测试定义载体：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`（测试名 `adds the actual outfit color relationship to mini-program AI reasons`）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts -t "adds the actual outfit color relationship to mini-program AI reasons"`
- 对应 TASK：TASK-01a、TASK-01b、TASK-03a、TASK-03b
- 复用判断：同 TEST-001，TASK-03 仅新增显式 `mode` 调用参数，断言语义不变。

### 测试定义

- 状态：green
- 定义：已存在于 `src/wardrobe/recommendation/outfit-generator.service.spec.ts`，验证小程序 AI 成功方案的理由包含按实际入选衣物计算的颜色关系。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-01a） | 未记录 | `feature/outfit-taxonomy-consumption` 未提交工作树 | 1 | 本项失败为小程序 AI 理由缺少实际同色关系 | red |
| P4 绿灯（TASK-01b） | 未记录 | 同上 | 0 | 合并运行 3 个套件、41 项全部通过 | green |
| P4 基线（TASK-03a） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，载体未改动 | 0 | 按本资产完整调用命令原样单独执行：1 个套件通过，26 项中 1 项匹配通过、25 项跳过；失败输出：无 | reused-green |
| P4 绿灯（TASK-03b） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，载体调用参数新增 `mode: 'miniapp-taxonomy-v1'` | 0 | 按本资产完整调用命令原样复跑：1 个套件通过，26 项中 1 项匹配通过、25 项跳过；1 条 `expect` 断言逐字未变；失败输出：无 | 绿灯（基线未变） |
| P5 整体回归 | 2026-08-16 | 同上 | 0 | `npm test -- --runInBand`：39 个套件、209 项全部通过 | green（BUG-09 修复后须重跑） |

- 断言清单快照（TASK-03a 于 2026-08-16 记录，供 TASK-03b 与 P5 逐字对账）：测试名 `adds the actual outfit color relationship to mini-program AI reasons`，位于 `src/wardrobe/recommendation/outfit-generator.service.spec.ts`，`expect` 共 1 条：
  1. `expect(result.ai?.recommendations[0].reason).toMatch(/同色|近似/);`
  TASK-03b 只允许为该用例的 `service.generateWithAi({...})` 调用参数补 `mode` 字段，上述断言必须保持逐字不变。

## TEST Asset · TEST-003 · preserves cautions from local generated plans

### 资产定义

- Asset ID：TEST-003
- 来源类型：reuse
- 历史来源：本轮 `docs/task.md` TASK-01a
- Derived From：无
- 定义版本：2
- 定义哈希：未记录（同 TEST-001）
- 覆盖条目：BUG-06、AC-05
- Test Seam：`MiniappOutfitController.recommend`
- 测试定义载体：`src/wardrobe/miniapp-outfit.controller.spec.ts`（测试名 `preserves cautions from local generated plans`）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts -t "preserves cautions from local generated plans"`
- 对应 TASK：TASK-01a、TASK-01b、TASK-03a、TASK-03b
- 复用判断：同 TEST-001，属跨模块响应回归，TASK-03 后仍以同一断言守护 Controller 不吞掉本地方案提醒。

### 测试定义

- 状态：green
- 定义：已存在于 `src/wardrobe/miniapp-outfit.controller.spec.ts`，验证本地方案的 `cautions` 原样出现在 HTTP 响应中。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-01a） | 未记录 | `feature/outfit-taxonomy-consumption` 未提交工作树 | 1 | 本项失败为 Controller 把本地方案提醒映射为空数组 | red |
| P4 绿灯（TASK-01b） | 未记录 | 同上 | 0 | 合并运行 3 个套件、41 项全部通过 | green |
| P4 基线（TASK-03a） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，载体未改动 | 0 | 按本资产完整调用命令原样单独执行：1 个套件通过，16 项中 1 项匹配通过、15 项跳过；失败输出：无 | reused-green |
| P4 绿灯（TASK-03b） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，载体未改动（本用例走 mock 生成器，不受入口类型影响） | 0 | 按本资产完整调用命令原样复跑：1 个套件通过，16 项中 1 项匹配通过、15 项跳过；1 条 `expect` 断言逐字未变；失败输出：无 | 绿灯（基线未变） |
| P5 整体回归 | 2026-08-16 | 同上 | 0 | `npm test -- --runInBand`：39 个套件、209 项全部通过 | green（BUG-09 修复后须重跑） |

- 断言清单快照（TASK-03a 于 2026-08-16 记录，供 TASK-03b 与 P5 逐字对账）：测试名 `preserves cautions from local generated plans`，位于 `src/wardrobe/miniapp-outfit.controller.spec.ts`，`expect` 共 1 条：
  1. `expect(result.recommendations[0].cautions).toEqual(['状态提醒：待洗衣物请先确认。']);`
  本用例通过 mock 生成器返回值驱动，TASK-03b 不需要改动它；若因类型收紧必须调整 mock 形状，只允许补 `mode` 相关字段，上述断言必须保持逐字不变。

## TEST Asset · TEST-004 · returns zero recommendations for an empty wardrobe with %s weather

### 资产定义

- Asset ID：TEST-004
- 来源类型：reuse
- 历史来源：本轮 `docs/task.md` TASK-02a
- Derived From：无
- 定义版本：2
- 定义哈希：未记录（同 TEST-001）
- 覆盖条目：BUG-08、MVP-04、MVP-05、AC-04、AC-05、HC-01、HC-05、HC-06、HC-07
- Test Seam：`MiniappOutfitController.recommend`（使用真实 `OutfitGeneratorService`）
- 测试定义载体：`src/wardrobe/miniapp-outfit.controller.spec.ts`（`it.each` 参数化用例，标签为 `auto` / `manual` / `unavailable`，共 3 个测试）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts -t "returns zero recommendations for an empty wardrobe"`
- 对应 TASK：TASK-02a、TASK-02b、TASK-03a、TASK-03b
- 复用判断：同 TEST-001。该资产同时是 TASK-04 的重要回归守卫——删除 Controller 早退分支后，空衣橱响应形状必须仍与本资产断言一致。

### 测试定义

- 状态：green
- 定义：已存在于 `src/wardrobe/miniapp-outfit.controller.spec.ts`，验证三种天气模式下的空衣橱均返回 `recommendations: []`、保留 `weather`、按当前用户查询且不调用 AI。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-02a） | 未记录 | `feature/outfit-taxonomy-consumption` 未提交工作树 | 1 | 42 项中 39 通过、3 项按预期失败，auto/manual/unavailable 均从真实生成器抛 `NotFoundException: Core garment not found` | red |
| P4 绿灯（TASK-02b） | 未记录 | 同上 | 0 | 3 个套件、44 项全部通过 | green |
| P4 基线（TASK-03a） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，载体未改动 | 0 | 按本资产完整调用命令原样单独执行：1 个套件通过，16 项中 3 项匹配通过（auto/manual/unavailable 三条参数化用例齐全）、13 项跳过；失败输出：无 | reused-green |
| P4 绿灯（TASK-03b） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，载体未改动（Controller 已改为显式声明模式） | 0 | 按本资产完整调用命令原样复跑：1 个套件通过，16 项中 3 项匹配通过、13 项跳过；3 条 `expect` 断言逐字未变；失败输出：无 | 绿灯（基线未变） |
| P5 整体回归 | 2026-08-16 | 同上 | 0 | `npm test -- --runInBand`：39 个套件、209 项全部通过 | green（BUG-09 修复后须重跑） |

- 断言清单快照（TASK-03a 于 2026-08-16 记录，供 TASK-03b 与 P5 逐字对账）：测试名 `returns zero recommendations for an empty wardrobe with %s weather`，位于 `src/wardrobe/miniapp-outfit.controller.spec.ts`，为 `it.each` 参数化用例（标签 `auto` / `manual` / `unavailable`），每条用例 `expect` 共 3 条：
  1. `await expect(controller.recommend({ weather } as any, req)).resolves.toEqual({ source: 'fallback', message: undefined, recommendations: [], weather: temperatureContext });`
  2. `expect(garmentRepository.find).toHaveBeenCalledWith({ owner: { id: 52 } }, expect.any(Object));`
  3. `expect(outfitAiService.recommend).not.toHaveBeenCalled();`
  本用例使用真实 `OutfitGeneratorService`，TASK-03b 只允许因显式 `mode` 契约调整 Controller 传参路径，上述三行必须保持逐字不变。它同时是 TASK-04b 的关键回归守卫：删除 Controller 早退分支后，第 1 条断言的响应形状（含 `message: undefined`）必须仍然成立。

## TEST Asset · TEST-005 · keeps the mini-program rule mode explicit when the client sends no weather field

### 资产定义

- Asset ID：TEST-005
- 来源类型：new
- 历史来源：无。`docs/archive/**` 不存在（命令：`ls docs/archive` → 目录不存在），无归档 TEST 元数据可检索。
- Derived From：无
- 定义版本：1
- 定义哈希：未记录（本项目未建立定义哈希机制，以测试名称加文件路径作为身份）
- 覆盖条目：BUG-09、MVP-01、MVP-05、AC-04、HC-01、HC-06
- Test Seam：`MiniappOutfitController.recommend`
- 测试定义载体：`src/wardrobe/miniapp-outfit.controller.spec.ts`（P4 由 TASK-04a 写入）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts -t "keeps the mini-program rule mode explicit when the client sends no weather field"`
- 对应 TASK：TASK-04a、TASK-04b
- 复用判断：无可复用资产。现有 `src/wardrobe/miniapp-outfit.controller.spec.ts:115-119` 与 `:143-147` 反向断言「缺省天气时不传 `temperatureContext`」，正是 BUG-09 被锁定的错误期望，必须由本资产改写为正确期望，属 new。

### 测试定义

- 状态：green
- 定义：已由 TASK-04a 写入 `src/wardrobe/miniapp-outfit.controller.spec.ts`，测试名 `keeps the mini-program rule mode explicit when the client sends no weather field`。断言顺序刻意把模式判断放在第一条，使红灯原因直接指向 BUG-09：
  1. `expect(generatorInput?.mode).toBe('miniapp-taxonomy-v1');`
  2. `expect(generatorInput?.temperatureContext?.status).toBe('unavailable');`
  3. `expect(weatherService.getContext).toHaveBeenCalledWith({ mode: 'unavailable' });`
  4. `expect(result.weather).toEqual(unavailableContext);`
  5. 末尾另用一个独立 controller 实例断言「缺省与非法是两件事」：`weather` 存在但格式非法时仍抛 `BadRequestException`，且 `weatherService.getContext` 与 `generateWithAi` 均未被调用。该段放在最后，不会干扰前四条的红灯原因。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-04a） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，TASK-03b 完成后的实现 | 1 | 第 1 条断言失败：`expect(received).toBe(expected)`，`Expected: "miniapp-taxonomy-v1"`、`Received: "legacy-web"`。缺省 `weather` 的请求仍被送进网页旧规则，正是 BUG-09 的行为。非语法、import、路径或环境错误，属原因正确的红灯 | red |
| P4 绿灯（TASK-04b） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，`miniapp-outfit.controller.ts` 已恒定声明 miniapp 模式 | 0 | 按本资产完整调用命令原样复跑：1 项匹配通过；4 条断言全部成立（模式为 `miniapp-taxonomy-v1`、温度上下文 `unavailable`、`getContext` 收到 `{mode:'unavailable'}`、响应含 `weather`），末段非法天气仍抛 `BadRequestException`；失败输出：无 | green |
| P4 绿灯（TASK-04b） | 尚未执行 | 尚未执行 | 尚未执行 | 尚未执行 | planned |
| P5 整体回归 | 尚未执行 | 尚未执行 | 尚未执行 | 尚未执行 | not-run |

## TEST Asset · TEST-006 · drops the legacy no-wearable fallback message and returns status-caution plans without a weather field

### 资产定义

- Asset ID：TEST-006
- 来源类型：new
- 历史来源：无。`docs/archive/**` 不存在，无归档 TEST 元数据可检索。
- Derived From：无
- 定义版本：1
- 定义哈希：未记录（本项目未建立定义哈希机制，以测试名称加文件路径作为身份）
- 覆盖条目：BUG-09、MVP-04、AC-05、HC-05
- Test Seam：`MiniappOutfitController.recommend`（使用真实 `OutfitGeneratorService`，先例见 `src/wardrobe/miniapp-outfit.controller.spec.ts:504`）
- 测试定义载体：`src/wardrobe/miniapp-outfit.controller.spec.ts`（P4 由 TASK-04a 写入）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts -t "drops the legacy no-wearable fallback message"`
- 对应 TASK：TASK-04a、TASK-04b
- 复用判断：无可复用资产。当前没有任何用例覆盖「缺省 `weather` + 全非可穿衣橱」这条路径，属 new。本资产承担协议要求的「旧形状退出」证明。

### 测试定义

- 状态：green
- 定义：已由 TASK-04a 写入 `src/wardrobe/miniapp-outfit.controller.spec.ts`，测试名 `drops the legacy no-wearable fallback message and returns status-caution plans without a weather field`。使用真实 `OutfitGeneratorService`（仓库与 AI 服务为 mock），衣橱为两件待洗衣物（`#82` 待洗长裤、`#81` 待洗上衣），AI 返回 `source: 'fallback'` 且无推荐以驱动本地规则方案。断言：
  1. `expect(result.message).not.toBe('衣橱里还没有可穿衣物，请先添加衣服。');`
  2. `expect(result.recommendations.length).toBeGreaterThan(0);`
  3. `expect(result.recommendations[0].cautions).toContain('状态提醒：待洗衣物请先确认。');`
  4. `expect(result.recommendations[0].garments).toEqual(expect.arrayContaining([expect.objectContaining({ statusLabel: '待洗' })]));`

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-04a） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，TASK-03b 完成后的实现 | 1 | 第 1 条断言失败：`expect(received).not.toBe(expected)`，`Expected: not "衣橱里还没有可穿衣物，请先添加衣服。"`。Controller 仍在 `!usesWeatherContext && !coreGarmentId` 分支早退，未调用生成器，全非可穿衣橱拿不到带状态提醒的方案，与 HC-05 冲突。非语法、import、路径或环境错误，属原因正确的红灯 | red |
| P4 绿灯（TASK-04b） | 2026-08-16 | 同上 | 0 | 按本资产完整调用命令原样复跑：1 项匹配通过；全非可穿衣橱经真实生成器返回 1 套方案，`cautions` 含「状态提醒：待洗衣物请先确认。」，衣物带 `statusLabel: '待洗'`，旧 fallback 文案已退出；失败输出：无 | green |
| P4 绿灯（TASK-04b） | 尚未执行 | 尚未执行 | 尚未执行 | 尚未执行 | planned |
| P5 整体回归 | 尚未执行 | 尚未执行 | 尚未执行 | 尚未执行 | not-run |

## TEST Asset · TEST-007 · keeps the legacy web AI output unchanged

### 资产定义

- Asset ID：TEST-007
- 来源类型：new
- 历史来源：无。`docs/archive/**` 不存在。
- Derived From：无
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：BUG-10、HC-01
- Test Seam：`OutfitGeneratorService.generateWithAi`
- 测试定义载体：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`（P4 由 TASK-06a 写入）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts -t "keeps the legacy web AI output unchanged"`
- 对应 TASK：TASK-06a、TASK-06b
- 复用判断：无可复用资产。现有 legacy 用例只断言 `garments`/`garmentIds`，没有任何一条守住 legacy 的 AI `reason` 原文或方案条数——这正是 BUG-10 能在上一轮 P5 溜过去的原因，属 new。

### 测试定义

- 状态：red
- 定义：已由 TASK-06a 写入 `src/wardrobe/recommendation/outfit-generator.service.spec.ts`，测试名 `keeps the legacy web AI output unchanged`。夹具为 legacy 模式、核心 `#1 黑色上衣` 与 `#2 黑色长裤`（同为 black，足以触发同色关系），AI mock 返回 4 条 `reason` 完全相同的推荐。断言 2 条：
  1. `expect(result.ai?.recommendations[0].reason).toBe(originalReason);`
  2. `expect(result.ai?.recommendations).toHaveLength(4);`
  原定义验证目标——`mode: 'legacy-web'` 下：(1) 即使入选衣物构成同色或撞色关系，`result.ai.recommendations[0].reason` 仍与 AI 原始返回**逐字相同**，不得被追加「色彩上形成…搭配。」；(2) AI 返回 4 条及以上推荐时，`result.ai.recommendations` 条数与 AI 原始返回相同，不得被截断到 3 条。P3 不编写测试代码。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-06a） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树 | 1 | 第 1 条断言失败：`Expected: "黑色上衣配黑色长裤，适合正式场合。"`、`Received: "黑色上衣配黑色长裤，适合正式场合。 色彩上形成同色系搭配。"`。网页 AI 理由确实被追加了小程序专用的颜色关系文案。非语法、import 或环境错误，属原因正确的红灯 | red |
| P4 绿灯（TASK-06b） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，`attachAiGarments` 的 legacy 分支已恢复为纯映射 | 0 | 按本资产完整调用命令原样复跑：1 项匹配通过；两条断言均成立——AI 理由逐字等于原文（不再被追加颜色关系文案），`recommendations` 长度为 4（不再被 `.slice(0, 3)` 截断）。第 2 条断言至此获得真实证据；失败输出：无 | green |
| P5 整体回归 | 尚未执行 | 尚未执行 | 尚未执行 | 尚未执行 | not-run |

- 红灯范围核对（TASK-06a，2026-08-16）：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts` 退出码 `1`，27 项中 26 通过、仅本资产 1 项失败，红灯未外溢。
- 第 2 条断言（条数不得被截断）本次尚未被执行到——jest 在第 1 条断言即中止。该断言对应实现中的 `.slice(0, 3)`，将在 TASK-06b 转绿过程中被真实执行；在此之前不声称它已获得证据。
- 既有基线问题（与本卡无关，未修复）：`npx prettier --check` 该文件退出码 `1`，唯一差异位于第 715 行 `makeService([core, whiteBottom])`，属本轮改动前即存在的格式问题；本卡新增代码经 prettier 比对无差异。按 `kun-code` 协议不顺手修复。

- 语义对齐核对（TASK-06b，2026-08-16）：以 `git show 47e422e:src/wardrobe/recommendation/outfit-generator.service.ts` 取 fixed point 原版 `attachAiGarments`，其中 `reasonWithColorRelations` / `slice(0, 3)` / `seenPlans` 出现次数为 `0`；修复后现版 legacy 分支同样为 `0`，语义与 fixed point 一致。
- 三段死代码已一并清除：`seenPlans` 声明、两处 `miniappMode &&` 判断、`!garmentIds.length` 丢弃分支（后者因 `core` 必被 `unshift` 而在 legacy 永不可达）。
- 既有基线问题（与本卡无关，未修复）：`src/wardrobe/recommendation/outfit-generator.service.ts` 的 `npx prettier` 差异位于第 114、186、342-350 行，均为本轮更早卡片（TASK-01b/02b/03b）留下；本卡改动区域经 prettier 比对无差异。

## TEST Asset · TEST-008 · applies default core selection only in mini-program mode

### 资产定义

- Asset ID：TEST-008
- 来源类型：new
- 历史来源：无。`docs/archive/**` 不存在。
- Derived From：无
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：BUG-11、HC-01、HC-05
- Test Seam：`OutfitGeneratorService.generateWithAi`
- 测试定义载体：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`（P4 由 TASK-07a 写入）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts -t "applies default core selection only in mini-program mode"`
- 对应 TASK：TASK-07a、TASK-07b
- 复用判断：无可复用资产。现有三条默认核心用例以 `mode: 'legacy-web'` 正面锁定了本应属于小程序的规则，需由本资产建立正确的模式边界断言，属 new。

### 测试定义

- 状态：red
- 定义：已由 TASK-07a 写入 `src/wardrobe/recommendation/outfit-generator.service.spec.ts`，测试名 `applies default core selection only in mini-program mode`。夹具为「衣橱只有非可穿衣物」——`#31 待洗上衣`（Laundry）与 `#42 收纳长裤`（Stored），三段断言共用同一个 service 实例：
  1. `await expect(service.generateWithAi({ mode: 'legacy-web', coreGarmentId: 31 })).rejects.toBeInstanceOf(NotFoundException);` —— legacy 只在可穿范围内查找核心，指定非可穿衣物必须清晰报错。
  2. `await expect(service.generateWithAi({ mode: 'legacy-web', requestText: '默认核心' } as any)).rejects.toBeInstanceOf(NotFoundException);` —— legacy 不执行默认核心规则。此处 `as any` 是为验证运行时不退化，不代表承认该入参合法。
  3. `expect(miniapp.plans.every((plan) => plan.garments.some((garment) => garment.id === 42))).toBe(true);` —— 小程序模式保留「没有可穿衣物时选最新其它状态衣物」的规则。
  原定义验证目标——`mode: 'legacy-web'` 下：(1) 指定的 `coreGarmentId` 指向一件非可穿衣物时抛 `NotFoundException`（legacy 只在可穿范围内查找核心）；(2) legacy 不执行「没有可穿衣物就退而选最新其它状态衣物」的默认核心规则。同时保留 `mode: 'miniapp-taxonomy-v1'` 下该默认核心规则仍然成立的正向断言。P3 不编写测试代码。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-07a） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，TASK-06b 完成后的实现 | 1 | 第 2 条断言失败：`Received promise resolved instead of rejected`。legacy 模式未给 `coreGarmentId` 时没有报错，反而把 `#42 收纳长裤`（status `stored`，非可穿）选为默认核心并生成了 3 套方案——正是 BUG-11 描述的「小程序默认核心规则漏进 legacy」。第 1 条断言（指定非可穿核心须报错）当前即通过，属既有正确行为的守卫。非语法、import 或环境错误，属原因正确的红灯 | red |
| P4 绿灯（TASK-07b） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，核心选择已按 `mode` 分流 | 0 | 按本资产完整调用命令原样复跑：1 项匹配通过；三段断言均成立——legacy 指定非可穿核心报错、legacy 不做默认核心选择、小程序仍保留默认核心规则并选中 `#42`；失败输出：无 | green |
| P5 整体回归 | 尚未执行 | 尚未执行 | 尚未执行 | 尚未执行 | not-run |

- 用例迁移记录（TASK-07a 授权范围内，2026-08-16）：三条原本以 `mode: 'legacy-web'` 锁定小程序规则的既有用例已改到正确模式，**全部 `expect` 断言逐字未变**，只调整了 `mode` 与必要入参：
  1. `selects the highest-id wearable garment as the default core`：`mode` 由 `'legacy-web'` 改为 `'miniapp-taxonomy-v1'`，新增 `temperatureContext: temperatureContext(16, 20)` 与 `as any`。`userId: 7` 与仓库查询断言不变。
  2. `selects the highest-id non-wearable garment when no wearable garment exists`：同上，`mode` 改为 `'miniapp-taxonomy-v1'` 并补 `temperatureContext` 与 `as any`。
  3. `fails clearly when default-core selection receives an empty wardrobe`：保留 `mode: 'legacy-web'`，新增 `coreGarmentId: 1`（TASK-07b 后 legacy 的 `coreGarmentId` 恢复必填，`ts-jest` 开启类型检查，不补则无法编译）。空衣橱下 `wearable.find(...)` 仍返回 `undefined`，`NotFoundException` 断言逐字不变。
  迁移后三条用例均通过。
- 红灯范围核对（TASK-07a）：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts` 退出码 `1`，28 项中 27 通过、仅本资产 1 项失败，红灯未外溢；TEST-001~TEST-007 未受影响。
- 格式：本卡新增代码经 `npx prettier` 比对无差异；该 spec 文件仅剩第 715 行 `makeService([core, whiteBottom])` 一处改动前即存在的格式问题，按 `kun-code` 协议未顺手修复。

- 跨模块检查（TASK-07b，2026-08-16）：`npm run build` 退出码 `0`。由于 `LegacyWebGenerateOutfitInput.coreGarmentId` 已恢复必填且 `ts-jest`/`tsc` 均开启类型检查，构建通过即证明网页调用方 `src/wardrobe/outfit.controller.ts:85` 仍满足新契约，没有遗漏的 legacy 调用点。
- 与 fixed point 的语义对齐：原版 `core = wearable.find((garment) => garment.id === input.coreGarmentId)`；修复后 legacy 分支为同一表达式，网页语义回到 `47e422e`。小程序分支保留「优先最新可穿、其次最新其它状态」的既有规则。
- 格式：本卡改动区域（第 111-116 行）经 `npx prettier` 比对无差异；该实现文件剩余差异位于第 118、190、346-354 行，均为本轮更早卡片留下，按 `kun-code` 协议未顺手修复。

## TEST Asset · TEST-009 · warns about temperature when an explicit request overrides the exclusion

### 资产定义

- Asset ID：TEST-009
- 来源类型：new
- 历史来源：无。`docs/archive/**` 不存在。
- Derived From：无
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：BUG-12、AC-03、MVP-03、HC-03
- Test Seam：`OutfitGeneratorService.generateWithAi`
- 测试定义载体：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`（P4 由 TASK-08a 写入）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts -t "warns about temperature when an explicit request overrides the exclusion"`
- 对应 TASK：TASK-08a、TASK-08b
- 复用判断：无可复用资产。现有 `'我要保暖'` 用例把核心本身设成冬寒/加厚，走的是 AC-03 的第二个触发条件；第一个触发条件（明确需求 + 非核心冲突单品）无任何覆盖，属 new。

### 测试定义

- 状态：red
- 定义：已由 TASK-08a 写入 `src/wardrobe/recommendation/outfit-generator.service.spec.ts`，测试名 `warns about temperature when an explicit request overrides the exclusion`。两段场景共 4 条断言：
  - 高温场景：核心 `#10 白衬衫`（无任何厚薄/天气标签）、非核心 `#20 加厚外套`（`taxonomyTags.thickness = ['加厚']`），`requestText = '今天想保暖一点'`，`temperatureContext(20, 28)`（最高温 28℃ > 25℃）。
    1. `expect(warmPlan.garments.some((garment) => garment.id === 20)).toBe(true);` —— 明确需求确实放行了冲突单品。
    2. `expect(warmPlan.cautions.join(' ')).toMatch(/温度|保暖|厚/);` —— 放行之后必须给出温度注意事项。
  - 低温镜像场景：非核心 `#21 极薄长裤`（`thickness = ['极薄']`），`requestText = '想穿得清爽一点'`，`temperatureContext(8, 15)`（最低温 8℃ ≤ 10℃），断言结构同上，正则为 `/温度|保暖|薄/`。
  断言刻意使用宽松正则而非精确文案，以免把尚待用户拍板的提醒措辞写死。
  原定义验证目标——`mode: 'miniapp-taxonomy-v1'`、`temperatureContext` 最高温大于 25℃、`requestText` 含明确保暖需求、核心衣物本身无厚薄/天气标签、衣橱另有一件明确标记为加厚的非核心单品：该非核心单品因明确需求而未被排除并进入方案，此时方案的 `cautions` **不得为空**，必须含温度注意事项。低温镜像场景（最低温不高于 10℃ + 明确凉爽需求 + 非核心极薄单品）同理。**不得改动任何温度阈值或比较符**。P3 不编写测试代码。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-08a） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，TASK-07b 完成后的实现 | 1 | 高温场景第 2 条断言失败：`Expected pattern: /温度|保暖|厚/`、`Received string: ""`。第 1 条断言通过，说明 `#20 加厚外套` 确实因明确保暖需求被放行并进入方案，但 `cautions` 为空——28℃ 下拿到含加厚外套的方案却没有任何温度提醒，正是 BUG-12 与 AC-03 第一个触发条件的缺口。非语法、import 或环境错误，属原因正确的红灯 | red |
| P4 绿灯（TASK-08b） | 2026-08-16 | `feature/outfit-taxonomy-consumption` 未提交工作树，`temperatureCautions` 已覆盖明确需求触发条件 | 0 | 按本资产完整调用命令原样复跑：1 项匹配通过；高温与低温两段镜像场景的 4 条断言全部成立——冲突单品仍被明确需求放行进入方案，且 `cautions` 不再为空；失败输出：无 | green |
| P5 整体回归 | 尚未执行 | 尚未执行 | 尚未执行 | 尚未执行 | not-run |

- 红灯范围核对（TASK-08a，2026-08-16）：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts` 退出码 `1`，29 项中 28 通过、仅本资产 1 项失败，红灯未外溢；TEST-001~TEST-008 未受影响。
- 格式：本卡新增代码经 `npx prettier` 比对无差异；该 spec 文件仅剩第 715 行 `makeService([core, whiteBottom])` 一处改动前即存在的格式问题，按 `kun-code` 协议未顺手修复。
- 待用户拍板项（TASK-08b 施工前须确认）：非核心冲突场景的提醒措辞。SPEC 只要求「看到真实温度带来的注意事项」，未规定文字。拟沿用既有句式新增「温度冲突提醒：本次按你的明确需求保留了偏厚单品，请结合体感调整。」及其低温镜像文案。本资产断言使用宽松正则，更换措辞不需要改动 TEST 定义。

- 文案决定已获用户确认（2026-08-16）：新增两条非核心场景提醒——「温度冲突提醒：本次按你的明确需求保留了偏厚单品，请结合体感调整。」与「低温提醒：本次按你的明确需求保留了偏薄单品，请注意保暖并结合体感调整。」。既有的两条核心场景文案（「核心单品偏厚」「核心单品偏薄」）保持不变，两类场景分别计数、文案不互相冒充。
- HC-02 未被触碰的证据（TASK-08b，2026-08-16）：`grep -n "> 25\|<= 10" src/wardrobe/recommendation/outfit-generator.service.ts` 命中第 442-443 行（排除判断）与第 614-615 行（提醒判断），比较符与阈值均与改动前逐字一致；本卡只增加提醒，未改变任何排除逻辑。
- 格式：本卡新增的一条长文案初次触发 prettier 差异（原第 656 行），已自行修正；该实现文件剩余差异位于第 118、190、346-354 行，均为本轮更早卡片留下，按 `kun-code` 协议未顺手修复。

## P5 Current 结果

| 检查 | 工作目录 | 完整命令 | 时间 | 退出码 | 结论 |
|---|---|---|---|---:|---|
| 证据预检 | `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` | `npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/outfit.controller.spec.ts src/wardrobe/recommendation/wardrobe-recommendation.service.spec.ts` | 2026-08-16 | 0 | passed（4 个套件、47 项通过） |
| Manifest 全量执行（CLOSURE-1 复跑） | `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` | TEST-001~TEST-006 各自的完整调用命令逐条原样执行 | 2026-08-16 | 0 | passed（CLOSURE-1 于 2026-08-16 逐条原样复跑 TEST-001~TEST-009 共九个资产，退出码均为 `0`） |
| 整体回归 | `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` | `npm test -- --runInBand --verbose` | 2026-08-16 | 0 | passed（CLOSURE-1 于 2026-08-16 返修后复跑：39 个套件、214 项全部通过，失败集合为空；INITIAL 时为 211 项，差额 3 项为 TEST-007/008/009） |

### 整体回归按测试名称对账

- 本轮 fixed point 基线为 209 项（2026-08-16 TASK-03 施工前实跑）；当前 211 项。
- 差额 2 项经名称核对，恰为本轮新增的 TEST-005 `keeps the mini-program rule mode explicit when the client sends no weather field` 与 TEST-006 `drops the legacy no-wearable fallback message and returns status-caution plans without a weather field`。
- 六个资产的固定测试名称全部出现在通过清单中，无跳过、无改名、无删除。
- 旧测试无新增失败，原失败集合仍为空。

- 适用的其它检查：
  - `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`：`npm run test:miniapp`，2026-08-16，退出码 `0`。
  - `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`：`npm run build`，2026-08-16，退出码 `0`。
  - `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`：`git diff --check`，2026-08-16，退出码 `0`。
  - `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`：`npx prettier --check src/wardrobe/miniapp-outfit.controller.ts src/wardrobe/miniapp-outfit.controller.spec.ts`，2026-08-16，退出码 `0`。
  - 边界检查：`grep -rn "usesWeatherContext" src/wardrobe/miniapp-outfit.controller.ts`，2026-08-16，无结果，确认 Controller 不再存在由天气字段派生的隐式分支。
- P5 评审门禁：CLOSURE-1 入场门通过——manifest 九个资产无 `planned`、全量复跑退出码均为 `0`、整体回归 214 项全绿，`npm run build`、`npm run test:miniapp`、`git diff --check` 均退出码 `0`。冻结集判定见下方 CLOSURE-1 记录。

## TASK-04b 阻塞记录与解除（2026-08-16）

TEST-005 与 TEST-006 均已由 TASK-04b 的实现转绿，上方执行记录为真实结果。但 TASK-04b 未能交付 `green`，原因如下：

- 现象：`src/wardrobe/miniapp-outfit.controller.spec.ts` 中既有用例 `orchestrates auto weather, the current user, and the normalized temperature context` 由绿转红。失败断言为该用例第 228 行 `expect(garmentService.findAll).toHaveBeenCalledWith(42, {});`，实际结果为该 mock 零调用。
- 根因：`docs/plan.md` 与 TASK-04b 的 `Produces` 明确要求「移除 `recommend` 内仅为这些分支服务的 `garmentService.findAll` 调用」。移除后 Controller 的 `recommend` 不再自行查询衣橱（改由生成器按 `owner.id` 查询），该行断言的对象随之消失。
- 冲突：TASK-04b 的「允许改」只有 `src/wardrobe/miniapp-outfit.controller.ts`，「禁止碰」包含 TASK-04a 的 TEST 定义与断言。要让该用例转绿，必须改动不在本卡授权范围内的测试文件，属 `kun-code` 协议的停止条件，因此本卡记为 `blocked`，不通过改测试或保留无用查询来强行变绿。
- 规划缺口：该行断言在 P3 未被识别为 `CC-01/CC-02` 的受影响落点，TASK-04a 的改写清单也未覆盖它。这是 PLAN 的遗漏，需由用户裁决后回 P3 或扩大 TASK-04a 范围处理。
- 用户隔离未失守的证据：同一用例第 233 行仍断言 `userId: 42` 传入生成器；TEST-004 断言真实生成器以 `{ owner: { id: 52 } }` 查询。两者共同覆盖第 228 行原本要保护的隔离语义。
- 当前工作树状态：`npm test -- --runInBand` 退出码 `1`，211 项中 210 通过、1 项失败（即上述用例）。在裁决前不得提交。

### 阻塞解除（2026-08-16，用户明确授权）

- 裁决：用户选择方案 A，授权删除该单条断言，范围严格限定为 `orchestrates auto weather, the current user, and the normalized temperature context` 用例中的 `expect(garmentService.findAll).toHaveBeenCalledWith(42, {});` 一行；该用例其余断言与其它用例一律不动。
- 依据：该断言校验的是「Controller 自身查询衣橱」这一已被移除的实现细节，不是业务行为。其原本要保护的用户隔离语义仍由两处守卫覆盖——同一用例的 `userId: 42` 断言，以及 TEST-004 对真实生成器 `{ owner: { id: 52 } }` 的查询断言。
- 规划缺口已回填：`docs/plan.md` 的契约影响面表已补登该落点为 `CC-02` 的「修改」项，并注明为 P3 初版遗漏、施工时暴露、经用户授权后处置。`docs/task.md` 的 TASK-04b「允许改」已写明这次一行授权。
- 处置后验证（cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`）：
  - 六个资产的完整调用命令原样复跑，退出码均为 `0`。
  - 聚焦四套件 `npx jest --runInBand ...`：退出码 `0`，4 个套件、47 项全部通过。
  - `npm test -- --runInBand`：退出码 `0`，39 个套件、211 项全部通过（改前基线 209 项 + 本轮新增 TEST-005/TEST-006 共 2 项，数量可对账）。
  - `npm run build`、`npm run test:miniapp`、`git diff --check`：退出码均为 `0`。
  - `npx prettier --check src/wardrobe/miniapp-outfit.controller.ts src/wardrobe/miniapp-outfit.controller.spec.ts`：退出码 `0`。
  - 边界检查：`grep -rn "usesWeatherContext" src/wardrobe/miniapp-outfit.controller.ts` 无结果。
- 结论：阻塞解除，TASK-04b 收口为 `green`。

### 遗留观察（不在本卡范围，供 P5 判断）

- `src/wardrobe/miniapp-outfit.controller.spec.ts` 多个 `recommend` 用例仍保留 `garmentService.findAll.mockResolvedValue(...)` 前置设定，但 Controller 的 `recommend` 已不再调用它，属无害的冗余 mock。统一清理会波及多个用例，超出本卡范围，未处理。
- `src/wardrobe/recommendation/outfit-generator.service.spec.ts` 存在 1 处本轮改动前即有的 prettier 格式问题（当前第 715 行 `makeService([core, whiteBottom])`），按 `kun-code` 协议未顺手修复。

## P5 CLOSURE-1 冻结集判定（2026-08-16）

- 轮次：`CLOSURE-1`；Fixed point `47e422e`；返修起点快照 `af5a07eb5766660e`；模式 `WORKTREE`。
- 入场门：通过（manifest 九个资产无 `planned`、逐条原样复跑退出码均为 `0`、整体回归 214 项全绿）。
- 返修范围核对：对照 INITIAL 快照的 32 个文件，27 个哈希未变，仅 5 个变化——`docs/plan.md`、`docs/task.md`、`docs/test.md`、`src/wardrobe/recommendation/outfit-generator.service.ts`、`src/wardrobe/recommendation/outfit-generator.service.spec.ts`。无范围外溢。

| ID | 位置 | 判定 | 直接证据 |
|---|---|---|---|
| B01 | `outfit-generator.service.ts` `attachAiGarments` legacy 分支 | CLOSED | TASK-06b 把该分支恢复为纯映射。`reasonWithColorRelations` / `slice(0, 3)` / `seenPlans` / `!garmentIds.length` 在该分支的出现次数为 `0`；`return` 块数与 fixed point 原版同为 2。TEST-007 断言 legacy AI 理由逐字等于原文、`recommendations` 长度为 4 未被截断，退出码 `0`。原可观察后果（网页 AI 理由被追加「色彩上形成…搭配。」、第 4 条起被丢弃）已消失。 |
| B02 | `outfit-generator.service.ts` 核心选择 + 入口类型 | CLOSED | TASK-07b 使 `LegacyWebGenerateOutfitInput.coreGarmentId` 恢复必填，核心选择改为按 `mode` 分流：legacy 为 `wearable.find((garment) => garment.id === input.coreGarmentId)`（与 fixed point 逐字相同），默认核心分支只存在于 miniapp 侧。TEST-008 三段断言全部成立，退出码 `0`；`npm run build` 退出码 `0` 证明全部 legacy 调用点满足必填契约。原可观察后果（legacy 未指定核心时选中 `status: 'stored'` 的 `#42` 并生成 3 套方案）已消失。 |
| B03 | `outfit-generator.service.ts` `temperatureCautions` | CLOSED | TASK-08b 使该函数真正消费 `requestText`：`isExplicitWarmRequest` / `isExplicitCoolRequest` 参与判定，核心与非核心分别累计为 `coreHighConflict` / `coreLowConflict` / `requestedHighConflict` / `requestedLowConflict`，文案互不冒充。TEST-009 高温与低温两段镜像共 4 条断言成立，退出码 `0`。原可观察后果（28℃ 下明确保暖需求放行加厚非核心单品却 `cautions` 为空）已消失。阈值未被触碰：`> 25` / `<= 10` 在排除判断与提醒判断两处均与改动前逐字一致。 |

- 返修新引入的阻断：无。逐项核对——(1) legacy 恢复必填核心后，网页缺参场景在 fixed point 与 INITIAL 状态下同样抛 `NotFoundException`，非本次新增；(2) `temperatureCautions` 改为遍历全部入选衣物，仅增加数条 profile 计算，无功能或安全影响；(3) 小程序路径 `attachMiniappAiGarments` 未被触碰，其自带的去重、归一化与三套上限要素仍在；(4) 生成器 spec 由 26 条增至 29 条，增量与本次三张 a 卡一一对应，无删除或跳过。
- 结论：冻结集 B01/B02/B03 全部 `CLOSED`，无新引入阻断，`CLOSURE-1` 判定为 `PASS`。本次 `PASS` 只代表冻结集已关闭，不代表代码没有问题。
- 遗留项（不满足新阻断准入判据，不阻断本轮，由用户另开 Bug 任务）：
  1. B04（`OutfitTemperatureContext` 非判别式联合、消费端 `?? ±Infinity` 兜底）为 INITIAL 阻断项，用户在返修出口未选择处理，仍 `OPEN`，根因 `PLAN`，需回 P3。
  2. `src/wardrobe/recommendation/outfit-generator.service.ts` 第 118、190、346-354 行与 `outfit-generator.service.spec.ts` 第 715 行存在本轮更早卡片留下的 prettier 格式差异，按 `kun-code` 协议未顺手修复。
  3. `fails clearly when default-core selection receives an empty wardrobe` 用例名称与其现有入参（已改为显式核心）略有出入。
  4. INITIAL 的三条非阻断观察（`this.dedupePlans` 未绑定 `this`、天气服务零日志、`miniappFallback` 使上游分支不可达）仍未处理。


## TEST Asset · TEST-010 · builds an available context from the real Tencent weather responses

### 资产定义

- Asset ID：TEST-010
- 来源类型：new
- 历史来源：无。`docs/archive/**` 不存在。
- Derived From：无
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：BUG-13、BUG-15、AC-01、AC-04、MVP-01、HC-06
- Test Seam：`TencentWeatherService.getContext`（经 `TENCENT_WEATHER_FETCH` 注入返回真实夹具的假 fetch）
- 测试定义载体：`src/weather/tencent-weather.service.spec.ts`（P4 由 TASK-09a 写入）
- 夹具载体：`src/weather/__fixtures__/tencent-weather-responses.ts`（P4 由 TASK-09a 新增，内容为 2026-08-17 实测原文）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts -t "builds an available context from the real Tencent weather responses"`
- 对应 TASK：TASK-09a、TASK-09b
- 复用判断：无可复用资产。现有 `src/weather/tencent-weather.service.spec.ts` 的全部用例都基于**自行编造**的返回体（`realtime` 为对象、存在 `hourly` 与 `temperatureC` 字段），与腾讯真实契约无关；这些用例证明不了任何真实行为，不能作为复用来源，属 new。

### 测试定义

- 状态：green
- 定义：auto 模式（`{ mode: 'auto', latitude, longitude }`）调用 `getContext`，假 fetch 按 URL 中的 `type` 参数分发两份实测夹具（`type=now` 返回实时夹具，`type=hours` 返回逐小时夹具）。断言：
  1. `result.status === 'available'`；
  2. `result.currentC` 等于实时夹具中 `result.realtime[0].infos.temperature` 的真实值；
  3. `result.hourly` 恰好 8 条；
  4. `result.hourly[0].timestamp` 等于写死的期望 ISO 字符串——夹具中 `hour` 为 `"2026-08-17 10:00:00"`（东八区），期望值为 `2026-08-17T02:00:00.000Z`；
  5. `result.minC` / `result.maxC` 等于这 8 条的真实最小/最大值；
  6. 假 fetch 收到的两个 URL 均**不含** `city=` 参数，且两次调用为串行（第二次发起时第一次已 resolve）。
- 时区要求：本资产的红灯与绿灯**都必须在 `TZ=UTC` 下执行**。开发机为东八区，naive 的 `new Date("2026-08-17 10:00:00")` 在东八区恰好得到与显式 `+08:00` 相同的结果，不加 `TZ=UTC` 则第 4 条断言在错误实现下也会通过，红灯无效。实测佐证：同一字符串在东八区解析得 `2026-08-17T02:00:00.000Z`，在 `TZ=UTC` 下解析得 `2026-08-17T10:00:00.000Z`，相差 8 小时；生产容器 `docker/Dockerfile:29` 的 `node:22-slim` 未设 `TZ`，等同 `TZ=UTC`。
- 预期红灯原因：现有实现不传 `type`、把 `result.realtime` 当对象读、在不存在的 `result.hourly` 路径找逐小时，`parseProviderPayload` 返回 `undefined`，`getContext` 降级为 `status:'unavailable'`，第 1 条断言即失败。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-09a） | 2026-08-17 | `feature/outfit-taxonomy-consumption` 未提交工作树，实现文件为 `5b53509` 原样 | 1 | `expect(result.status).toBe('available')` 失败：`Expected: "available"`、`Received: "unavailable"`（spec 第 292 行）。现有实现不传 `type`、把 `result.realtime` 当对象读、在不存在的 `result.hourly` 路径找逐小时，`parseProviderPayload` 返回 `undefined`，`getContext` 降级为不可用，与预期红灯原因逐条吻合。非语法、import、路径或环境错误 | red |
| P4 绿灯（TASK-09b） | 2026-08-17 | `feature/outfit-taxonomy-consumption` 未提交工作树，请求与解析层已按实测契约重写 | 0 | 先原样复跑确认红灯仍在且原因未漂移（`Expected: "available"` / `Received: "unavailable"`），实现后同一命令退出 `0`，本资产 1 项通过；同套件 8 项全部通过。失败输出：无 | green |
| P5 整体回归 | 尚未执行 | 尚未执行 | 尚未执行 | 尚未执行 | not-run |

- 绿灯整体核对（TASK-09b，2026-08-17）：`npm test -- --runInBand` 退出码 `0`，39 个套件、215 项全部通过（上一基线 214 项 + 本资产新增 1 项，数量可对账）。`TZ=UTC npx jest --runInBand` 同样退出码 `0`、39 套件 215 项——**在生产容器时区下整体回归也全绿**，证明修复不依赖开发机时区。`npm run build`、`npm run test:miniapp`、`git diff --check` 均退出码 `0`。
- 红灯范围核对（TASK-09a，2026-08-17）：`TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts` 退出码 `1`，8 项中 7 项通过、仅本资产 1 项失败，红灯未外溢；TEST-001~TEST-009 所在文件未被触碰。
- 改动范围核对：`git diff --stat -- src/weather/tencent-weather.service.ts src/wardrobe src/ai miniprogram` 输出为空，实现文件零改动。`npx prettier --check` 对新增夹具与 spec 均报 `All matched files use Prettier code style!`；`git diff --check` 退出码 `0`。
- 时间冻结说明：夹具首个时段为北京时间 `2026-08-17 10:00:00`，测试以 `jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-17T02:00:00.000Z'))` 冻结当前时刻，使「只保留未来时段」的过滤不随真实时间漂移；该 spy 在同一 `describe` 的 `afterEach` 中通过 `jest.restoreAllMocks()` 归还，不影响既有用例。
- **遗留风险 —— 已于 2026-08-17 由 P3 补正解决**：处置办法写入 `docs/task.md#TASK-09b` 的「既有用例改写约束」——把本 spec 文件按点名范围纳入 TASK-09b 的「允许改」，三条用例**改喂真实夹具而非退役**，三项保护意图（隐私降精度、供应商城市归一、缓存窗口）一条都不许削弱，并禁止用 `it.skip` / `it.todo` / 放宽断言蒙混过关。以下为原始风险记录，保留备查：本 spec 文件中另有 3 条既有用例——「在外发和缓存前将自动坐标保留两位…」「手动城市请求不需要暴露坐标…」「相同的降精度坐标在十五分钟缓存窗口内只请求一次」——全部依赖 `successfulProviderPayload` 这份**编造的返回体**并断言 `status: 'available'`。TASK-09b 把解析层改为只认真实契约后，这 3 条必然转红。而 TASK-09b 的「允许改」只有 `src/weather/tencent-weather.service.ts`，**不含本 spec 文件**，届时无法在白名单内让整体回归转绿。这是卡片切分的缺口，须回 P3 补正后再开工 TASK-09b，不得在 09b 施工时顺手扩大范围。
- 夹具溯源：四份原始响应由 2026-08-17 用真实 key 实测取得，请求分别为 `type=now&location=39.91,116.72`、`type=now&adcode=110000`、`type=future&adcode=110000`、`type=hours&adcode=110000`，均返回 `status:0`。契约摘要见 `docs/plan.md#外部依赖实测契约`。夹具入库时只允许删除 `request_id`，字段名与层级必须逐字保留。

## TEST Asset · TEST-011 · resolves a manual city to an adcode through the geocoder

### 资产定义

- Asset ID：TEST-011
- 来源类型：new
- 历史来源：无。`docs/archive/**` 不存在。
- Derived From：无
- 定义版本：1
- 定义哈希：planned
- 覆盖条目：BUG-14、AC-01、MVP-01、HC-06、SPEC 第 22 条
- Test Seam：`TencentWeatherService.getContext`（假 fetch 按 URL 路径分发 geocoder 与天气夹具，并记录调用顺序与完整 URL）
- 测试定义载体：`src/weather/tencent-weather.service.spec.ts`（P4 由 TASK-10a 写入）
- 夹具载体：`src/weather/__fixtures__/tencent-weather-responses.ts`（TASK-10a 追加 geocoder 实测响应）
- 工作目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 完整调用命令：`TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts -t "手动城市经地址解析换取 adcode"`（按 describe 名匹配，一次运行本资产全部三条用例）
- 对应 TASK：TASK-10a、TASK-10b
- 复用判断：无可复用资产。现有 manual 模式用例断言的是发送 `city=` 参数——那正是 BUG-14 本身，属于把错误行为锁死的反向断言，不能复用，属 new。

### 测试定义

- 状态：green
- 定义：manual 模式（`{ mode: 'manual', city: '北京市' }`）调用 `getContext`，假 fetch 按 URL 路径分发：`/ws/geocoder/v1/` 返回 geocoder 实测夹具，`/ws/weather/v1/` 返回天气夹具。断言：
  1. 第一次请求的 URL 包含 `/ws/geocoder/v1/` 且携带 `address=北京市`；
  2. 后续天气请求的 URL 携带 `adcode=110000`（取自 geocoder 夹具的 `result.ad_info.adcode`）；
  3. **所有**请求 URL 均不含 `city=` 参数；
  4. `result.status === 'available'` 且 `result.city` 为真实城市名；
  5. 三次请求为串行调用。
  并补一条降级用例：geocoder 返回无 `ad_info.adcode` 的响应时，`getContext` 返回 `status:'unavailable'`，且**不得**发出任何携带默认城市或默认 adcode 的天气请求（HC-06 禁止静默猜测城市）。
- 预期红灯原因：现有实现在 manual 模式直接发送 `city=<城市名>` 给天气接口，从不请求 geocoder，第 1 条断言即失败。真实链路下该参数会被腾讯拒绝为 `status:348`。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-10a） | 2026-08-17 | `feature/outfit-taxonomy-consumption` 未提交工作树，实现为 TASK-09b 完成后的状态 | 1 | 本资产 3 条全部失败，原因逐条对上 BUG-14：①「经 geocoder 解析」——`Expected substring: "/ws/geocoder/v1/"`、`Received string: "https://weather.example.test/ws/weather/v1/?key=…&type=now&city=%E5%8C%97%E4%BA%AC%E5%B8%82"`，第一次请求直接打了天气接口并携带腾讯不接受的 `city` 参数；②「geocoder 解析不出城市时降级」与③「geocoder 无 adcode 时降级」——均为 `Expected: "unavailable"` / `Received: "available"`，因为实现根本不调用 geocoder，失败响应无从生效。非语法、import 或环境错误 | red |
| P4 绿灯（TASK-10b） | 2026-08-17 | `feature/outfit-taxonomy-consumption` 未提交工作树，手动城市已改走 geocoder（首轮阻塞，经 P3 二次补正后重开） | 0 | **本资产 3 条全部转绿**；先原样复跑确认红灯仍在且原因未漂移，实现后三条断言全部成立，`grep -n "city=" src/weather/tencent-weather.service.ts` 无命中。但整套退出码为 `1`——唯一失败项是本资产之外的既有用例 `手动城市请求不需要暴露坐标，并返回供应商归一化城市`，该失败经 P3 二次补正后由本卡在补正范围内修复（测试桩增加 geocoder 路由），重开后整套 11 项全部通过 | green |
| P5 整体回归 | 尚未执行 | 尚未执行 | 尚未执行 | 尚未执行 | not-run |

- **阻塞记录（TASK-10b，2026-08-17）**：整套 11 项中 10 项通过，唯一失败为 TASK-09b 时期改写的 `手动城市请求不需要暴露坐标，并返回供应商归一化城市`，实际返回 `{ status: 'unavailable', reason: '天气位置不可用。', hourly: [] }`。根因是**测试桩缺陷而非实现缺陷**：该用例的 `makeRealFetch` 只按 `type=hours` 二分流，把实时天气夹具返回给了 `/ws/geocoder/v1/` 请求，`resolveAdcode` 找不到 `ad_info.adcode` 于是如实降级。最小修复为改用 TASK-10a 已建好的 `makeRoutedFetch`，约 3 行，断言意图无需变动；但该 spec 不在 TASK-10b 的「允许改」内，按协议不得顺手修复，须回 P3 补正卡片白名单后重开 TASK-10b。此为 TASK-09b 同类阻塞的**第二次复发**，P3 补正时须一并核查剩余卡片。

- 用例数量说明：卡片原文规划「主用例 + 一条降级用例」，实际落地 **3 条**。降级拆为两条，因为实测发现腾讯的两种失败形态不同：地址解析不到时返回的是 `status:348`（而非 `status:0` 配空结果），与「返回成功但缺 `ad_info`」是不同的代码路径，合成一条会漏掉其中一条分支。
- 派生数据声明：第三条用例的 payload 由实测成功响应**派生**（保留 `status:0`、摘掉 `ad_info`），用于验证「供应商返回成功但缺字段」的防御。该构造在用例内就地声明并注释标明来源，**未**写入夹具文件冒充实测样本。
- 红灯范围核对（TASK-10a，2026-08-17）：`TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts` 退出码 `1`，11 项中 8 项通过、仅本资产 3 项失败，红灯未外溢；TEST-010 与其余既有用例均未受影响。
- 改动范围核对：本卡只编辑 `src/weather/tencent-weather.service.spec.ts` 与 `src/weather/__fixtures__/tencent-weather-responses.ts`。`git diff` 中实现文件的改动全部来自 TASK-09b（工作树尚未提交，故 diff 累计显示）。红灯本身即为实现未被触碰的佐证——三条失败呈现的正是 TASK-09b 遗留的旧手动路径行为，若实现被改动则不会是这个失败形态。`npx prettier --check` 对两份文件均通过；`git diff --check` 退出码 `0`。
- 夹具溯源：geocoder 响应由 2026-08-17 实测 `GET /ws/geocoder/v1/?address=北京市` 取得，返回 `status:0`，`result.ad_info.adcode` 为 `"110000"`，与天气接口共用同一 key，无需额外开通。
