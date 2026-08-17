# 小程序穿搭出口与调用模式收敛 TASKS

- 上游：`docs/plan.md`（用户认可后方可施工）
- 功能点：11/10（**超出协议上限 1 个**，2026-08-17 补正三登记）

> 关于功能点超限：`kun-plan` 协议规定单份 PLAN 最多 10 个功能点。TASK-01~TASK-10 已占满，TASK-11 是第二轮 P5 双轴评审判定的**返修卡**（冻结集 B01 / BUG-16），不是新增产品范围——SPEC 一字未改，实现行为一字不改。拆成独立 PLAN 会把冻结集与本轮切开，导致 `CLOSURE-1` 无法在同一份上下文里定向关闭，反而违背协议意图。故在此显式登记超限与理由，不静默突破。头部原写「8/10」为 TASK-09、TASK-10 追加前的旧值，一并更正。

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

## TASK-09a · 准备 TEST：天气模块必须对齐腾讯真实响应契约

### 任务定义

- 状态：red
- 来源：BUG-13、BUG-15、AC-01、AC-04、MVP-01、HC-06
- 契约影响面：无（`OutfitTemperatureContext` 公开形状不变）
- 阻塞依赖（Depends On）：无
- 可并行（Parallel With）：无（与 TASK-10a 共用天气 spec 文件，按顺序施工）
- Consumes：`docs/plan.md#外部依赖实测契约`；2026-08-17 实测取得的四份腾讯真实响应；现有 `TencentWeatherService.getContext` 与注入点 `TENCENT_WEATHER_FETCH`
- Produces：仓库内的真实响应夹具，以及原因正确的红测——锁定 auto 模式下 `getContext` 必须返回 `status:'available'`、真实 `currentC`、恰好 8 条 `hourly`，且时间戳按东八区解析
- Test Seam：`TencentWeatherService.getContext`（经 `TENCENT_WEATHER_FETCH` 注入返回真实夹具的假 fetch）
- TEST Asset ID：TEST-010
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-010`
- 历史来源：无
- 边界约束：夹具必须是实测原文，只允许删除 `request_id` 并统一日期基准，**不得手写或改写任何字段名与层级**；只观察 `getContext` 的公开返回，不断言私有 `parseProviderPayload`、`normalizeHourly`、`normalizeTimestamp`
- 时区断言要求：本卡红灯**必须在 `TZ=UTC` 下复跑**。开发机为东八区，naive 的 `new Date("2026-08-17 10:00:00")` 在东八区恰好得到正确结果，只有强制 `TZ=UTC` 才能复现生产容器（`node:22-slim` 未设 `TZ`）的 8 小时偏移。断言写死期望的 ISO 时间戳
- 跨模块检查：无（Controller 与生成器不在本卡范围）
- 允许改：`src/weather/tencent-weather.service.spec.ts`、新增 `src/weather/__fixtures__/tencent-weather-responses.ts`、`docs/test.md` 中 TEST-010 小节
- 禁止碰：任何实现文件；TEST-001~TEST-009 的断言；`src/wardrobe/**`、`src/ai/**`、小程序
- 验收：聚焦命令 `TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts` 退出 `1`；失败原因必须是 auto 模式拿不到 available 上下文或时间戳偏移 8 小时，不得是语法、import 或环境错误
- 回滚：撤回本卡在天气 spec 中的新增用例与夹具文件

### 施工后填写

- TEST 记录：`docs/test.md#TEST-010`，测试定义、时间冻结说明与「P4 红灯（TASK-09a）」执行记录已写入
- 红证据：cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`；命令 `TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts`；退出码 `1`。失败断言为 spec 第 292 行 `expect(result.status).toBe('available')`，`Expected: "available"` / `Received: "unavailable"`。现有实现不传 `type`、把 `result.realtime` 当对象读、在不存在的 `result.hourly` 路径找逐小时，`parseProviderPayload` 返回 `undefined` 导致降级——与卡片预期的红灯原因逐条吻合。非语法、import 或环境错误，属原因正确的红灯。
- 范围核对：整套 8 项中 7 项通过、仅本卡 1 项失败，红灯未外溢；`git diff --stat -- src/weather/tencent-weather.service.ts src/wardrobe src/ai miniprogram` 输出为空，实现文件零改动。
- 实际改动：新增 `src/weather/__fixtures__/tencent-weather-responses.ts`（391 行，2026-08-17 实测原文，仅删除 `request_id`）；`src/weather/tencent-weather.service.spec.ts` 新增 `describe('对齐腾讯真实响应契约')` 及其中一条用例，并补两处夹具 import。未触碰任何实现文件，未改动既有用例的任何断言。
- 时间冻结设计说明：夹具时间是固定的历史时刻，若不冻结当前时间，「只保留未来时段」的过滤会随真实时间推移逐条丢弃夹具数据，测试次日即失效。故用 `jest.spyOn(Date, 'now')` 冻结在夹具首个时段（北京时间 2026-08-17 10:00:00），并在同 `describe` 的 `afterEach` 中 `restoreAllMocks()` 归还，不影响既有用例。
- 格式：`npx prettier --check` 对两份文件均通过；`git diff --check` 退出码 `0`。
- 未完成项：实现留给 TASK-09b，**但 TASK-09b 目前不可开工**——本 spec 中另有 3 条既有用例（坐标降精度、手动城市归一化城市、十五分钟缓存）基于编造的返回体断言 `status: 'available'`，解析层改为只认真实契约后必然转红，而 TASK-09b 的「允许改」不含本 spec 文件，届时无法在白名单内让整体回归转绿。详见 `docs/test.md#TEST-010` 的「遗留风险」，须先回 P3 补正卡片切分后再开工。

## TASK-09b · 写实现：天气请求与解析层按真实契约重写

### 任务定义

- 状态：green
- 来源：BUG-13、BUG-15、AC-01、AC-04、MVP-01、HC-06
- 契约影响面：无
- 阻塞依赖（Depends On）：TASK-09a（状态必须为 red）
- 可并行（Parallel With）：无
- Consumes：TASK-09a 红测与夹具；`docs/plan.md#外部依赖实测契约`
- Produces：`TencentWeatherService` 改为按真实契约取数——实时走 `type=now` 读 `result.realtime[0].infos.temperature`，逐小时走 `type=hours` 读 `result.forecast_hours[0].infos[].info.temperature`，时间取 `infos[].hour` 并**显式按 `+08:00`** 解析；同时把三条依赖编造返回体的既有用例改喂真实夹具，**保留其原有保护意图**
- 边界约束：
  - 两次请求必须**串行**，不得 `Promise.all` 并发（配额每秒上限极低，实测连发 6 次即 `status:120`）
  - **不得改动** `FUTURE_HOUR_TOLERANCE_MS` 的过滤语义与「取 8 条」的切片规则，本卡只修正取数与解析，不改业务窗口
  - **不得改动** 任何温度阈值（HC-02 由 `outfit-generator` 持有，本卡不碰该文件）
  - 缓存键与 `CACHE_TTL_MS` 语义保持不变；两次请求合成的结果作为一个整体缓存
  - 拿不到数据时仍走既有 `unavailable()` 降级，不得抛异常打断推荐（HC-06）
- 既有用例改写约束（2026-08-17 P3 补正，起因见 `docs/test.md#TEST-010` 遗留风险）：
  - 涉及且**仅**涉及这三条：`在外发和缓存前将自动坐标保留两位，并归一化当前及未来八小时温度`、`手动城市请求不需要暴露坐标，并返回供应商归一化城市`、`相同的降精度坐标在十五分钟缓存窗口内只请求一次`。它们转红的原因是**喂的数据是编造的**，不是断言错了。
  - 只允许把数据来源从 `successfulProviderPayload` 换成真实夹具，并按新的两次请求调整调用次数期望。**三项保护意图一条都不许削弱或删除**：① 原始精确坐标不得进入请求 URL、不得出现在返回中（SPEC 隐私约束 1）；② 手动模式不暴露坐标且城市名来自供应商；③ 同一降精度坐标在缓存窗口内不重复打供应商。
  - 允许删除 `successfulProviderPayload` 与 `futureHours` 这两个编造数据的构造器本身——它们是本轮缺陷的载体，留着会诱使后续实现去兼容一个不存在的契约。
  - `手动城市…` 一条在本卡只需喂真实夹具即可转绿，**不得**在本卡断言 geocoder 调用或 `city=` 参数缺席——那属于 TASK-10a 的范围，本卡提前写入会侵占下一张卡。
  - 严禁通过 `it.skip`、`it.todo`、注释掉或放宽断言让它们「通过」。
- 跨模块检查：`OutfitTemperatureContext` 的字段与含义一字不改，`outfit-generator` 与 Controller 无需改动，靠 TEST-001~TEST-009 原样复跑证明未回归
- 允许改：`src/weather/tencent-weather.service.ts`、`src/weather/tencent-weather.service.spec.ts`（仅限上述三条既有用例及其编造数据构造器）
- 禁止碰：TEST-010 的定义与断言（`describe('对齐腾讯真实响应契约')` 整段）、夹具文件 `src/weather/__fixtures__/**`、其余四条既有用例（缺少 Key、canonical 配置、超时降级、供应商错误状态）、`src/wardrobe/**`、`src/ai/**`、小程序、SPEC
- 自测：`TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts` 退出 `0`；`npm test -- --runInBand`、`npm run build` 均退出 `0`；TEST-001~TEST-009 逐条原样复跑退出 `0`
- 人工验收：留待 P6——小程序搭配页授权定位后，确认显示真实城市、当前温度和未来八小时趋势，且时段标签与手机时间对得上
- 回滚：撤回 `tencent-weather.service.ts` 本卡改动

### 施工后填写

- 实际改动：
  - `src/weather/tencent-weather.service.ts`：① 把单次取数拆为新私有方法 `fetchPayload(url)`（自带超时与中断，失败返回 `undefined` 不上抛），`getContext` 改为**串行**调用两次——先 `type=now` 再 `type=hours`；② `requestUrl` 增加 `type: 'now' | 'hours'` 形参并显式写入查询串；③ `parseProviderPayload` 改为接收两份 payload，按实测契约读 `result.realtime[0].infos.temperature` 与 `result.forecast_hours[0].infos[]`，城市按 `city → district → province → fallbackCity` 逐级回退（按 adcode 查询时 city/district 为空串）；④ `normalizeHourly` 改读 `infos[].info.temperature` 与 `infos[].hour`；⑤ `normalizeTimestamp` 重写为只接受 `"YYYY-MM-DD HH:mm[:ss]"` 并**显式补 `+08:00`** 后解析。
  - `src/weather/tencent-weather.service.spec.ts`：新增 `FIXTURE_NOW` / `freezeFixtureNow()` / `makeRealFetch()` 三个共用工具与一个 `afterEach(jest.restoreAllMocks)`；三条点名用例改喂真实夹具。
- 契约猜测兜底已移除：原实现在 `realtime|current|now`、`hourly|hourlyForecast|forecastHourly|forecast.hourly`、`timestamp|time|datetime|forecastTime`、`temperatureC|temperature|temp` 等多组候选字段名之间「猜」。这正是缺陷得以长期隐藏的机制——猜不中就静默降级，没有任何一处会报错。现改为只认夹具固定的单一路径，对不上即暴露为不可用并回到 P3。
- 三条既有用例的处置（对照卡片「既有用例改写约束」逐条核对）：
  - `在外发和缓存前将自动坐标保留两位…`：数据源换真实夹具，坐标改用夹具对应的北京坐标 `39.905023/116.724502`。**隐私保护未削弱**——仍断言请求 URL 只含 `39.91`/`116.72`、不含原始精度，且返回中不含原始坐标与密钥。
  - `手动城市请求不需要暴露坐标…`：数据源换真实夹具。**保护意图加强**——故意让用户输入（`' 上海 '`）与夹具供应商返回（`北京市`）不一致，从而真正证明城市名取自供应商而非回显用户输入；另新增一条 `not.toContain('location=')` 断言手动模式不携带坐标。按卡片约束，本卡**未**断言 geocoder 调用或 `city=` 参数缺席，该范围留给 TASK-10a。
  - `相同的降精度坐标在十五分钟缓存窗口内只请求一次`：数据源换真实夹具，调用次数期望由 `1` 改为 `2`（一次取数 = 实时 + 逐小时两次请求）。**缓存保护未削弱**——第二次 `getContext` 仍须完全命中缓存、不再打供应商，否则计数会是 4。
  - 未使用 `it.skip`、`it.todo`、注释或放宽断言；其余四条用例（缺少 Key、canonical 配置、超时降级、供应商错误状态）一字未动。
- 关于「允许删除 `successfulProviderPayload` / `futureHours`」：**未删除**。这两个构造器被「供应商返回错误状态或不足八个未来小时数据时返回 unavailable」一条消费，而该用例在本卡「禁止碰」之列，删除构造器会导致它编译失败，等同于触碰。保留后它们的语义反而正当了——它们现在扮演的是「供应商返回了我们不认识的结构」，正是该用例要验证的降级场景。此为保守取舍，不是遗漏。
- 时间冻结的必要性：真实夹具的时间是固定历史时刻，而实现保留了「只保留未来时段」的过滤（`FUTURE_HOUR_TOLERANCE_MS` 语义未改）。若不冻结 `Date.now()`，夹具数据会随真实时间推移逐条被滤掉，测试次日即失效。故三条用例与 TEST-010 均冻结在夹具首个时段（北京时间 `2026-08-17 10:00:00`），并由 `afterEach` 归还。
- TEST 记录：`docs/test.md#TEST-010`，「P4 绿灯（TASK-09b）」执行记录已写入；TEST 定义、测试名称与调用命令逐字未改。
- 执行结果：
  - 先原样复跑 TEST-010，退出码 `1`，失败断言与 TASK-09a 记录逐字一致（`Expected: "available"` / `Received: "unavailable"`），原因未漂移。
  - 实现后 `TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts` 退出码 `0`，8 项全部通过。
  - cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`：`npm test -- --runInBand` 退出码 `0`，39 个套件、**215 项**全部通过（上一基线 214 项 + TEST-010 新增 1 项，数量可对账）。
  - `TZ=UTC npx jest --runInBand` 退出码 `0`，同样 39 套件 215 项——**在生产容器时区下整体回归同样全绿**，证明本轮修复不依赖开发机时区。
  - TEST-001~TEST-009 承载套件原样复跑：`npx jest --runInBand src/wardrobe/recommendation/outfit-generator.service.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/outfit.controller.spec.ts src/wardrobe/recommendation/wardrobe-recommendation.service.spec.ts` 退出码 `0`，4 套件 50 项通过。
  - `npm run build`、`npm run test:miniapp`、`git diff --check` 均退出码 `0`；`npx prettier --check` 对两份改动文件报 `All matched files use Prettier code style!`。
- 未完成项：
  - **BUG-14 仍未修复**：手动城市仍在向天气接口发送腾讯不支持的 `city=` 参数，真实链路下会返回 `status:348`。本卡按约束未触碰该范围，留给 TASK-10a/10b。因此当前手动选城市在真机上**仍然拿不到温度**，不得对外描述为已修复。
  - **人工验收未执行**：BUG-13/BUG-15 的自动化验证已完成，但真机路径留待 P6——需在小程序搭配页授权定位后确认显示真实城市、当前温度与未来八小时趋势，且时段标签与手机时间一致（时区缺陷只在生产容器显现，本机测试无法替代）。
  - 既有基线问题：`src/wardrobe/recommendation/outfit-generator.service.ts` 第 118、190、346-354 行与其 spec 第 715 行仍有本轮更早卡片留下的 prettier 差异，按 `kun-code` 协议未顺手修复。

## TASK-10a · 准备 TEST：手动城市必须经地址解析取得 adcode

### 任务定义

- 状态：red
- 来源：BUG-14、AC-01、MVP-01、HC-06、SPEC 第 22 条
- 契约影响面：无（`WeatherRequestInput` 的 `manual` 形状不变）
- 阻塞依赖（Depends On）：TASK-09b（共用天气实现与 spec 文件，且解析层须先对齐）
- 可并行（Parallel With）：无
- Consumes：TASK-09b 的实现；实测 geocoder 响应 `result.ad_info.adcode`
- Produces：原因正确的红测——锁定 `manual` 模式必须先请求 `/ws/geocoder/v1/` 且携带 `address=<城市名>`，再以取回的 `adcode` 请求天气，最终返回 available 上下文；同时锁定**任何请求都不得再出现 `city=` 参数**
- Test Seam：`TencentWeatherService.getContext`（假 fetch 按 URL 分发 geocoder 与天气两份夹具，并记录调用顺序与 URL）
- TEST Asset ID：TEST-011
- 来源类型：new
- TEST 记录：`docs/test.md#TEST-011`
- 历史来源：无
- 边界约束：只断言公开返回与假 fetch 收到的 URL，不断言私有方法；geocoder 夹具同样取自实测原文
- 跨模块检查：无
- 允许改：`src/weather/tencent-weather.service.spec.ts`、`src/weather/__fixtures__/tencent-weather-responses.ts`、`docs/test.md` 中 TEST-011 小节
- 禁止碰：任何实现文件；TEST-001~TEST-010 的断言
- 验收：聚焦命令退出 `1`；失败原因必须是手动模式没有调用 geocoder 或仍在发送 `city=` 参数
- 回滚：撤回本卡在天气 spec 与夹具中的新增内容

### 施工后填写

- TEST 记录：`docs/test.md#TEST-011`，测试定义、用例数量说明、派生数据声明与「P4 红灯（TASK-10a）」执行记录已写入
- 红证据：cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`；命令 `TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts`；退出码 `1`。本资产 3 条全部失败：①「经 geocoder 解析」失败于 `Expected substring: "/ws/geocoder/v1/"`、`Received string: "https://weather.example.test/ws/weather/v1/?key=…&type=now&city=%E5%8C%97%E4%BA%AC%E5%B8%82"`——第一次请求直接打天气接口且携带腾讯不接受的 `city` 参数，正是 BUG-14；②③ 两条降级用例均为 `Expected: "unavailable"` / `Received: "available"`，因为实现根本不调用 geocoder。非语法、import 或环境错误，属原因正确的红灯。
- 范围核对：整套 11 项中 8 项通过、仅本卡 3 项失败，红灯未外溢；TEST-010 与其余既有用例不受影响。
- 实际改动：`src/weather/__fixtures__/tencent-weather-responses.ts` 追加两份实测 geocoder 响应（成功、地址解析不到）；`src/weather/tencent-weather.service.spec.ts` 新增 `describe('手动城市经地址解析换取 adcode')` 及其中三条用例、一个按 URL 路径分发夹具的 `makeRoutedFetch` 工具，并补三处夹具 import。**未触碰任何实现文件**——`git diff` 中 `tencent-weather.service.ts` 的改动全部来自 TASK-09b（工作树未提交，diff 累计显示）；红灯形态本身即为佐证，三条失败呈现的正是 09b 遗留的旧手动路径行为。
- 与卡片规划的两处差异（均已在 `docs/test.md#TEST-011` 留档）：
  - **用例数由 2 增至 3**。实测发现腾讯的两种失败形态走不同代码路径：地址解析不到时返回 `status:348`（而非 `status:0` 配空结果），与「返回成功但缺 `ad_info`」不是同一条分支，合成一条会漏测。
  - **第三条用例的 payload 为派生数据**，由实测成功响应保留 `status:0`、摘掉 `ad_info` 而来，在用例内就地声明并注释标明来源，未写入夹具文件冒充实测样本。
- TEST-011 调用命令调整：由 `-t "resolves a manual city to an adcode through the geocoder"`（只匹配 1 条）改为 `-t "手动城市经地址解析换取 adcode"`（按 describe 名匹配，一次运行本资产全部 3 条）。属 a 卡落地 TEST 定义的范围，Asset ID 与断言语义未变。
- 格式：`npx prettier --check` 对夹具与 spec 均通过；`git diff --check` 退出码 `0`。
- 未完成项：实现留给 TASK-10b。在 TASK-10b 完成前，**手动选城市在真机上仍然拿不到温度**，不得对外描述为已修复。

## TASK-10b · 写实现：手动城市改走地址解析换取 adcode

### 任务定义

- 状态：green
- 来源：BUG-14、AC-01、MVP-01、HC-06、SPEC 第 22 条
- 契约影响面：无
- 阻塞依赖（Depends On）：TASK-10a（状态必须为 red）
- 可并行（Parallel With）：无
- Consumes：TASK-10a 红测与 geocoder 夹具
- Produces：`manual` 模式先调 `/ws/geocoder/v1/?address=<城市名>` 取 `result.ad_info.adcode`，再以 `adcode` 走 TASK-09b 建立的天气取数路径；`city=` 参数从代码中彻底消失
- 边界约束：
  - geocoder 与两次天气请求合计三次，必须**串行**
  - geocoder 失败或没有 `adcode` 时走既有 `unavailable()` 降级，**不得回退到默认城市**（HC-06 明令禁止静默猜测城市）
  - 不得把用户输入的城市名直接当作 `adcode` 透传
  - `auto` 模式仍直接使用 `location`，不经 geocoder，避免无谓消耗配额
- 跨模块检查：小程序手动城市输入路径不变，`miniprogram/pages/outfit/index.js` 无需改动
- 既有用例改写约束（2026-08-17 P3 二次补正，起因见本卡首轮施工的阻塞记录）：
  - 涉及且**仅**涉及一条：`手动城市请求不需要暴露坐标，并返回供应商归一化城市`。它转红的原因是**测试桩不认识地址解析的 URL**，把实时天气夹具喂给了 `/ws/geocoder/v1/`，不是断言错了。
  - 只允许把该用例的 fetch 桩换成 TASK-10a 已建好的 `makeRoutedFetch`（或给 `makeRealFetch` 补一条 geocoder 路由分支）。**三项断言意图一条都不许削弱**：① 请求中出现用户输入的城市名；② 手动模式不携带 `location=`；③ 返回的城市名取自供应商而非回显用户输入。
  - 严禁通过 `it.skip`、`it.todo`、注释掉或放宽断言让它通过。
- 允许改：`src/weather/tencent-weather.service.ts`、`src/weather/tencent-weather.service.spec.ts`（**仅限**上述一条既有用例的 fetch 桩，以及为其复用 `makeRoutedFetch` 所需的最小作用域调整）
- 禁止碰：TEST-010 与 TEST-011 的定义与断言（两个 `describe` 整段）、夹具文件 `src/weather/__fixtures__/**`、其余六条既有用例、`src/wardrobe/**`、`src/ai/**`、小程序、SPEC
- 自测：`TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts` 退出 `0`；`npm test -- --runInBand`、`npm run build` 均退出 `0`；TEST-001~TEST-011 逐条原样复跑退出 `0`
- 人工验收：留待 P6——小程序搭配页手动填写城市后，确认显示该城市的真实温度
- 回滚：撤回 `tencent-weather.service.ts` 本卡改动

### 施工后填写

> 本卡曾于首轮施工阻塞（记录见下方「首轮阻塞记录」）。2026-08-17 经 P3 二次补正把 spec 按单条用例范围纳入「允许改」后重开，本次达成绿灯。

- 实际改动：
  - `src/weather/tencent-weather.service.ts`（首轮即完成）：① 新增 `WeatherQuery` 判别式类型（`location` | `adcode`），把「天气接口真正接受的查询条件」与「用户请求形态」分开表达；② 新增 `resolveQuery(request, apiKey)`——`auto` 直接用降精度经纬度，`manual` 转交地址解析；③ 新增 `resolveAdcode(city, apiKey)`——请求 `/ws/geocoder/v1/?address=<城市名>` 读取 `result.ad_info.adcode`，拿不到返回 `undefined`，**不猜测、不退回默认城市**（HC-06）；④ `requestUrl` 形参由 `NormalizedWeatherRequest` 改为 `WeatherQuery`，参数名直接取自 `query.kind`，`city` 参数就此消失；⑤ 地址解析 → 实时 → 逐小时三次请求严格串行。
  - `src/weather/tencent-weather.service.spec.ts`（本轮补正范围内）：`makeRealFetch` 增加一条 `/ws/geocoder/v1/` 路由分支，返回 `TENCENT_GEOCODER_BEIJING`，共 4 行。
- 既有用例处置核对（对照本卡「既有用例改写约束」）：仅改动 `手动城市请求不需要暴露坐标，并返回供应商归一化城市` 所依赖的 fetch 桩，**三项断言意图逐条保留且未削弱**——① 请求中仍须出现用户输入的城市名（现由 geocoder 的 `address=上海` 承载）；② 手动模式仍断言不含 `location=`（现走 `adcode=110000`）；③ 返回城市名仍须取自供应商（输入「上海」而期望「北京市」，回显即失败）。未使用 `it.skip`、`it.todo`、注释或放宽断言；其余六条既有用例与 TEST-010、TEST-011 的定义和断言一字未动。
- BUG-14 契约核对：`grep -n "city=" src/weather/tencent-weather.service.ts` **无命中**，腾讯不接受的 `city` 参数已从实现中彻底消失。
- TEST 记录：`docs/test.md#TEST-011`，「P4 绿灯（TASK-10b）」执行记录与首轮阻塞记录均已写入；TEST 定义、测试名称与调用命令逐字未改。
- 执行结果：
  - 先原样复跑 TEST-011，退出码 `1`，三条失败与 TASK-10a 记录逐字一致，原因未漂移。
  - 实现后 `TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts` 退出码 `0`，11 项全部通过。
  - cwd `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`：`npm test -- --runInBand` 退出码 `0`，39 个套件、**218 项**全部通过（TASK-09b 基线 215 项 + TEST-011 新增 3 项，数量可对账）。
  - `TZ=UTC npx jest --runInBand` 退出码 `0`，同样 39 套件 218 项——**在生产容器时区下整体回归同样全绿**。
  - TEST-001~TEST-009 承载套件原样复跑退出码 `0`，4 套件 50 项通过。
  - `npm run build`、`npm run test:miniapp`、`git diff --check` 均退出码 `0`；`npx prettier --check` 对实现、spec、夹具三份文件均报 `All matched files use Prettier code style!`。
- 未完成项：
  - **人工验收全部未执行**。BUG-13/14/15 的自动化验证已完成，但真机路径留待 P6：① 授权定位后确认显示真实城市、当前温度与未来八小时趋势；② 手动填写城市后确认显示该城市真实温度；③ 时段标签与手机时间一致——**时区缺陷只在生产容器（UTC）显现，本机测试无法替代**。
  - 本轮天气模块的三次外部请求（地址解析 + 实时 + 逐小时）每次推荐都会发生，实际配额消耗与响应时延**尚未在真实环境观测过**，P6 需留意。
  - 既有基线问题：`src/wardrobe/recommendation/outfit-generator.service.ts` 第 118、190、346-354 行与其 spec 第 715 行仍有本轮更早卡片留下的 prettier 差异，按 `kun-code` 协议未顺手修复。

#### 首轮阻塞记录（2026-08-17，已由 P3 二次补正解除）

首轮施工完成全部实现后，TEST-011 三条转绿，但整套退出码为 `1`：唯一失败项是 TASK-09b 时期改写的 `手动城市请求不需要暴露坐标，并返回供应商归一化城市`，返回 `{ status: 'unavailable', reason: '天气位置不可用。', hourly: [] }`。根因为**测试桩缺陷而非实现缺陷**——该用例的 `makeRealFetch` 只按 `type=hours` 二分流，把实时天气夹具返回给了 `/ws/geocoder/v1/` 请求。当时该 spec 不在本卡「允许改」内，按协议不得顺手修复，故记 `blocked` 并回 P3。此为 TASK-09b 同类阻塞的第二次复发，教训已写入 `docs/plan.md#卡片切分补正二`。

## TASK-11 · 让两条降级守卫拥有有鉴别力的回归保护

> **卡型说明（为什么是单卡而不是 a/b 配对卡）**：配对卡的 `a` 必须取得**原因正确的红灯**，红灯来源是「实现尚未写」。本卡不存在这个前提——`hasProviderError` 与 `hourly.length < 8` 两条守卫**已经是正确的**，新用例写完即绿。若强行拆成 a/b，`a` 卡只能靠临时删掉生产代码来制造红灯，并把仓库留在「守卫已被移除」的中间态等待 `b` 卡恢复；一旦中断，分支上就躺着一个真实回归。那是为了满足形式而制造风险。
>
> 因此本卡采用单卡形态，并用**更强的证据**替代红→绿循环：变异验证（见 `docs/plan.md#变异验证（BUG-16 专用，TEST-012 / TEST-013 的鉴别力证明）`）。变异在**同一张卡内**完成并立即还原，仓库任何时刻都不会停留在守卫缺失的状态；还原后 `git diff --stat` 为空即为「实现零改动」的机器证据。本卡不伪造任何自动化结果分类：TEST-012/TEST-013 在 `docs/test.md` 中如实记录「首次运行即绿」与「变异下转红」两段证据，不谎称存在过缺实现的红灯。

### 任务定义

- 状态：implemented
- 来源：BUG-16、AC-01、AC-04、MVP-05、HC-06
- 契约影响面：无。本卡不改变任何公开契约、返回结构、配置或用户可见行为，只替换测试内部的数据来源。
- 阻塞依赖（Depends On）：无。TASK-09b、TASK-10b 均已终态并提交（`61e03d1`），本卡在 `6721da8` 之上开工。
- 可并行（Parallel With）：无。本轮其余卡片均已终态。
- Consumes：
  - 实测夹具 `src/weather/__fixtures__/tencent-weather-responses.ts` 的 `TENCENT_REALTIME_BY_LOCATION` 与 `TENCENT_FORECAST_HOURS`（TASK-09a 产出，2026-08-17 实测原文）
  - BUG-16 的复核证据（`docs/plan.md` 缺陷表）：`successfulProviderPayload.result` 无数组形态 `realtime`，`parseProviderPayload` 在 `tencent-weather.service.ts:290-301` 短路
  - 本 spec 文件外层 `describe` 内已存在的辅助：`response()`、`makeConfig()`、`FIXTURE_NOW`、`freezeFixtureNow()`
- Produces：
  - `docs/test.md` 的 TEST-012、TEST-013 两个资产记录，各含「首次绿灯」与「变异红灯」两段证据
  - `src/weather/tencent-weather.service.spec.ts` 中两条有鉴别力的降级守卫用例，取代空转的 `供应商返回错误状态或不足八个未来小时数据时返回 unavailable`
  - `grep -n "successfulProviderPayload\|futureHours" src/weather/tencent-weather.service.spec.ts` 无命中的核对结果
  - 「实现零改动」的机器证据：变异还原后 `git diff --stat src/weather/tencent-weather.service.ts` 为空
- Test Seam：`TencentWeatherService.getContext`（沿用 TEST-010/TEST-011 的同一公开边界，不新增 Seam，不断言私有 `parseProviderPayload` / `hasProviderError`）
- TEST Asset ID：TEST-012、TEST-013
- 来源类型：new（检索证据见 `docs/plan.md#TEST 资产策略`；仓库无 `docs/archive/**`）
- TEST 记录：`docs/test.md#TEST-012`、`docs/test.md#TEST-013`
- 历史来源：无。被取代的既有用例未登记为 TEST 资产，且其语义由「空转」变为「有鉴别力」，不构成 `reuse` 或 `adapt`。
- 边界约束：
  - 只观察 `getContext` 的公开返回，不断言私有方法、不导入内部类型
  - 失败形态只能由实测样本**就地派生**并注释标明来源，**不得向夹具文件写入任何字段**（先例见 `docs/test.md#TEST-011` 的「派生数据声明」）
  - 两条新用例各自使用**就地声明**的路由 fetch 桩，不改动、不复用 `makeRealFetch`（TEST-010 及三条既有用例的载体）与 `makeRoutedFetch`（TEST-011 的载体），避免波及已终态资产
- 跨模块检查：无。`TencentWeatherService` 的公开返回 `OutfitTemperatureContext` 字段与含义一字不改，下游 `outfit-generator`、Controller、小程序均不受影响；由 `npm test -- --runInBand` 全量回归兜底确认。
- 允许改：
  - `src/weather/tencent-weather.service.spec.ts`，且**仅限**以下四处：① 删除 `futureHours`（`:38-51`）与 `successfulProviderPayload`（`:52-76`）两个构造器；② 把 `makeFetch` 的默认 payload 由 `successfulProviderPayload` 改为实测夹具 `TENCENT_REALTIME_BY_LOCATION`（`:79`）；③ 删除用例 `供应商返回错误状态或不足八个未来小时数据时返回 unavailable`（`:261-292`）；④ 在其原位置新增 TEST-012、TEST-013 两条用例
  - `docs/test.md` 中 TEST-012、TEST-013 两个小节与 manifest 两行
  - `src/weather/tencent-weather.service.ts`，**且仅限变异验证期间的临时改动**：改动必须在同一张卡内用 `git checkout -- src/weather/tencent-weather.service.ts` 还原，还原后该文件相对 `6721da8` 必须逐字相同。任何意图保留的实现改动都不在本卡范围。
- 禁止碰：
  - TEST-010 的定义与断言（`describe('对齐腾讯真实响应契约')` 整段）
  - TEST-011 的定义与断言（`describe('手动城市经地址解析换取 adcode')` 整段）
  - 夹具文件 `src/weather/__fixtures__/**` 的任何字段名、层级与取值
  - 其余六条既有用例的名称与断言：`在外发和缓存前将自动坐标保留两位…`、`手动城市请求不需要暴露坐标…`、`相同的降精度坐标在十五分钟缓存窗口内只请求一次`、`缺少 Key 时返回 unavailable…`、`只读取 canonical 腾讯配置…`、`供应商超时或抛出网络错误时返回 unavailable…`。其中「缺少 Key」与「canonical 配置」两条使用 `makeFetch()` 默认值，但都断言 `fetchImpl` 从未被调用，默认 payload 换成实测夹具对它们**应当**无影响——施工时须实跑确认，不得想当然。
  - `src/wardrobe/**`、`src/ai/**`、`miniprogram/**`、`docs/spec.md`
  - `hasProviderError`、`hourly.length < 8` 的判定逻辑、阈值与降级文案（变异期间的临时删除除外，且必须还原）
- 验收：
  1. `grep -n "successfulProviderPayload\|futureHours" src/weather/tencent-weather.service.spec.ts` 无命中
  2. `TZ=UTC npx jest --runInBand src/weather/tencent-weather.service.spec.ts` 退出码 `0`，套件用例由 11 条变为 12 条（删 1 条、增 2 条）
  3. **变异验证两条全部成立**：删 `hasProviderError` → 仅 TEST-012 失败且原因为 `Expected: "unavailable"` / `Received: "available"`；删 `hourly.length < 8` → 仅 TEST-013 失败且原因相同。任一条变异下用例仍通过，即按 `docs/plan.md` 暂停条件停止并回 P3
  4. 变异还原后 `git diff --stat src/weather/tencent-weather.service.ts` 为空
  5. `npm test -- --runInBand` 与 `TZ=UTC npx jest --runInBand` 均退出码 `0`，套件数 39 不变、用例数由 218 变为 219（删 1 增 2，数量可对账）
  6. `npm run build`、`npm run test:miniapp`、`git diff --check` 均退出码 `0`；`npx prettier --check src/weather/tencent-weather.service.spec.ts` 通过
- 人工验收：无。本卡不改变任何用户可见行为，不存在「打开什么 → 点什么 → 看到什么」的路径。BUG-13/14/15 的真机验收仍留待 P6，不因本卡而改变。
- 回滚：`git checkout -- src/weather/tencent-weather.service.spec.ts` 回到 `6721da8` 状态；撤回 `docs/test.md` 中 TEST-012/TEST-013 两个小节与 manifest 两行。若变异验证中途中断，另需 `git checkout -- src/weather/tencent-weather.service.ts`。不使用 `git reset --hard`、`git clean` 或批量删除。

### 施工后填写

<!-- P4 完成时直接把上方唯一“状态”改为 implemented / blocked；不得另建 TEST 状态或完成状态字段。 -->

- TEST 记录：`docs/test.md#TEST-012`、`docs/test.md#TEST-013`，以及 `docs/test.md#TASK-11 施工核对（2026-08-17）`。完整命令、退出码与失败原文均在该处，本卡不复制。
- 实际改动：仅 `src/weather/tencent-weather.service.spec.ts` 一个源文件（144 行变化）。① 删除 `futureHours`、`successfulProviderPayload` 两个编造数据构造器共 39 行；② `makeFetch` 默认 payload 改为实测夹具 `TENCENT_REALTIME_BY_LOCATION`，并补注释说明此处为何不得再出现手写响应；③ 删除空转用例 `供应商返回错误状态或不足八个未来小时数据时返回 unavailable`；④ 在其原位置新增 TEST-012、TEST-013 两条，各自就地声明按 URL 分发的假 fetch，失败形态由实测夹具就地派生（TEST-012 只改顶层 `status` 为 `110`，TEST-013 只把 `forecast_hours[0].infos` 截到前 5 条），均注释标明来源。夹具文件一字未动。
- 变异验证结果：**两条全部成立**。① 移除 `hasProviderError` 判定 → 12 项中仅 TEST-012 失败，`Expected: "unavailable"` / `Received: "available"`；② 删除 `if (hourly.length < 8) return undefined;` → 仅 TEST-013 失败，原因相同。两次变异互不干扰，说明两条资产各自精确指向一条守卫。两次均以 `git checkout -- src/weather/tencent-weather.service.ts` 还原，最终 `git diff --stat` 该文件输出为空——实现相对 `6721da8` 逐字相同。
- 未完成项：
  - 本卡不改变任何用户可见行为，无人工验收路径。BUG-13/14/15 的真机三条路径仍全部未执行，留待 P6，不因本卡而改变。
  - 第二轮 P5 的三条非阻断观察（`miniappFallback` 不可达分支及锁定它的用例、ADR-0001 与实现口径不一致、`HANDOFF.md` / `PROJECT_STATE.md` 内容过期）按 PLAN 非目标未处理，需用户另开 Bug 任务。
  - 既有基线欠账：`src/wardrobe/recommendation/outfit-generator.service.ts` 第 118、190、346-354 行与其 spec 第 715 行的 prettier 差异仍在，属改动前即有，按 `kun-code` 协议未顺手修复。
  - 遗留项 B04（`OutfitTemperatureContext` 非判别式联合、消费端 `?? ±Infinity`）仍 `OPEN`，根因 `PLAN`。
  - 卡型偏离已披露：本卡不符合 `kun-code` 协议的 a / b / 单卡（自动化豁免）三条路径中的任何一条，理由见本卡「卡型说明」。协议未为「给已经正确的实现补回归守卫」提供路径，本卡以变异验证替代红→绿循环，并如实记录「首次即绿」，未伪造缺实现的红灯。
