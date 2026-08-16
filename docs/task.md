# 小程序穿搭出口与调用模式收敛 TASKS

- 上游：`docs/plan.md`（用户认可后方可施工）
- 功能点：8/10

## TASK-01a · 写测试：本地与 AI 方案共用完整提醒和颜色依据

### 任务定义

- 状态：red
- 来源：BUG-06、BUG-07、MVP-04、AC-03、AC-05、HC-02、HC-03、HC-04、HC-05、HC-07
- 契约影响面：无
- 阻塞依赖（Depends On）：无
- 可并行（Parallel With）：无（与 TASK-02a 共用生成器和 Controller 测试文件，按顺序施工）
- Consumes：现有 `OutfitGeneratorService.generateWithAi`、`MiniappOutfitController.recommend`、状态/温度提醒与动态颜色关系公开行为
- Produces：原因正确的红测，锁定 AI fallback 为空时本地方案仍有状态/核心温度提醒、AI 成功方案仍有整套颜色依据、Controller 不丢失本地 `cautions`
- Test Seam：`OutfitGeneratorService.generateWithAi` + `MiniappOutfitController.recommend`
- TEST Asset ID：TEST-001、TEST-002、TEST-003
- 来源类型：new（施工时；本轮已迁移为结构化资产）
- TEST 记录：`docs/test.md#TEST-001`、`docs/test.md#TEST-002`、`docs/test.md#TEST-003`
- 历史来源：无
- 边界约束：只观察公开返回的 `plans/recommendations`、`reason/cautions`；禁止断言私有归一化函数
- 跨模块检查：Controller mock 生成器返回带 cautions 的本地方案，确认最终 HTTP 响应原样保留
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`、`src/wardrobe/miniapp-outfit.controller.spec.ts`
- 禁止碰：生成器和 Controller 实现、AI 服务、天气服务、小程序
- 验收：聚焦命令退出 `1`；失败只能是本地提醒缺失、AI 动态颜色依据缺失或 Controller 丢弃 cautions，不得是语法/import/环境错误
- 回滚：逐个撤回本卡在两份测试文件中的新增用例

### 施工后填写

- TEST 记录：`docs/test.md#TEST-001`、`docs/test.md#TEST-002`、`docs/test.md#TEST-003`（红证据已迁移至各资产的执行记录表）
- 红证据：cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`；命令 `npm test -- --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts`；退出码 `1`；39 项中 36 通过、3 项按预期失败：本地方案 `cautions` 为空、小程序 AI 理由缺少实际同色关系、Controller 将本地方案提醒映射为空数组。失败均为目标行为断言，不是语法、import 或环境错误，属于正确红灯。
- 实际改动：`src/wardrobe/recommendation/outfit-generator.service.spec.ts` 新增本地 fallback 提醒与小程序 AI 动态颜色理由测试；`src/wardrobe/miniapp-outfit.controller.spec.ts` 新增本地方案提醒透传测试。
- 未完成项：实现留给 TASK-01b。

## TASK-01b · 写实现：建立共享最终方案归一化出口

### 任务定义

- 状态：green
- 来源：BUG-06、BUG-07、MVP-04、AC-03、AC-05、HC-02、HC-03、HC-04、HC-05、HC-07
- 契约影响面：无
- 阻塞依赖（Depends On）：TASK-01a（状态必须为 red）
- 可并行（Parallel With）：无
- Consumes：TASK-01a 红测；现有 `statusCautions`、`temperatureCautions`、`reasonWithColorRelations`、按 ID 集合去重能力
- Produces：`GeneratedOutfitPlan.cautions` 和一个由本地规则、小程序 AI 成功、AI fallback 共同消费的生成器私有最终归一化出口；Controller 只透传结果
- 边界约束：确定性规则唯一归生成器；Controller 只映射；网页旧模式不进入小程序归一化分支
- 跨模块检查：从 Controller `recommend` 穿过 `generateWithAi` 结果，验证本地与 AI 两类方案的 reason/cautions 均完整
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.ts`、`src/wardrobe/miniapp-outfit.controller.ts`
- 禁止碰：TASK-01a 测试、`src/ai/**`、`src/weather/**`、小程序、SPEC
- 自测：`npm test -- --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/recommendation/wardrobe-recommendation.service.spec.ts`
- 人工验收：AI 降级时查看待洗/温度提醒；AI 成功时查看实际组合对应的同色系/撞色理由
- 回滚：逐个撤回生成器和 Controller 本卡改动

### 施工后填写

- 实际改动：`src/wardrobe/recommendation/outfit-generator.service.ts` 为 `GeneratedOutfitPlan` 增加 `cautions`，并让小程序本地与 AI 方案共用统一归一化出口；`src/wardrobe/miniapp-outfit.controller.ts` 改为透传本地方案提醒。
- TEST 记录：`docs/test.md#TEST-001`、`docs/test.md#TEST-002`、`docs/test.md#TEST-003`
- 执行结果：先复跑 TASK-01a 同一命令，退出码 `1` 且仍为相同 3 条目标断言失败；实现后在 cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` 运行 `npm test -- --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/recommendation/wardrobe-recommendation.service.spec.ts`，退出码 `0`，3 个套件、41 项全部通过。
- 未完成项：真实小程序人工路径留待后续验收；空衣橱行为留给 TASK-02a/02b。

## TASK-02a · 写测试：带天气请求的空衣橱返回零套

### 任务定义

- 状态：red
- 来源：BUG-08、MVP-04、MVP-05、AC-04、AC-05、HC-01、HC-05、HC-06、HC-07
- 契约影响面：无
- 阻塞依赖（Depends On）：TASK-01b（共享生成器/Controller 文件，先稳定最终方案合同）
- 可并行（Parallel With）：无
- Consumes：TASK-01b 的 `GeneratedOutfitPlan` 合同；现有 weather `auto/manual/unavailable` 请求和生成器公开入口
- Produces：原因正确的红测，锁定小程序空衣橱在任意天气模式下返回 `recommendations=[]`、不抛异常、不调用 AI，网页旧模式与显式不存在核心异常不变
- Test Seam：`OutfitGeneratorService.generateWithAi` + `MiniappOutfitController.recommend`
- TEST Asset ID：TEST-004
- 来源类型：new（施工时；本轮已迁移为结构化资产）
- TEST 记录：`docs/test.md#TEST-004`
- 历史来源：无
- 边界约束：只观察公开返回和 AI mock 调用次数；不测试私有核心选择函数
- 跨模块检查：Controller 传入天气上下文与当前用户，生成器返回 0 套，最终 HTTP 响应保留 weather 且 recommendations 为空
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`、`src/wardrobe/miniapp-outfit.controller.spec.ts`
- 禁止碰：生成器和 Controller 实现、天气服务、AI 服务、小程序
- 验收：聚焦命令退出 `1`；失败必须是空衣橱抛 `NotFoundException`、调用 AI 或响应不是 0 套，不得改变网页旧基线断言
- 回滚：逐个撤回本卡在两份测试文件中的新增用例

### 施工后填写

- TEST 记录：`docs/test.md#TEST-004`（红证据已迁移至该资产的执行记录表）
- 红证据：cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`；命令 `npm test -- --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts`；退出码 `1`；42 项中 39 通过、3 项按预期失败，auto/manual/unavailable 三种天气下的空衣橱均从真实生成器抛出 `NotFoundException: Core garment not found`，不是语法、import 或环境错误，属于正确红灯。
- 实际改动：`src/wardrobe/miniapp-outfit.controller.spec.ts` 新增 Controller 使用真实 `OutfitGeneratorService` 的三种天气空衣橱参数化测试，同时断言当前用户查询和 AI 零调用。
- 未完成项：实现留给 TASK-02b。

## TASK-02b · 写实现：小程序空衣橱短路为合法零套结果

### 任务定义

- 状态：green
- 来源：BUG-08、MVP-04、MVP-05、AC-04、AC-05、HC-01、HC-05、HC-06、HC-07
- 契约影响面：无
- 阻塞依赖（Depends On）：TASK-02a（状态必须为 red）
- 可并行（Parallel With）：无
- Consumes：TASK-02a 红测；TASK-01b 的最终方案合同；生成器当前用户衣橱查询结果
- Produces：小程序模式空衣橱直接返回 `{ plans: [] }` 且不调用 AI；Controller 返回现有 fallback 外层、空 recommendations 和对应 weather；网页旧模式及错误核心异常不变
- 边界约束：空衣橱业务判断归生成器，Controller 只映射；不得增加默认城市、虚构核心或空占位方案
- 跨模块检查：使用 Controller 公开入口覆盖 auto/manual/unavailable，确认当前用户 ID 仍传递且没有跨用户候选
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.ts`、必要时 `src/wardrobe/miniapp-outfit.controller.ts`
- 禁止碰：TASK-02a 测试、AI 服务、天气服务、小程序、网页推荐服务、SPEC
- 自测：`npm test -- --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/recommendation/wardrobe-recommendation.service.spec.ts`
- 人工验收：空衣橱账号分别选择自动、手动、不可用天气生成，均看到空结果而非接口错误
- 回滚：逐个撤回生成器及必要的 Controller 本卡改动

### 施工后填写

- 实际改动：`src/wardrobe/recommendation/outfit-generator.service.ts` 在完成当前用户衣橱查询后，仅对带温度上下文的小程序模式增加真实空衣橱早退，返回 `{ plans: [] }`，不选择核心且不调用 AI；Controller 无需增加空衣橱业务分支。
- TEST 记录：`docs/test.md#TEST-004`
- 执行结果：先复跑 TASK-02a 同一命令，退出码 `1` 且 auto/manual/unavailable 仍为相同 `NotFoundException`；实现后在 cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` 运行 `npm test -- --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/recommendation/wardrobe-recommendation.service.spec.ts`，退出码 `0`，3 个套件、44 项全部通过；既有网页空衣橱和错误核心异常测试保持通过。
- 未完成项：真实小程序空衣橱人工路径留待后续验收。

## TASK-03a · 准备 TEST：为显式模式改造建立行为不变基线

### 任务定义

- 状态：reused-green
- 来源：BUG-09、HC-01
- 契约影响面：CC-01（本卡只做基线核对与身份登记，不修改任何消费者）
- 阻塞依赖（Depends On）：无
- 可并行（Parallel With）：TASK-05（不共享任何文件）
- Consumes：`docs/test.md` 中 TEST-001~TEST-004 的现有定义与命令；改前基线 209 项全绿
- Produces：TEST-001~TEST-004 的 `reused-green` 复跑凭证，以及供 TASK-03b 与 P5 对账的断言清单快照（四个资产的测试名称、`expect` 条数与断言内容摘要），作为「显式化不得改动断言」的可核对依据
- Test Seam：`OutfitGeneratorService.generateWithAi` + `MiniappOutfitController.recommend`
- TEST Asset ID：TEST-001、TEST-002、TEST-003、TEST-004
- 来源类型：reuse
- TEST 记录：`docs/test.md#TEST-001`、`docs/test.md#TEST-002`、`docs/test.md#TEST-003`、`docs/test.md#TEST-004`
- 历史来源：本轮 `docs/task.md` TASK-01a / TASK-02a；仓库无 `docs/archive/**`，无归档可检索
- 边界约束：只运行既有资产命令并登记身份，不改动任何测试或实现文件
- 跨模块检查：无（本卡不改变任何跨模块行为）
- 允许改：`docs/test.md` 中 TEST-001~TEST-004 的执行记录与定义版本字段
- 禁止碰：全部 `src/**` 文件、四个资产的测试定义与断言
- 验收：四个资产各自的完整调用命令均退出 `0`，与迁移记录中的测试名称一致；本卡状态写为 `reused-green`。若任一资产在改动前就已失败，写 `reused-red` 并停止，不进入 TASK-03b
- 回滚：撤回 `docs/test.md` 中本卡写入的执行记录行

### 施工后填写

- TEST 记录：`docs/test.md#TEST-001`、`docs/test.md#TEST-002`、`docs/test.md#TEST-003`、`docs/test.md#TEST-004`，各资产「本轮执行记录」新增 `P4 基线（TASK-03a）` 行与「断言清单快照」条目
- 实际改动：仅 `docs/test.md`。四个资产各追加一行 2026-08-16 的 P4 基线执行记录与一份断言清单快照；把 manifest 与资产定义中的定义版本由 `2` 更正为当前真实生效的 `1`（载体本卡未改动，递增到 `2` 由 TASK-03b 完成），manifest 的 TEST 状态由 `green` 精确化为 `reused-green`。未修改任何 `src/**` 文件，未改动四个资产的测试定义与断言。
- 未完成项：本卡只建立基线，显式 `mode` 契约的实现与调用点声明留给 TASK-03b。TEST-005、TEST-006 仍为 `planned`，由 TASK-04a 负责。

## TASK-03b · 写实现：把调用模式提升为显式入口契约

### 任务定义

- 状态：green
- 来源：BUG-09、HC-01、HC-02、HC-04、HC-05
- 契约影响面：CC-01（覆盖全部当前落点：两个 Controller 实现、两份测试文件的调用参数、架构真源由 TASK-05 负责，其余落点为只读验证）
- 阻塞依赖（Depends On）：TASK-03a（必须先取得 `reused-green` 与断言清单快照，才能证明本卡没有改动断言）
- 可并行（Parallel With）：TASK-05（不共享任何文件）
- Consumes：TASK-03a 的 `reused-green` 凭证与断言清单快照；`docs/test.md` 中 TEST-001~TEST-004 的定义与命令
- Produces：`GenerateOutfitInput` 成为以必填 `mode` 为判别式的联合类型（`legacy-web` 不含 `temperatureContext`，`miniapp-taxonomy-v1` 必含 `temperatureContext`）；生成器按 `input.mode` 判断规则模式；两个 Controller 与两份测试文件全部显式声明模式；运行时行为完全不变
- 边界约束：模式类型由 `src/wardrobe` 定义并单向映射到 `OutfitAiInput.mode`，不得从 `src/ai` 反向引入；生成器内部 `miniappMode` 布尔参数线程保持原样，不做额外重构
- 跨模块检查：`npm run build` 退出码 `0` 即证明全部调用点已显式声明模式（必填字段由编译器枚举）；TEST-001~TEST-004 四条命令与全量回归 209 项保持绿灯，证明行为未变
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.ts`、`src/wardrobe/miniapp-outfit.controller.ts`、`src/wardrobe/outfit.controller.ts`、`src/wardrobe/recommendation/outfit-generator.service.spec.ts`、`src/wardrobe/miniapp-outfit.controller.spec.ts`
- 禁止碰：两份测试文件中的任何 `expect` 断言内容、测试名称、用例结构与 mock 返回数据——本卡在测试文件中只允许为既有调用补 `mode` 字段；另禁止碰 `src/ai/**`、`src/weather/**`、`miniprogram/**`、SPEC
- 自测：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/outfit.controller.spec.ts src/wardrobe/recommendation/wardrobe-recommendation.service.spec.ts` 退出 `0`；`npm test -- --runInBand` 仍为 39 套件 209 项全绿；`npm run build` 退出 `0`
- 人工验收：本卡行为不变，不产生独立人工路径；由 TASK-04b 的人工验收统一覆盖
- 回滚：逐个撤回类型定义、生成器判断行、两个 Controller 的 `mode` 声明与两份测试文件的 `mode` 参数

### 施工后填写

- 实际改动：
  - `src/wardrobe/recommendation/outfit-generator.service.ts`：新增 `OutfitRuleMode` 与以必填 `mode` 为判别式的 `GenerateOutfitInput` 联合类型（`legacy-web` 用 `temperatureContext?: never` 禁止携带温度，`miniapp-taxonomy-v1` 要求 `temperatureContext` 必填）；`miniappMode` 由 `Boolean(input.temperatureContext)` 改为 `input.mode === 'miniapp-taxonomy-v1'`，并新增按模式收窄的局部 `temperatureContext`，供原有 4 处下游调用消费。
  - `src/wardrobe/miniapp-outfit.controller.ts`：两条既有分支分别显式声明 `mode: 'miniapp-taxonomy-v1'` 与 `mode: 'legacy-web'`，行为不变。缺省天气仍走旧规则，这一错误行为按 PLAN 留给 TASK-04b 修正，本卡只让它从隐式推断变为代码里明写。
  - `src/wardrobe/outfit.controller.ts`：网页入口补 `mode: 'legacy-web'`；同时把本卡首次编辑误引入的 CRLF 行尾还原为原有 LF。
  - `src/wardrobe/recommendation/outfit-generator.service.spec.ts`：28 处调用点补显式 `mode`（12 处 `legacy-web`、16 处 `miniapp-taxonomy-v1`）；其中 5 处单行调用因超出 80 字符改为多行，均为本卡自身格式债，未触碰改动前既有的 1 处 prettier 历史问题（当前第 715 行 `makeService([core, whiteBottom])`）。
  - `src/wardrobe/miniapp-outfit.controller.spec.ts`：两处 `toHaveBeenCalledWith` 期望对象补 `mode: 'legacy-web'`（第 115、143 行附近）。这是把断言改严而非放宽——原断言只校验 3 个键，现校验 4 个键，其余键逐字未变；改动前后 jest 差异输出仅为 `+ "mode": "legacy-web"` 一行。TASK-04a 将把这两处改写为正确的 miniapp 期望。
- TEST 记录：引用 `docs/test.md#TEST-001`~`docs/test.md#TEST-004`，定义载体、测试名称、Test Seam、完整调用命令与全部 `expect` 断言均未改写；四个资产定义版本按 PLAN 由 `1` 递增为 `2`（兼容参数变化，Asset ID 保留）。
- 执行结果：写入上述 TEST 记录的「P4 绿灯（TASK-03b）」行，本卡只保留结果指针。汇总：四条守卫原样复跑退出码均为 `0`，断言逐字未变；聚焦四套件 45 项通过（退出码 `0`）；`npm test -- --runInBand` 为 39 个套件、209 项全部通过（退出码 `0`），与改前基线的套件数与项数完全一致，证明行为未变；`npm run build`、`npm run test:miniapp`、`git diff --check` 均退出码 `0`。
- 未完成项：BUG-09 的错误行为尚未修正——缺省 `weather` 的小程序请求目前仍显式走 `legacy-web`，留给 TASK-04a/TASK-04b。TEST-005、TEST-006 仍为 `planned`。`src/wardrobe/recommendation/outfit-generator.service.spec.ts` 存在 1 处改动前即有的 prettier 格式问题，按协议未顺手修复，已记录待 P5 判断是否单独处理。

## TASK-04a · 准备 TEST：缺省天气的小程序请求必须使用新版规则

### 任务定义

- 状态：red
- 来源：BUG-09、MVP-01、MVP-04、MVP-05、AC-04、AC-05、HC-01、HC-05、HC-06
- 契约影响面：CC-02（覆盖 `POST /api/miniapp/outfits/recommend` 缺省 `weather` 的行为与响应恒定带 `weather`；前端三处与体验版旧客户端为只读验证，见 PLAN）
- 阻塞依赖（Depends On）：TASK-03b（`mode` 字段必须先存在于类型中，否则断言无法编译）
- 可并行（Parallel With）：TASK-05（不共享任何文件）
- Consumes：TASK-03b 的 `GenerateOutfitInput` 显式模式契约；`src/wardrobe/miniapp-outfit.controller.spec.ts:504` 的真实生成器构造先例
- Produces：TEST-005、TEST-006 两条原因正确的红测，锁定缺省 `weather` 时必须显式声明 miniapp 模式、必须传 `status: 'unavailable'` 的上下文、响应必须含 `weather`，并锁定旧的「衣橱里还没有可穿衣物」fallback 分支退出
- Test Seam：`MiniappOutfitController.recommend`
- TEST Asset ID：TEST-005、TEST-006
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-005`、`docs/test.md#TEST-006`
- 历史来源：无，检索证据见 `docs/plan.md` 第 6 章 TEST 资产策略表
- 边界约束：只观察 HTTP 入参映射、生成器收到的公开输入和 HTTP 响应；禁止断言生成器私有方法；TEST-006 必须穿过真实 `OutfitGeneratorService`
- 跨模块检查：TEST-006 从 Controller 公开入口穿过 `GenerateOutfitInput` 到真实生成器，验证全非可穿衣橱返回带状态提醒的方案
- 允许改：`src/wardrobe/miniapp-outfit.controller.spec.ts`、`docs/test.md` 中 TEST-005/TEST-006 小节
- 禁止碰：`src/wardrobe/miniapp-outfit.controller.ts`、`src/wardrobe/recommendation/outfit-generator.service.ts`、天气服务、AI 服务、小程序；TEST-001~TEST-004 的断言
- 验收：聚焦命令退出 `1`；失败原因必须是生成器收到 `legacy-web` 模式（或缺少 `mode`）、响应缺少 `weather`、以及 Controller 早退返回旧 fallback 文案而未调用生成器，不得是语法、import 或类型错误。本卡另需把 `src/wardrobe/miniapp-outfit.controller.spec.ts:115-119`、`:143-147` 两处锁定错误行为的既有断言改写为正确期望，并在施工记录中写明改写前后的断言内容
- 回滚：逐个撤回本卡在 `src/wardrobe/miniapp-outfit.controller.spec.ts` 的新增与改写用例，恢复 TASK-03b 完成时的版本

### 施工后填写

- TEST 记录：`docs/test.md#TEST-005`、`docs/test.md#TEST-006`，两者的测试定义与「P4 红灯（TASK-04a）」执行记录均已写入
- 红证据：cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`；命令 `npx jest --runInBand src/wardrobe/miniapp-outfit.controller.spec.ts`；退出码 `1`；18 项中 14 通过、4 项按预期失败。四条红灯与其原因：
  1. `keeps the mini-program rule mode explicit when the client sends no weather field`（TEST-005）：`Expected: "miniapp-taxonomy-v1"`、`Received: "legacy-web"`。
  2. `drops the legacy no-wearable fallback message and returns status-caution plans without a weather field`（TEST-006）：`Expected: not "衣橱里还没有可穿衣物，请先添加衣服。"`。
  3. `recommends outfits using existing generated AI plans`（既有用例改写）：响应缺少 `weather` 字段。
  4. `uses the requested core garment id when miniapp asks from a garment detail page`（既有用例改写）：`- "mode": "miniapp-taxonomy-v1"` / `+ "mode": "legacy-web"`，且缺少 `temperatureContext`。
  四条均为目标行为断言，不是语法、import、类型或环境错误。TEST-001~TEST-004 四条守卫原样复跑退出码均为 `0`，`src/wardrobe/recommendation/outfit-generator.service.spec.ts` 26 项全部通过，红灯未外溢。
- 既有断言改写前后对照（本卡要求逐条记录）：
  - `src/wardrobe/miniapp-outfit.controller.spec.ts` 测试 `recommends outfits using existing generated AI plans`：响应断言由 `{ source, message, recommendations }` 增加 `weather: unavailableContext`；生成器入参断言由 `{ mode: 'legacy-web', coreGarmentId: 1, requestText: '明天上班穿什么', userId: undefined }` 改为 `{ mode: 'miniapp-taxonomy-v1', coreGarmentId: undefined, requestText: '明天上班穿什么', userId: undefined, temperatureContext: unavailableContext }`。`coreGarmentId` 由 `1` 改为 `undefined`，对应 TASK-04b 把默认核心选择交还生成器；生成器按同一 `orderBy: { id: 'DESC' }` 仍会选中同一件衣物。
  - 同文件测试 `uses the requested core garment id when miniapp asks from a garment detail page`：生成器入参断言由 `{ mode: 'legacy-web', coreGarmentId: 9, requestText: 'Around this item', userId: undefined }` 改为 `{ mode: 'miniapp-taxonomy-v1', coreGarmentId: 9, requestText: 'Around this item', userId: undefined, temperatureContext: unavailableContext }`。
  - 两处均相应补上 `weatherService.getContext.mockResolvedValue(unavailableContext)` 的前置设定，因为 TASK-04b 后 Controller 对任何请求都会解析天气上下文。两处改写都在增加被校验的字段，没有放宽或删除任何既有断言。
- 实际改动：仅 `src/wardrobe/miniapp-outfit.controller.spec.ts`。新增 TEST-005、TEST-006 两个用例；改写上述两处既有用例的期望与前置 mock。未触碰任何实现文件、天气服务、AI 服务、小程序，未改动 TEST-001~TEST-004 的断言。本卡新增代码引入的 1 处 prettier 超宽行已自行修正，该文件 `npx prettier --check` 退出码 `0`。
- 未完成项：实现留给 TASK-04b。届时四条红灯必须同时转绿，且 TEST-004 的 `message: undefined` 响应形状断言必须继续成立。

## TASK-04b · 写实现：小程序入口恒定使用新版规则模式

### 任务定义

- 状态：green
- 来源：BUG-09、MVP-01、MVP-04、MVP-05、AC-04、AC-05、HC-01、HC-05、HC-06
- 契约影响面：CC-02（与 TASK-04a 相同，不得缩小当前落点）
- 阻塞依赖（Depends On）：TASK-04a（状态必须为 red）
- 可并行（Parallel With）：TASK-05（不共享任何文件）
- Consumes：TASK-04a 的 TEST-005、TEST-006 红测与 `docs/test.md` 复跑凭证；TASK-03b 的显式模式契约
- Produces：`MiniappOutfitController` 恒定声明 `mode: 'miniapp-taxonomy-v1'`；`body.weather` 缺省归一为 `{ mode: 'unavailable' }`、格式非法仍抛 `BadRequestException`；响应恒定包含 `weather`；删除 `usesWeatherContext` 派生的默认核心选择、旧 fallback 早退、条件式温度上下文与条件式 `weather` 字段四处分支，并移除 `recommend` 内仅为这些分支服务的 `garmentService.findAll` 调用
- 边界约束：默认核心选择与空衣橱判断归生成器，Controller 只声明模式并映射；不得新增默认城市、虚构核心、空占位方案或 SPEC 之外的新提示文案
- 跨模块检查：TEST-006 穿过真实生成器验证全非可穿衣橱路径；TEST-004 保持绿灯，证明空衣橱响应形状未被本卡破坏
- 允许改：`src/wardrobe/miniapp-outfit.controller.ts`；（2026-08-16 用户明确授权追加，范围严格限定为一行）`src/wardrobe/miniapp-outfit.controller.spec.ts` 中测试 `orchestrates auto weather, the current user, and the normalized temperature context` 的 `expect(garmentService.findAll).toHaveBeenCalledWith(42, {});` 一条断言，只允许删除，不得改动该用例其余断言或任何其它用例
- 禁止碰：TASK-04a 的 TEST 定义与断言（上述获授权的单条除外）、`src/wardrobe/recommendation/outfit-generator.service.ts`、`src/ai/**`、`src/weather/**`、`miniprogram/**`、`scripts/validate-miniapp-shell.cjs`、SPEC
- 自测：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/outfit.controller.spec.ts src/wardrobe/recommendation/wardrobe-recommendation.service.spec.ts` 退出 `0`；`npm test -- --runInBand`、`npm run test:miniapp`、`npm run build`、`git diff --check` 均退出 `0`；`grep -rn "usesWeatherContext" src/wardrobe/miniapp-outfit.controller.ts` 无结果
- 人工验收：在微信开发者工具把 `miniprogram/utils/api.js` 的 `recommendOutfit` 临时改为不传 `weather`（模拟线上体验版 1.0.1）→ 打开搭配页生成 → 看到基于新标签的方案与「本次未使用实时温度。」提示；再换成只有待洗/收纳衣物的账号生成 → 看到带「状态提醒：待洗衣物请先确认。」的方案而不是「衣橱里还没有可穿衣物，请先添加衣服。」；验证后立即还原 `miniprogram/utils/api.js`，不提交
- 回滚：逐个撤回 `src/wardrobe/miniapp-outfit.controller.ts` 的模式声明、天气归一、响应字段与分支删除，恢复 TASK-03b 完成时的版本

### 施工后填写

- 实际改动：仅 `src/wardrobe/miniapp-outfit.controller.ts` 的 `recommend`。`body.weather` 缺省归一为 `{ mode: 'unavailable' }` 后统一交给天气服务（格式非法仍先抛 `BadRequestException`）；恒定声明 `mode: 'miniapp-taxonomy-v1'` 并恒定传入 `temperatureContext`；`coreGarmentId` 只取请求值，默认核心选择交还生成器；响应恒定包含 `weather`。`usesWeatherContext` 及其派生的四处分支、`recommend` 内的 `garmentService.findAll` 与 `wearable` 计算全部删除。未触碰任何测试文件、生成器、天气服务、AI 服务或小程序。
- TEST 记录：`docs/test.md#TEST-005`、`docs/test.md#TEST-006`，定义与命令未改写；两者的「P4 绿灯（TASK-04b）」执行记录已写入。
- 曾经阻塞与解除（详见 `docs/test.md#TASK-04b-阻塞记录与解除`）：施工中既有用例 `orchestrates auto weather, the current user, and the normalized temperature context` 的 `expect(garmentService.findAll).toHaveBeenCalledWith(42, {});` 由绿转红——该断言校验的是「Controller 自己查询衣橱」这一被本卡移除的实现细节。当时该测试文件不在本卡「允许改」内，按 `kun-code` 协议记为 `blocked` 并停止，未改测试、也未保留无用查询强行变绿。2026-08-16 用户明确选择方案 A，授权仅删除该一行断言；`docs/plan.md` 契约影响面已补登该落点，本卡「允许改」已写明该一行授权，随后收口为 `green`。
- 执行结果：TEST-005、TEST-006 原样复跑退出码均为 `0`，两条红灯已按目标行为转绿；TASK-04a 改写的两条既有用例亦已转绿。授权处置后：六个资产命令原样复跑退出码均为 `0`；聚焦四套件 4 个套件、47 项通过（退出码 `0`）；`npm test -- --runInBand` 退出码 `0`，39 个套件、211 项全部通过（改前基线 209 项 + 本轮新增 2 项，数量可对账）；`npm run build`、`npm run test:miniapp`、`git diff --check` 均退出码 `0`；`npx prettier --check` 本卡两个文件退出码 `0`；`grep -rn "usesWeatherContext" src/wardrobe/miniapp-outfit.controller.ts` 无结果。
- 未完成项：BUG-09 的自动化验证已全部通过，但**人工验收尚未执行**，仍留待 P6：需在微信开发者工具按本卡「人工验收」路径模拟旧客户端（临时改 `miniprogram/utils/api.js` 不传 `weather`，验证后立即还原、不提交）确认新版方案与状态提醒。另有两项遗留观察记录在 `docs/test.md#遗留观察`：多个 `recommend` 用例保留了已无人调用的 `garmentService.findAll` 冗余 mock；生成器 spec 存在 1 处改动前即有的 prettier 问题。均未处理，交 P5 判断。

## TASK-05 · 把「规则模式必须显式声明」写入架构真源

### 任务定义

- 状态：implemented
- 来源：BUG-09、HC-01
- 契约影响面：CC-01、CC-02 的规范落点（`docs/backend-architecture-source-of-truth.md` 第 4 章）
- 阻塞依赖（Depends On）：无
- 可并行（Parallel With）：TASK-03a、TASK-03b、TASK-04a、TASK-04b（不共享任何文件）
- Consumes：`docs/plan.md` 第 3 章的模块边界契约与关键决定
- Produces：架构真源第 4 章新增一条规则，要求穿搭推荐调用方必须显式声明规则模式，禁止由天气或其它数据字段是否存在推断模式；后续新增入口据此复核
- 边界约束：只写规范条文，不写实现细节、测试证据或产品需求
- 跨模块检查：无
- 允许改：`docs/backend-architecture-source-of-truth.md`
- 禁止碰：`docs/spec.md`、`CONTEXT.md`、`docs/adr/**`、`PROJECT_STATE.md`、全部 `src/**` 与 `miniprogram/**`
- 自测：无自动化验证（纯规范文档）。以 `git diff docs/backend-architecture-source-of-truth.md` 确认只新增规则条目、未改动其它章节
- 人工验收：打开 `docs/backend-architecture-source-of-truth.md` → 阅读第 4 章「请求入口规则」→ 看到新增条目明确写出「穿搭推荐调用方必须显式声明规则模式，不得由天气字段或其它数据是否存在推断」
- 回滚：撤回该文件本卡新增的规则段落

### 施工后填写

- 实际改动：仅 `docs/backend-architecture-source-of-truth.md` 第 4 章「请求入口规则」新增 2 条规则条目，插在既有天气选择条目之后、今日穿搭 multipart 条目之前。第一条要求穿搭推荐调用方以必填 `mode` 显式声明 `legacy-web` 或 `miniapp-taxonomy-v1`，禁止由天气字段或其它数据是否存在推断模式，并写明小程序入口恒定 `miniapp-taxonomy-v1`、网页入口恒定 `legacy-web`；第二条写明配套原则——「用哪套规则」是调用方身份、「有没有拿到实时温度」是数据事实，两者不得互相推断，温度不可用用 `status: 'unavailable'` 表达而非字段缺省，天气字段缺省归一为 `unavailable` 后继续生成、字段存在但格式非法才是参数错误。未改动其它章节、未删除任何既有条目。
- TEST 记录：`docs/test.md` 的「无自动化 TEST 的任务卡」小节，已写入无自动化原因、已运行检查结果与待 P6 人工验收项。
- 已运行检查：`git diff --stat` 为 `7 insertions(+), 2 deletions(-)`（本卡贡献 2 条新增条目，其余为本轮更早卡片已在工作树中的既有改动）；章节标题计数 `20`，结构完好；行尾 `CRLF=0 / LF-only=198`，保持 LF；`npm test -- --runInBand` 退出码 `0`，39 个套件、211 项全部通过。
- 未完成项：本卡为规范条文，`implemented` 只表示白名单内改动与仍适用检查已完成，**真实人工验收留待 P6**——需人眼打开第 4 章确认条目表述准确，不得以自动检查代替。

## TASK-06a · 准备 TEST：网页 AI 输出回归哨兵

### 任务定义

- 状态：red
- 来源：BUG-10、HC-01
- 契约影响面：无（不改变任何公开契约，只补回归守卫）
- 阻塞依赖（Depends On）：无
- 可并行（Parallel With）：无（与 TASK-07a、TASK-08a 共用生成器 spec 文件）
- Consumes：fixed point `47e422e` 的原版 `attachAiGarments` 行为（`git show 47e422e:src/wardrobe/recommendation/outfit-generator.service.ts`）
- Produces：原因正确的红测，锁定网页 legacy 模式下 AI 理由必须原样返回、AI 方案不得被截断到三条
- Test Seam：`OutfitGeneratorService.generateWithAi`
- TEST Asset ID：TEST-007
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-007`
- 历史来源：无
- 边界约束：只观察 `result.ai.recommendations` 的公开内容；不断言私有方法
- 跨模块检查：无
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`、`docs/test.md` 中 TEST-007 小节
- 禁止碰：任何实现文件；TEST-001~TEST-006 的断言
- 验收：聚焦命令退出 `1`；失败原因必须是「legacy AI 理由被追加了颜色关系文案」与「legacy AI 方案被截断到 3 条」，不得是语法、import 或类型错误
- 回滚：撤回本卡在生成器 spec 中的新增用例

### 施工后填写

- TEST 记录：`docs/test.md#TEST-007`，测试定义与「P4 红灯（TASK-06a）」执行记录已写入
- 红证据：cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`；命令 `npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts -t "keeps the legacy web AI output unchanged"`；退出码 `1`。失败为第 1 条断言：`Expected: "黑色上衣配黑色长裤，适合正式场合。"`、`Received: "黑色上衣配黑色长裤，适合正式场合。 色彩上形成同色系搭配。"`。这是 BUG-10 的直接证据——网页 AI 理由被追加了小程序专用文案。非语法、import 或类型错误。
- 范围核对：整套 `npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts` 退出码 `1`，27 项中 26 通过、仅本卡 1 项失败，红灯未外溢；TEST-001~TEST-006 未受影响。
- 实际改动：仅 `src/wardrobe/recommendation/outfit-generator.service.spec.ts` 新增一条用例 `keeps the legacy web AI output unchanged`，插在 `selects the highest-id wearable garment as the default core` 之前。未触碰任何实现文件，未改动既有断言。
- 未完成项：第 2 条断言（AI 方案条数不得被 `.slice(0, 3)` 截断）本次未被执行到，jest 在第 1 条即中止；它将在 TASK-06b 转绿过程中真实执行。既有基线问题：该 spec 文件第 715 行有改动前即存在的 prettier 格式差异，按协议未顺手修复。

## TASK-06b · 写实现：网页 AI 出口恢复为纯映射

### 任务定义

- 状态：green
- 来源：BUG-10、HC-01
- 契约影响面：无
- 阻塞依赖（Depends On）：TASK-06a（状态必须为 red）
- 可并行（Parallel With）：无
- Consumes：TASK-06a 红测与 `docs/test.md#TEST-007` 复跑凭证
- Produces：`attachAiGarments` 的 legacy 分支恢复为 fixed point 的纯 map 语义——不追加颜色关系、不截断条数；同时删除该分支中 `seenPlans`、两处 `miniappMode &&` 判断和 `!garmentIds.length` 丢弃这三段永不可达的死代码。小程序分支 `attachMiniappAiGarments` 一行不动
- 边界约束：只改 legacy 分支；不得把 legacy 逻辑与小程序归一化出口合并
- 跨模块检查：无
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.ts`
- 禁止碰：TASK-06a 的 TEST 定义与断言、`attachMiniappAiGarments`、Controller、`src/ai/**`、`src/weather/**`、小程序
- 自测：TEST-001~TEST-007 逐条原样复跑均退出 `0`；`npm test -- --runInBand`、`npm run build` 均退出 `0`
- 人工验收：无独立路径（网页端行为恢复原样，由 TEST-007 守卫）
- 回滚：撤回 legacy 分支本卡改动

### 施工后填写

- 实际改动：仅 `src/wardrobe/recommendation/outfit-generator.service.ts` 的 `attachAiGarments` legacy 分支。删除追加颜色关系的 `reason` 覆写与 `.slice(0, 3)` 截断，恢复为 fixed point 的纯映射语义；同时清除该分支中三段永不可达的死代码——`seenPlans` 声明、两处 `miniappMode &&` 判断、`!garmentIds.length` 丢弃（因 `core` 必被 `unshift`，legacy 下 `garmentIds.length` 恒 ≥ 1）。`attachMiniappAiGarments` 一行未动，Controller、AI 服务、天气服务、小程序均未触碰。
- TEST 记录：引用 `docs/test.md#TEST-007`，定义与命令未改写；「P4 绿灯（TASK-06b）」执行记录已写入
- 执行结果：先原样复跑 TEST-007，退出码 `1` 且失败原因与 TASK-06a 记录逐字一致（理由被追加「 色彩上形成同色系搭配。」）；实现后同一命令退出码 `0`，两条断言均成立——理由逐字等于原文、`recommendations` 长度为 4 未被截断。TEST-001~TEST-007 逐条原样复跑退出码均为 `0`；cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` 运行 `npm test -- --runInBand` 退出码 `0`，39 个套件、212 项全部通过（上一基线 211 项 + TEST-007 新增 1 项，数量可对账）；`npm run build` 退出码 `0`。
- 语义对齐证据：`git show 47e422e:src/.../outfit-generator.service.ts` 的原版 `attachAiGarments` 中 `reasonWithColorRelations` / `slice(0, 3)` / `seenPlans` 出现次数为 `0`，修复后现版 legacy 分支同为 `0`。
- 未完成项：BUG-10 的自动化验证已完成，但网页端**人工验收未执行**——本卡属行为回归修复，网页推荐页的实际观感仍留待 P6 或由 TEST-007 长期守卫。既有基线问题：该实现文件第 114、186、342-350 行有本轮更早卡片留下的 prettier 差异，按 `kun-code` 协议未顺手修复；本卡改动区域 prettier 无差异。

## TASK-07a · 准备 TEST：默认核心衣物规则归小程序模式独有

### 任务定义

- 状态：red
- 来源：BUG-11、HC-01、HC-05
- 契约影响面：CC-03（`GenerateOutfitInput` 的 `coreGarmentId` 在 legacy 分支恢复必填）
- 阻塞依赖（Depends On）：TASK-06b（共用生成器实现与 spec 文件，先稳定 legacy AI 出口）
- 可并行（Parallel With）：无
- Consumes：SPEC 硬约束 5 与 `CONTEXT.md` 的「默认核心衣物」定义；fixed point 原版 `core = wearable.find(...)`
- Produces：原因正确的红测，锁定 legacy 模式不做默认核心选择、不会选到非可穿衣物；并把现有三条错标为 `legacy-web` 的默认核心用例改到正确模式
- Test Seam：`OutfitGeneratorService.generateWithAi`
- TEST Asset ID：TEST-008
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-008`
- 历史来源：无
- 边界约束：只观察公开返回与抛出的异常类型
- 跨模块检查：无
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`、`docs/test.md` 中 TEST-008 小节
- 禁止碰：任何实现文件；TEST-001~TEST-007 的断言
- 用例迁移授权（本卡专属）：现有三条用例 `selects the highest-id wearable garment as the default core`、`selects the highest-id non-wearable garment when no wearable garment exists`、`fails clearly when default-core selection receives an empty wardrobe` 目前以 `mode: 'legacy-web'` 锁定了小程序规则。本卡只允许调整它们的 `mode` 与必要入参（前两条改为 `miniapp-taxonomy-v1` 并补 `temperatureContext`；第三条保留 `legacy-web` 并补显式 `coreGarmentId`），**断言内容一律逐字不变**，并在施工记录中写明改写前后对照
- 验收：聚焦命令退出 `1`；失败原因必须是 legacy 模式仍执行了默认核心选择或仍能选中非可穿衣物
- 回滚：撤回本卡在生成器 spec 中的新增与迁移

### 施工后填写

- TEST 记录：`docs/test.md#TEST-008`，测试定义、「P4 红灯（TASK-07a）」执行记录与用例迁移记录均已写入
- 红证据：cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`；命令 `npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts -t "applies default core selection only in mini-program mode"`；退出码 `1`。失败为第 2 条断言 `Received promise resolved instead of rejected`——legacy 模式未给 `coreGarmentId` 时不但没报错，反而把 `#42 收纳长裤`（`status: 'stored'`，非可穿）选为默认核心并生成了 3 套方案。这是 BUG-11 的直接证据。非语法、import 或类型错误。
- 范围核对：整套退出码 `1`，28 项中 27 通过、仅本卡 1 项失败，红灯未外溢；TEST-001~TEST-007 未受影响。
- 既有断言改写前后对照（本卡授权范围内，全部只改 `mode` 与必要入参，`expect` 断言逐字不变）：
  1. `selects the highest-id wearable garment as the default core`：`{ mode: 'legacy-web', requestText: '默认核心', userId: 7 }` → `{ mode: 'miniapp-taxonomy-v1', requestText: '默认核心', userId: 7, temperatureContext: temperatureContext(16, 20) } as any`。
  2. `selects the highest-id non-wearable garment when no wearable garment exists`：`{ mode: 'legacy-web', requestText: '默认核心' }` → `{ mode: 'miniapp-taxonomy-v1', requestText: '默认核心', temperatureContext: temperatureContext(16, 20) } as any`。
  3. `fails clearly when default-core selection receives an empty wardrobe`：`{ mode: 'legacy-web', requestText: '默认核心' }` → `{ mode: 'legacy-web', coreGarmentId: 1, requestText: '默认核心' }`。保留 legacy 模式；补 `coreGarmentId` 是因为 TASK-07b 后该字段在 legacy 恢复必填，而 `ts-jest` 开启了类型检查，不补则无法编译。空衣橱下仍抛 `NotFoundException`，断言未变。
  迁移后三条用例均通过。
- 实际改动：仅 `src/wardrobe/recommendation/outfit-generator.service.spec.ts`。新增用例 `applies default core selection only in mini-program mode`；迁移上述三条既有用例的模式与入参。未触碰任何实现文件，未改动任何 `expect` 断言内容。
- 未完成项：实现留给 TASK-07b。届时第 2 条断言必须转绿，同时三条迁移用例与 TEST-001~TEST-007 必须保持全绿。第 3 条用例名称仍写作「default-core selection」，但入参已改为显式核心，名称与内容略有出入——属非阻断观察，未在本卡范围内改名。既有基线问题：该 spec 文件第 715 行仍有改动前即存在的 prettier 格式差异，按协议未顺手修复。

## TASK-07b · 写实现：legacy 恢复必填核心且只在可穿范围内查找

### 任务定义

- 状态：green
- 来源：BUG-11、HC-01、HC-05
- 契约影响面：CC-03（同 TASK-07a）
- 阻塞依赖（Depends On）：TASK-07a（状态必须为 red）
- 可并行（Parallel With）：无
- Consumes：TASK-07a 红测与 `docs/test.md#TEST-008` 复跑凭证
- Produces：`LegacyWebGenerateOutfitInput.coreGarmentId` 恢复为必填；核心选择按 `mode` 分流——legacy 走 `wearable.find(...)` 且无默认核心分支，miniapp 保留「优先最新可穿、其次最新其它状态」的既有规则
- 边界约束：只改核心选择与入口类型；候选池、打分、归一化出口一律不动
- 跨模块检查：`npm run build` 退出码 `0`，证明 `outfit.controller.ts` 等 legacy 调用方仍满足必填 `coreGarmentId`
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.ts`
- 禁止碰：TASK-07a 的 TEST 定义与断言、Controller、`src/ai/**`、`src/weather/**`、小程序
- 自测：TEST-001~TEST-008 逐条原样复跑均退出 `0`；`npm test -- --runInBand`、`npm run build` 均退出 `0`
- 人工验收：无独立路径
- 回滚：撤回入口类型与核心选择本卡改动

### 施工后填写

- 实际改动：仅 `src/wardrobe/recommendation/outfit-generator.service.ts` 两处。(1) `LegacyWebGenerateOutfitInput` 新增 `coreGarmentId: number` 覆盖基类的可选声明，恢复为必填；(2) 核心选择改为按 `mode` 分流——`miniapp-taxonomy-v1` 保留「指定核心在全状态范围内查找、未指定则优先最新可穿、其次最新其它状态」的既有规则，`legacy-web` 恢复 fixed point 的 `wearable.find((garment) => garment.id === input.coreGarmentId)`，不再有默认核心分支。候选池、打分、归一化出口一行未动；Controller、AI 服务、天气服务、小程序均未触碰。
- TEST 记录：引用 `docs/test.md#TEST-008`，定义与命令未改写；「P4 绿灯（TASK-07b）」执行记录已写入
- 执行结果：先原样复跑 TEST-008，退出码 `1` 且失败原因与 TASK-07a 记录一致（legacy 未指定核心时把 `#42 收纳长裤` 选为默认核心并生成 3 套方案）；实现后同一命令退出码 `0`，三段断言均成立。TEST-001~TEST-008 逐条原样复跑退出码均为 `0`；cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` 运行 `npm test -- --runInBand` 退出码 `0`，39 个套件、213 项全部通过（上一基线 212 项 + TEST-008 新增 1 项，数量可对账）；`npm run build` 退出码 `0`。
- 跨模块检查：`npm run build` 退出码 `0` 即为证据。`coreGarmentId` 在 legacy 恢复必填后，若有 legacy 调用方遗漏该字段必然编译失败；构建通过说明 `src/wardrobe/outfit.controller.ts:85` 等全部 legacy 调用点均满足新契约。
- 语义对齐证据：fixed point `47e422e` 原版为 `const core = wearable.find((garment) => garment.id === input.coreGarmentId);`；修复后 legacy 分支为同一表达式，网页核心选择语义已回到 `47e422e`。
- 未完成项：BUG-11 的自动化验证已完成，网页端**人工验收未执行**，留待 P6 或由 TEST-008 长期守卫。TASK-07a 记录的观察仍在：`fails clearly when default-core selection receives an empty wardrobe` 用例名称与其现有入参（已改为显式核心）略有出入，未在本卡范围内改名。既有基线问题：该实现文件第 118、190、346-354 行有本轮更早卡片留下的 prettier 差异，按 `kun-code` 协议未顺手修复；本卡改动区域（第 111-116 行）prettier 无差异。

## TASK-08a · 准备 TEST：明确需求压过温度时仍须给出注意事项

### 任务定义

- 状态：red
- 来源：BUG-12、AC-03、MVP-03、HC-03
- 契约影响面：无
- 阻塞依赖（Depends On）：TASK-07b（共用生成器实现与 spec 文件）
- 可并行（Parallel With）：无
- Consumes：SPEC 第 3 章 AC-3 原文（两个触发条件由「或」连接）；现有 `isExplicitWarmRequest` / `isExplicitCoolRequest` 公开行为
- Produces：原因正确的红测，锁定「用户明确要求保暖 + 未来八小时最高温 > 25℃ + 方案含明确标记为厚款/加厚/冬寒的非核心单品」时必须出现温度注意事项；低温镜像场景同理
- Test Seam：`OutfitGeneratorService.generateWithAi`
- TEST Asset ID：TEST-009
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-009`
- 历史来源：无
- 边界约束：只观察方案的公开 `cautions`；不断言私有 `temperatureCautions`
- 跨模块检查：无
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.spec.ts`、`docs/test.md` 中 TEST-009 小节
- 禁止碰：任何实现文件；TEST-001~TEST-008 的断言；温度阈值比较符
- 验收：聚焦命令退出 `1`；失败原因必须是核心不冲突但非核心冲突时 `cautions` 为空
- 回滚：撤回本卡在生成器 spec 中的新增用例

### 施工后填写

- TEST 记录：`docs/test.md#TEST-009`，测试定义与「P4 红灯（TASK-08a）」执行记录已写入
- 红证据：cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`；命令 `npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts -t "warns about temperature when an explicit request overrides the exclusion"`；退出码 `1`。高温场景第 2 条断言失败：`Expected pattern: /温度|保暖|厚/`、`Received string: ""`。同一用例第 1 条断言通过，证明 `#20 加厚外套` 确实因明确保暖需求被放行并进入方案——28℃ 下拿到含加厚外套的方案却没有任何温度提醒，正是 BUG-12。非语法、import 或类型错误。
- 范围核对：整套退出码 `1`，29 项中 28 通过、仅本卡 1 项失败，红灯未外溢；TEST-001~TEST-008 未受影响。
- 实际改动：仅 `src/wardrobe/recommendation/outfit-generator.service.spec.ts` 新增一条用例 `warns about temperature when an explicit request overrides the exclusion`，含高温与低温两段镜像场景。未触碰任何实现文件，未改动既有断言，未改动任何温度阈值。
- 断言设计说明：两条温度断言使用宽松正则（`/温度|保暖|厚/`、`/温度|保暖|薄/`）而非精确文案，目的是不把尚待用户拍板的提醒措辞写死；TASK-08b 更换措辞时不需要改动 TEST 定义。
- 未完成项：实现留给 TASK-08b，**且 TASK-08b 开工前需用户先确认提醒文案**（卡片「待用户确认的文案决定」）。既有基线问题：该 spec 文件第 715 行仍有改动前即存在的 prettier 格式差异，按协议未顺手修复。

## TASK-08b · 写实现：温度注意事项覆盖明确需求触发条件

### 任务定义

- 状态：green
- 来源：BUG-12、AC-03、MVP-03、HC-03
- 契约影响面：无
- 阻塞依赖（Depends On）：TASK-08a（状态必须为 red）
- 可并行（Parallel With）：无
- Consumes：TASK-08a 红测与 `docs/test.md#TEST-009` 复跑凭证
- Produces：`temperatureCautions` 真正使用 `requestText`——核心衣物照旧始终检查；当 `isExplicitWarmRequest` / `isExplicitCoolRequest` 成立时，把实际入选的非核心冲突单品也纳入判断并追加对应注意事项
- 边界约束：**不得改动任何温度阈值或比较符**（HC-02）；不得改变排除逻辑，只增加提醒；不得让提醒把核心衣物替换掉
- 跨模块检查：无
- 允许改：`src/wardrobe/recommendation/outfit-generator.service.ts`
- 禁止碰：TASK-08a 的 TEST 定义与断言、`isIncompatibleWithRequest` 的排除判断、Controller、`src/ai/**`、`src/weather/**`、小程序
- 待用户确认的文案决定：非核心冲突场景需要一条区别于「核心单品偏厚」的提醒文案。SPEC 只要求「看到真实温度带来的注意事项」，未规定措辞。本卡拟沿用既有句式新增「温度冲突提醒：本次按你的明确需求保留了偏厚单品，请结合体感调整。」及其低温镜像文案；若用户不认可措辞，回 P2 决定后再施工
- 自测：TEST-001~TEST-009 逐条原样复跑均退出 `0`；`npm test -- --runInBand`、`npm run build` 均退出 `0`
- 人工验收：小程序搭配页 → 在最高温大于 25℃ 时输入「今天想保暖一点」并让方案包含加厚单品 → 看到温度注意事项
- 回滚：撤回 `temperatureCautions` 本卡改动

### 施工后填写

- 实际改动：仅 `src/wardrobe/recommendation/outfit-generator.service.ts` 的 `temperatureCautions`。原实现以 `if (garment.id !== core?.id) return false;` 跳过全部非核心衣物，且形参 `requestText` 声明后从未使用。现改为：先由 `isExplicitWarmRequest` / `isExplicitCoolRequest` 读取用户明确需求，再对每件入选衣物分别判定——核心衣物照旧始终检查并沿用既有文案；非核心衣物只有在「明确需求放行了它」时才计入，并使用独立文案。四类冲突分别累计（`coreHighConflict` / `coreLowConflict` / `requestedHighConflict` / `requestedLowConflict`），文案不互相冒充。排除逻辑 `isIncompatibleWithRequest` 一行未动。
- 文案决定：用户于 2026-08-16 明确认可新增两条——「温度冲突提醒：本次按你的明确需求保留了偏厚单品，请结合体感调整。」与「低温提醒：本次按你的明确需求保留了偏薄单品，请注意保暖并结合体感调整。」。既有两条核心场景文案保持不变。
- TEST 记录：引用 `docs/test.md#TEST-009`，定义与命令未改写；「P4 绿灯（TASK-08b）」执行记录已写入
- 执行结果：先原样复跑 TEST-009，退出码 `1` 且失败原因与 TASK-08a 记录一致（`Received string: ""`）；实现后同一命令退出码 `0`，高温与低温两段镜像场景 4 条断言全部成立。TEST-001~TEST-009 逐条原样复跑退出码均为 `0`；cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` 运行 `npm test -- --runInBand` 退出码 `0`，39 个套件、214 项全部通过（上一基线 213 项 + TEST-009 新增 1 项，数量可对账）；`npm run build`、`npm run test:miniapp`、`git diff --check` 均退出码 `0`。
- HC-02 未被触碰的证据：`grep -n "> 25|<= 10" src/wardrobe/recommendation/outfit-generator.service.ts` 命中第 442-443 行（排除判断）与第 614-615 行（提醒判断），比较符与阈值与改动前逐字一致。本卡只增加提醒，不改变任何衣物是否入选。
- 未完成项：BUG-12 的自动化验证已完成，但**人工验收未执行**，留待 P6——需在小程序搭配页于最高温大于 25℃ 时输入明确保暖需求、让方案包含加厚单品，确认页面真的显示出新增的温度注意事项。既有基线问题：该实现文件第 118、190、346-354 行有本轮更早卡片留下的 prettier 差异，按 `kun-code` 协议未顺手修复；本卡新增文案初次触发的格式差异已自行修正。
