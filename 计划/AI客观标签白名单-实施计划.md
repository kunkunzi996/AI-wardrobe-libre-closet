# 施工说明：收紧 AI 自动打标为客观标签白名单

> 给 Codex 的任务说明。请严格按本文件执行，不要自由发挥，不要顺手改其他无关代码。
> 施工中只输出必要的简短进度；阻塞问题、测试失败、高风险动作、用户新指令和范围变化必须立即说明。
> 项目根目录：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
> 当前分支：`main`
> 任务类型：中型功能行为调整（不改数据库、接口和小程序页面）
> 分支策略：用户已确认施工使用 `feature/ai-objective-tag-whitelist`。真正开工前先核对工作区；未获得“开始施工”授权前不要创建分支。未获得单独授权，不要 commit、push、合并或部署。

开始施工前必须先读：

- `PROJECT_STATE.md`
- `CONTEXT.md`
- `docs/superpowers/specs/2026-08-11-ai-objective-tag-whitelist-design.md`
- 本计划

当前 `main` 已有本功能的未提交文档：`PROJECT_STATE.md`、`CONTEXT.md` 和设计文档。它们是已确认的本功能文档，不是待清理垃圾。开工时必须保留；如果实际 `git status` 还出现其他改动，先停下说明，不能覆盖、重置或顺手提交。

---

## 背景

现有视觉识别把完整的 `GARMENT_TAG_TAXONOMY` 作为 `allowedTaxonomy` 交给 AI。完整标签库里：

- `wearingFeel` 包含舒适、亲肤、透气、束缚、宽松等真实穿着体验；
- `fit` 同时包含直筒、A 字等客观轮廓，以及紧身、修身、合身、宽松等与穿着者有关的体验；
- `GarmentVisionService.normalizeTaxonomyTags()` 使用完整过滤器；
- `buildGarmentTagBackfillPatch()` 也会把 AI 返回的这些值自动追加到衣物数据。

用户已确认：当前阶段继续允许 AI 自动写入，以便完善打标逻辑，但 AI 不得生成或写入穿着体验。

## 已确认的产品决策

1. AI 自动写入流程保留，不新增人工确认步骤。
2. AI 完全不能写 `wearingFeel`。
3. AI 可写的版型只有：直筒、廓形、A 字、H 型、X 型、O 型、茧型、喇叭。
4. 紧身、修身、合身、宽松属于穿着体验，不能作为 AI 版型写入。
5. 材质、厚薄、季节、天气、色彩感觉、风格和场合暂时继续允许 AI 自动写入。
6. 不清洗已经补标的 3 件衣物，不迁移历史 `fit` 或 `taxonomyTags`。
7. 用户手动输入和历史数据继续使用完整标签库。

---

## 一、目标

完成后，新增衣物识别和管理员存量补标都只能从 AI 专用白名单写入标签：

- AI 返回舒适、亲肤、透气、束缚等穿着体验时，后端丢弃；
- AI 返回紧身、修身、合身、宽松作为版型时，后端丢弃；
- AI 返回 A 字、直筒等允许的客观轮廓时，可以正常写入；
- 一件衣物同时含合法和非法标签时，只丢非法项，不让整件分析失败；
- 用户手动标签和历史标签的读取、编辑、导出保持原样。

**本次只做 AI 白名单、AI 结果过滤、隐私安全日志和对应测试；不做数据库迁移、历史标签清洗、表单改版、API 改版、剩余衣物批量补标或标签权限元数据重构。**

---

## 二、关键技术点

1. **一个 AI 白名单真源**：提示词、AI 结果归一化和管理员补标必须复用同一个常量，不能各写一份黑名单。
2. **完整过滤器与 AI 过滤器分离**：`sanitizeGarmentTaxonomySelection()` 行为不变；新增的 AI 过滤器只用于 AI 产生的数据。
3. **两道落库防线**：视觉服务先过滤；`GarmentService` 合并补标前再次过滤，防止内部调用或以后代码回归绕过提示词。
4. **历史兼容**：当前衣物已有 `fit=合身/宽松` 时继续保留；只能阻止新的 AI 结果追加这些值。
5. **可观测但不泄密**：记录被拒绝的标签组和值，但必须限制数量、JSON 转义，不记录图片、用户信息、提示词全文或密钥。
6. **处理标记语义不变**：AI 调用成功但所有结果都被过滤时，仍可以记录 `tagsBackfilledAt`；它表示“已完成分析”，不表示“补到了标签”。

---

## 三、文件清单（只动这些）

### 新建

无。不得新建额外服务、实体、迁移或配置文件。

### 修改

1. `src/wardrobe/garment-tag-taxonomy.ts` —— 定义 AI 专用白名单、过滤结果和唯一 AI 过滤函数。
2. `src/wardrobe/garment-tag-taxonomy.spec.ts` —— 验证完整标签库兼容、AI 白名单边界和拒绝结果。
3. `src/ai/garment-vision.service.ts` —— 提示词改用 AI 白名单，AI 草稿归一化改用 AI 过滤器并记录拒绝项。
4. `src/ai/garment-vision.service.spec.ts` —— 验证请求白名单、合法/非法混合结果和纯非法结果。
5. `src/wardrobe/garment.service.ts` —— 管理员补标合并前第二次过滤，并安全记录绕过第一道门的非法结果。
6. `src/wardrobe/miniapp-admin.service.spec.ts` —— 调整旧的“AI 追加宽松版型”预期，增加历史兼容、非法拦截和处理标记测试。
7. `PROJECT_STATE.md` —— 自动化测试完成后只记录真实开发与验证状态；没有部署就必须写“未部署、未做真实 AI 试点”。

### 明确不改

- `src/wardrobe/miniapp-admin.service.ts`
- `src/wardrobe/miniapp-admin.controller.ts`
- `src/dal/entity/garment.entity.ts`
- `miniprogram/**`
- 数据库迁移目录
- `.env`、部署脚本和 GitHub Actions

如真实施工发现必须修改清单外文件，先停下说明原因并让用户确认。

---

## 四、详细施工步骤

### 4.1 先写标签真源测试

文件：`src/wardrobe/garment-tag-taxonomy.spec.ts`

在现有 4 个测试后增加测试，先让测试失败，再实现代码：

1. `AI_GARMENT_TAG_TAXONOMY` 不含 `wearingFeel`；
2. `AI_GARMENT_TAG_TAXONOMY.fit` 严格等于 8 个客观轮廓；
3. 完整过滤器仍接受历史值，例如：

```ts
expect(
  sanitizeGarmentTaxonomySelection({
    wearingFeel: ['舒适', '宽松'],
    fit: ['合身', '宽松'],
  }),
).toEqual({
  wearingFeel: ['舒适', '宽松'],
  fit: ['合身', '宽松'],
});
```

4. AI 过滤器面对合法与非法混合输入时，只保留合法项，并返回被拒绝项；
5. JSON 字符串、畸形输入、重复标签仍按现有过滤器的容错习惯处理。

测试中至少覆盖：

```ts
{
  wearingFeel: ['舒适', '亲肤'],
  fit: ['宽松', 'A字', '直筒'],
  color: ['黑色'],
}
```

预期保留 `fit=['A字','直筒']`、`color=['黑色']`，拒绝整个 `wearingFeel` 以及 `fit=['宽松']`。

### 4.2 建立唯一 AI 白名单和过滤函数

文件：`src/wardrobe/garment-tag-taxonomy.ts`

放在 `GARMENT_TAG_TAXONOMY`、相关类型和 `sanitizeGarmentTaxonomySelection()` 附近，复用现有 `parseSelection()`、`valuesFrom()` 和去重规则。

新增唯一版型常量：

```ts
export const AI_GARMENT_FIT_TAGS = [
  '直筒',
  '廓形',
  'A字',
  'H型',
  'X型',
  'O型',
  '茧型',
  '喇叭',
] as const;
```

新增 `AI_GARMENT_TAG_TAXONOMY`：

- 显式复用完整标签库中除 `wearingFeel` 外的组；
- `fit` 必须覆盖为 `AI_GARMENT_FIT_TAGS`；
- 不复制其他组的标签值；
- `Object.keys(AI_GARMENT_TAG_TAXONOMY)` 的顺序保持与完整标签库一致，只跳过 `wearingFeel`。

新增清晰的返回类型，形状建议为：

```ts
export interface RejectedAiGarmentTag {
  group: string;
  tag: string;
}

export interface AiGarmentTaxonomyFilterResult {
  selection: GarmentTaxonomySelection;
  rejected: RejectedAiGarmentTag[];
}
```

新增唯一入口：

```ts
export function filterAiGarmentTaxonomySelection(
  input: unknown,
): AiGarmentTaxonomyFilterResult;
```

实现要求：

- `selection` 只含 AI 白名单允许的组和值；
- `rejected` 对标签组和值去重；
- 禁止组 `wearingFeel` 中可解析的字符串值要进入 `rejected`；
- `fit` 中非 AI 版型值要进入 `rejected`；
- 未知组或恶意长文本不能产生无限日志：返回前限制拒绝项数量，例如最多 20 项，并把单个标签截到合理长度；
- 畸形输入返回 `{ selection: {}, rejected: [] }`，不能抛异常；
- 不改变 `sanitizeGarmentTaxonomySelection()` 的函数签名和结果。

> 安全要点：AI 限制只能作用于 AI 数据。不要把完整过滤器替换成 AI 过滤器，否则用户手动标签和历史数据会被静默删除。

### 4.3 视觉提示词和第一道过滤

文件：`src/ai/garment-vision.service.ts`

#### 修改导入

从 `garment-tag-taxonomy.ts` 导入：

- `AI_GARMENT_TAG_TAXONOMY`
- `filterAiGarmentTaxonomySelection`
- AI 标签组类型（如果实现需要）

不要移除仍被其他逻辑使用的完整类型与映射。

#### 修改 `buildRequest()`

把：

```ts
allowedTaxonomy: GARMENT_TAG_TAXONOMY,
```

改为唯一 AI 白名单。系统提示和 `rules` 至少明确：

```text
不得返回穿着体验；不得用紧身、修身、合身、宽松描述版型；版型只表示图片可见的衣物轮廓；图片依据不足时返回空数组。
```

不得删除现有这些规则：

- 值必须逐字来自 `allowedTaxonomy`；
- 不确定的组返回空数组；
- 口袋和胸前标识看不清时返回 `unknown`。

#### 修改 `normalizeTaxonomyTags()`

当前代码对 `draft.taxonomyTags` 和 legacy 映射都使用完整过滤器，还存在：

```ts
wearingFeel: legacyStyleTags,
```

必须：

1. 删除这条 `styleTags -> wearingFeel` 映射；
2. 显式 `taxonomyTags` 和 legacy 映射都通过 AI 过滤函数；
3. 合并时只遍历 AI 白名单中的组；
4. AI 返回 `fit='宽松'` 时，最终 `result.fit` 必须为 `undefined`；
5. AI 返回 `fit='A字'` 时，最终 `result.fit` 必须为 `A字`；
6. 同一结果里合法标签继续正常生成 `seasons/styleTags/sceneTags/material/thickness/subcategory`。

#### 记录被拒绝项

复用类内已有 `Logger`，增加一个小而集中的私有日志方法。日志建议使用 `JSON.stringify()` 输出受限后的 `{group, tag}` 数组，防止换行注入；不要打印 AI 原始 JSON、图片文件内容、用户身份或密钥。

### 4.4 补齐视觉服务测试

文件：`src/ai/garment-vision.service.spec.ts`

复用现有：

- `fileService`
- `mockJsonResponse()`
- `defaultStructuredDraft`
- 解析 `fetchImpl.mock.calls[0][1].body` 的请求检查方式
- 直接调用 `(service as any).normalizeResult()` 的归一化检查方式

修改现有测试 `uses qwen3.7-plus by default and disables thinking for Qwen vision requests`，增加：

```ts
expect(prompt.allowedTaxonomy).not.toHaveProperty('wearingFeel');
expect(prompt.allowedTaxonomy.fit).toEqual([
  '直筒',
  '廓形',
  'A字',
  'H型',
  'X型',
  'O型',
  '茧型',
  '喇叭',
]);
```

新增归一化用例：

- 输入 `wearingFeel=['舒适']`、`fit=['宽松','A字']` 和合法颜色；
- 输出没有 `wearingFeel`，`fit` 只剩 `A字`，`result.fit='A字'`；
- 全部标签都被过滤时返回空 `taxonomyTags`，不抛异常；
- 断言 `logger.warn` 只包含受限拒绝项，不包含图片内容或请求密钥。若直接 spy 私有 logger 太脆弱，可只测试过滤函数的拒绝结果，服务测试验证不会把原始 payload 写入正常结果。

### 4.5 管理员补标的第二道过滤

文件：`src/wardrobe/garment.service.ts`

当前 `taxonomyFromAnalysis()` 对 AI 显式标签和镜像字段都使用完整过滤器。调整为：

1. `taxonomyFromFlatFields(garment)` 继续使用完整过滤器，保护历史数据；
2. `taxonomyFromAnalysis(analysis)` 的显式 `taxonomyTags` 和镜像字段统一使用 AI 过滤函数；
3. `analysis.fit='宽松'` 和 `analysis.taxonomyTags.wearingFeel=['舒适']` 必须被拒绝；
4. `analysis.fit='A字'` 可以进入 `taxonomyTags.fit`，并在原 `fit` 为空时补到标量字段；
5. `buildGarmentTagBackfillPatch()` 返回补丁和原有 `outcome` 之外，可额外返回内部使用的 `rejectedAiTags`，但不要把它塞进公开批处理响应；
6. `GarmentService.backfillTagsFromAi()` 在事务中安全记录拒绝项，然后仍按现有逻辑设置 `tagsBackfilledAt` 并 `flush()`；
7. `GarmentTagBackfillOutcome` 的现有字段和计数口径保持不变。

伪代码结构：

```ts
const { selection: aiTaxonomy, rejected } = taxonomyFromAnalysis(analysis);
// 只用 aiTaxonomy 参与现有去重追加和标量只补空逻辑
return { patch, outcome, rejectedAiTags: rejected };
```

> 安全要点：第二道过滤不能清洗 `currentTaxonomy` 或 `currentFlat`。旧衣物已有 `合身/宽松` 时必须原样保留，只拦截新的 AI 输入。

### 4.6 调整补标测试并覆盖历史兼容

文件：`src/wardrobe/miniapp-admin.service.spec.ts`

复用现有 `validAnalysis()`、`makeGarment()` 和 `buildGarmentTagBackfillPatch()` 测试区。

必须调整现有测试 `only appends safe tags and preserves the existing category and scalar values`：

- 历史衣物已有 `fit='合身'` 和 `taxonomyTags.fit=['合身']`，继续保留；
- AI 输入的 `fit=['宽松']` 不再追加；
- 可同时加入合法 `fit=['A字']`，证明只追加 A 字；
- 原有颜色、季节、风格、场合、材质、厚薄、品类的“数组追加、标量不覆盖”断言继续保留。

新增至少 4 类用例：

1. **非法混合输入**：`wearingFeel=['舒适']`、`fit=['宽松','直筒']`，只保存直筒；
2. **标量绕过**：`analysis.fit='合身'` 且 `taxonomyTags={}`，不得写入标量 `fit`；
3. **纯非法结果**：过滤后 `patch` 不包含 AI 标签，`outcome.changed=false`；
4. **处理标记**：调用 `backfillTagsFromAi()` 后，即使没有可写标签，仍设置 `tagsBackfilledAt` 并只 `flush()` 一次。

已有测试 `fills empty legacy fields from taxonomy and empty taxonomy groups from legacy fields` 必须保留，它证明历史 `fit='合身'` 仍可在完整标签库与旧扁平字段之间同步。

### 4.7 更新项目状态

文件：`PROJECT_STATE.md`

只在代码修改和本地自动化测试真实完成后更新顶部状态，写明：

- 分支名和当前提交状态；
- 改了什么；
- 实际运行的命令与 PASS/FAIL；
- 尚未部署；
- 尚未运行真实 AI 单件试点；
- 下一步需要用户授权 commit/push/合并/部署。

禁止提前写“已验收”“已部署”或“主观标签问题已彻底解决”。

---

## 五、自测（全部通过才算本地施工完成）

在项目根目录依次执行：

```powershell
npm test -- --runInBand src/wardrobe/garment-tag-taxonomy.spec.ts src/ai/garment-vision.service.spec.ts src/wardrobe/miniapp-admin.service.spec.ts
npm run test:miniapp
npm test -- --runInBand
npm run build
npx prettier --check src/wardrobe/garment-tag-taxonomy.ts src/wardrobe/garment-tag-taxonomy.spec.ts src/ai/garment-vision.service.ts src/ai/garment-vision.service.spec.ts src/wardrobe/garment.service.ts src/wardrobe/miniapp-admin.service.spec.ts PROJECT_STATE.md
git diff --check
git status --short --branch
```

要求：

- 新增的每条过滤、空结果、日志和兼容分支都有自动化测试；
- 所有命令必须逐项记录退出码和 PASS/FAIL；
- `npm run lint` 当前带 `--fix`，本计划不把它作为只读验收命令，禁止为了跑 lint 顺手改清单外文件；
- 测试全绿后停下汇报，不要自行 commit、push、合并或部署。

---

## 六、人工验收与生产试点

以下路径无法由本地 mock 单测证明，必须在用户明确授权部署后真实执行。

### 6.1 部署前门禁

1. 功能分支本地自测全绿；
2. 用户逐步授权 commit、push、合并和部署；
3. 生产数据库存在当天可恢复备份；
4. 明确一个尚未补标的目标衣物；
5. 不触碰此前已补标的 3 件衣物。

部署必须遵守 `PROJECT_STATE.md` 的标准服务器同步流程。完成报告需给用户一整段可复制命令，并明确部署的是合并后的 `main`；禁止仅凭公网 HTTP 200 宣布新版生效。

### 6.2 单件真实 AI 试点

1. 小程序打开“我的” → “管理员库存导出”，先导出试点前基线；
2. 在“库存管理”选择目标用户；
3. 点击“AI 补标签”；
4. 只选“仅分析 1 件”，不能选 3 件；
5. 等结果弹窗显示本批处理结果；
6. 再次导出 Excel；
7. 用衣物 ID 和最新 `AI补标时间(北京时间)` 定位本件衣物；
8. 核对“结构化标签”不含穿着感，不含紧身、修身、合身、宽松版型；
9. 如果有版型，只能是 8 个客观轮廓之一；
10. 核对颜色、品类、材质等其他合法标签仍可正常生成；
11. 对比试点前后文件，确认此前已补标的 3 件衣物没有被改写。

> ⚠️ 真实 Qwen 输出、生产落库和 Excel 内容无法由本地单测证明，这一段必须由用户亲手在小程序执行并提供导出文件。

### 6.3 扩大到 3 件

只有单件试点完全通过，且用户再次确认后，才允许再运行一次 3 件批次。出现以下任一情况立即停止：

- 新增穿着体验；
- 新增非法版型；
- 历史衣物被意外改写；
- 被拒绝标签日志包含隐私；
- AI 请求失败、超时或计数异常。

不得直接处理剩余全部衣物。

### 6.4 验收完成口径

缺一不可：

- 相关自动化测试 PASS；
- 完整测试 PASS；
- 构建 PASS；
- 生产部署版本证据明确；
- 单件真实 AI 试点 PASS；
- 导出 Excel 人工核对 PASS；
- 如执行 3 件扩大试点，也必须 PASS。

只有全部证据完整后，才允许更新 `PROJECT_STATE.md` 为“已部署验收”，并登记项目驾驶舱已验收里程碑。

---

## 七、红线

- 只动本计划文件清单中的文件，不准自由发挥或顺手重构。
- 施工前使用用户已确认的 `feature/ai-objective-tag-whitelist`；若现场分支或工作区不符，先停下说明。
- 未经授权，不创建提交、不 push、不合并、不部署。
- 禁止批量删除文件或目录；如必须删除，只能一次处理一个明确路径并先取得确认。
- 不修改完整标签库的历史值，不清洗旧数据，不新增数据库迁移。
- 不把 AI 过滤器用于用户输入、历史读取或导出。
- 不改变 API 路径、公开响应契约、管理员权限或用户数据隔离。
- 不新增小程序页面、弹窗或人工确认流程。
- 不记录照片、图片 Base64、用户身份、完整 AI 响应、提示词全文或密钥。
- 不用真实生产 AI 请求代替自动化测试；不以 mock 测试代替真实单件试点。
- HTTP 200、代码合入或导出列存在都不能单独算功能验收通过。
- 任何测试失败都必须停下报告，禁止为了“全绿”删除或弱化旧测试。

---

## 八、遵循的规范

- `CONTEXT.md`：版型、穿着体验、客观标签、推测标签和 AI 可写标签的统一业务含义。
- `docs/superpowers/specs/2026-08-11-ai-objective-tag-whitelist-design.md`：本计划的产品与技术边界真源。
- `docs/backend-architecture-source-of-truth.md`：AI 识别归 `GarmentVisionService`，衣物合并与落库归 `GarmentService`；不得把业务写入 Controller。
- `PROJECT_STATE.md`：生产基线、部署方式、备份要求和服务器操作约束。

施工者完成本地修改与自测后必须停下，按“修改文件、测试证据、未完成项、人工验收入口、建议中文提交信息”汇报，等待用户下一步授权。
