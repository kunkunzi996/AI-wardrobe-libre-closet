# 衣橱复制到验收沙盒 TESTS

- 上游：`docs/plan.md`、`docs/task.md`（用户认可后方可施工）
- 当前轮次：衣橱复制到验收沙盒
- 自动化 TEST：有
- 无自动化原因：不适用

## 本轮 TEST Manifest

| Asset ID | 名称 | 来源类型 | 定义版本 | TEST 状态 | 对应 TASK | P5 状态 |
|---|---|---|---:|---|---|---|
| TEST-001 | marks an empty user as an acceptance sandbox and rejects owners who already have wardrobe data | new | 1 | green | TASK-01a/TASK-01b | passed |
| TEST-002 | copies a full wardrobe onto an empty sandbox and leaves the source unchanged | new | 1 | green | TASK-02a/TASK-02b | passed |
| TEST-003 | overwrites an existing sandbox wardrobe only after confirmed replace | new | 1 | green | TASK-03a/TASK-03b | passed |
| TEST-004 | admin inventory page can mark a sandbox and confirm copy counts | new | 1 | green | TASK-04a/TASK-04b | passed |

## TEST Asset · TEST-001 · marks an empty user as an acceptance sandbox and rejects owners who already have wardrobe data

### 资产定义

- Asset ID：TEST-001
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：1
- 定义哈希：未记录（本项目未建立定义哈希机制，以测试名称加文件路径作为身份；2026-08-20 洁癖门将 planned 占位改为未记录，口径同 2026-08-18 归档）
- 覆盖条目：MVP-01、AC-01、HC-02、HC-03、EX-01
- Test Seam：`MiniappAdminService.setAcceptanceSandbox` / `listUsers`，以及 `MiniappAdminController` 标记入口
- 测试定义载体：`src/wardrobe/miniapp-admin.service.spec.ts`、`src/wardrobe/miniapp-admin.controller.spec.ts`
- 工作目录：`C:\Users\Administrator\orca\workspaces\Libre-Closet\把老婆的仓库copy一份用到测试环境`
- 完整调用命令：`npm test -- --runInBand src/wardrobe/miniapp-admin.service.spec.ts src/wardrobe/miniapp-admin.controller.spec.ts -t "acceptance sandbox"`
- 对应 TASK：TASK-01a、TASK-01b
- 复用判断：归档 Manifest 只有穿搭/天气资产；当前管理员套件没有沙盒标记。属 new。

### 测试定义

- 状态：red
- 定义：P4 已在两个 spec 的 `describe('acceptance sandbox')` 中写入用例。固定名称：`marks an empty user as an acceptance sandbox and lists the sandbox flag`、`rejects owners who already have garments, outfits, calendar entries, or feedback`、`keeps an existing sandbox marked even after it already has wardrobe data`、`rejects non-admin callers before changing any sandbox flag`、`forwards an enabled mark to the admin service`、`returns sandbox fields from the user list`。锁定：空衣橱用户可被管理员标成验收沙盒；已有衣物或搭配或今日穿搭或反馈的用户新标记失败；已是沙盒的用户可保持标记；非管理员失败；`listUsers` 与 Controller 标记入口带出沙盒状态。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-01a） | 2026-08-19 | `kunkunzi996/把老婆的仓库copy一份用到测试环境`，工作目录见上 | 1 | 6 项中 5 项失败、1 项通过、38 项跳过。失败均为 `setAcceptanceSandbox` 不存在（Expected function, Received undefined）。通过项是 Controller 列表透传 mock 字段。无语法/import/环境错误。 | red |
| P4 绿灯（TASK-01b） | 2026-08-19 | `kunkunzi996/把老婆的仓库copy一份用到测试环境`，工作目录见上 | 0 | 原样复跑 TEST-001：2 个套件、6 项通过、38 项跳过。相关基线 `npm test -- --runInBand src/wardrobe/miniapp-admin.service.spec.ts src/wardrobe/miniapp-admin.controller.spec.ts` 退出码 0，44 项全部通过。 | green |
| P5 整体回归 | 2026-08-19 | `7e406cb` / `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 0 | 原样复跑：2 个套件、6 项通过、39 项跳过。跳过 +1 来自同文件新增的 wardrobe copy 入口用例，被 `-t "acceptance sandbox"` 过滤。 | passed |

## TEST Asset · TEST-002 · copies a full wardrobe onto an empty sandbox and leaves the source unchanged

### 资产定义

- Asset ID：TEST-002
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：1
- 定义哈希：未记录（本项目未建立定义哈希机制，以测试名称加文件路径作为身份；2026-08-20 洁癖门将 planned 占位改为未记录，口径同 2026-08-18 归档）
- 覆盖条目：MVP-02、MVP-03、MVP-05、AC-02、AC-03、AC-05、EX-01、EX-03、EX-04、HC-01、HC-04、HC-06、HC-07
- Test Seam：`WardrobeCopyService.preview` / `copy`，以及管理员复制入口
- 测试定义载体：`src/wardrobe/wardrobe-copy.service.spec.ts`、`src/wardrobe/miniapp-admin.controller.spec.ts`
- 工作目录：`C:\Users\Administrator\orca\workspaces\Libre-Closet\把老婆的仓库copy一份用到测试环境`
- 完整调用命令：`npm test -- --runInBand src/wardrobe/wardrobe-copy.service.spec.ts src/wardrobe/miniapp-admin.controller.spec.ts -t "wardrobe copy"`
- 对应 TASK：TASK-02a、TASK-02b
- 复用判断：ZIP 导入测的是当前用户追加且不含品味记录；归档无跨用户复制资产。属 new。

### 测试定义

- 状态：red
- 定义：P4 已写入名称包含 `wardrobe copy` 的用例：`copies a full wardrobe onto an empty sandbox and leaves the source unchanged`、`rejects an unmarked target, the same source and target, and mismatched counts`、`forwards preview and confirmed copy to the copy service`。必须锁定：预览给出源/目标名称和件数；确认件数一致后拷衣物、照片、标签、搭配、今日穿搭、反馈；目标新 ID 对得上；源 ID 与内容不变；未标记目标拒绝；源等于目标拒绝；件数与预览不一致拒绝；调用 `copyStoredFile` 且不走抠图存储。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-02a） | 2026-08-19 | `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 1 | 3 项失败、16 项跳过。失败均为 `WardrobeCopyService` / `previewWardrobeCopy` / `copyWardrobeCopy` 不存在（Expected function, Received undefined）。无语法/import/环境错误。 | red |
| P4 绿灯（TASK-02b） | 2026-08-19 | `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 0 | 原样复跑 TEST-002：2 个套件、3 项通过、16 项跳过。相关基线管理员与文件单测 49 项通过。 | green |
| P5 整体回归 | 2026-08-19 | `7e406cb` / `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 0 | 原样复跑：2 个套件、3 项通过、18 项跳过。跳过 +2 来自同文件新增的 overwrite sandbox 用例，被 `-t "wardrobe copy"` 过滤。 | passed |

## TEST Asset · TEST-003 · overwrites an existing sandbox wardrobe only after confirmed replace

### 资产定义

- Asset ID：TEST-003
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：1
- 定义哈希：未记录（本项目未建立定义哈希机制，以测试名称加文件路径作为身份；2026-08-20 洁癖门将 planned 占位改为未记录，口径同 2026-08-18 归档）
- 覆盖条目：MVP-04、AC-04、EX-02、HC-05
- Test Seam：`WardrobeCopyService.copy`
- 测试定义载体：`src/wardrobe/wardrobe-copy.service.spec.ts`
- 工作目录：`C:\Users\Administrator\orca\workspaces\Libre-Closet\把老婆的仓库copy一份用到测试环境`
- 完整调用命令：`npm test -- --runInBand src/wardrobe/wardrobe-copy.service.spec.ts -t "overwrite sandbox"`
- 对应 TASK：TASK-03a、TASK-03b
- 复用判断：归档和当前套件都没有整橱覆盖资产。属 new。

### 测试定义

- 状态：red
- 定义：P4 已写入 `overwrite sandbox` 用例：`rejects replacing existing data without confirm`、`replaces existing sandbox data after confirm`。必须锁定：目标已有副本且未确认覆盖时拒绝且目标旧数据仍在；确认覆盖后旧副本消失、只剩新副本、源仍不变。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-03a） | 2026-08-19 | `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 1 | 2 项中 1 项失败、1 项通过。通过项：未确认覆盖时已拒绝且旧数据仍在。失败项：`overwrite: true` 后目标仍同时留下旧 ID 99 和新 ID，说明还不会整橱覆盖。无语法/import/环境错误。 | red |
| P4 绿灯（TASK-03b） | 2026-08-19 | `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 0 | 原样复跑 TEST-003：2 项通过。复制套件连同管理员入口共 21 项通过。 | green |
| P5 整体回归 | 2026-08-19 | `7e406cb` / `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 0 | 原样复跑：2 项通过、2 项跳过。 | passed |

## TEST Asset · TEST-004 · admin inventory page can mark a sandbox and confirm copy counts

### 资产定义

- Asset ID：TEST-004
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：1
- 定义哈希：未记录（本项目未建立定义哈希机制，以测试名称加文件路径作为身份；2026-08-20 洁癖门将 planned 占位改为未记录，口径同 2026-08-18 归档）
- 覆盖条目：MVP-01、MVP-03、MVP-05、HC-08
- Test Seam：`scripts/validate-admin-wardrobe-copy.cjs`
- 测试定义载体：`scripts/validate-admin-wardrobe-copy.cjs`
- 工作目录：`C:\Users\Administrator\orca\workspaces\Libre-Closet\把老婆的仓库copy一份用到测试环境`
- 完整调用命令：`node scripts/validate-admin-wardrobe-copy.cjs`
- 对应 TASK：TASK-04a、TASK-04b
- 复用判断：`scripts/validate-miniapp-shell.cjs` 只锁补标签，且当前整命令因天气合同失败。本轮用专用脚本，不 adapt 旧命令。属 new。

### 测试定义

- 状态：red
- 定义：P4 已新建 `scripts/validate-admin-wardrobe-copy.cjs`。必须检查库存页和 `api.js` 含有：验收沙盒标记、源与沙盒选择、预览件数、确认后复制、拷全结果；成功文案不得包含「正式启用」。页面函数名须与 `api.js` 导出及后端路径一致。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 红灯（TASK-04a） | 2026-08-19 | `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 1 | 脚本列出 14 条缺失：api 未导出标记/预览/复制，页面没有验收沙盒、源/目标选择和拷全结果。现有 `showModal` 与用户卡片 `garmentCount` 不算复制流程。无语法/环境错误。 | red |
| P4 绿灯（TASK-04b） | 2026-08-19 | `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 0 | 原样复跑 `node scripts/validate-admin-wardrobe-copy.cjs`，输出 Admin wardrobe copy page validation passed。 | green |
| P5 整体回归 | 2026-08-19 | `7e406cb` / `kunkunzi996/把老婆的仓库copy一份用到测试环境` | 0 | 原样复跑，输出 Admin wardrobe copy page validation passed。 | passed |

## P5 Current 结果

| 检查 | 工作目录 | 完整命令 | 时间 | 退出码 | 结论 |
|---|---|---|---|---:|---|
| 证据预检 | `C:\Users\Administrator\orca\workspaces\Libre-Closet\把老婆的仓库copy一份用到测试环境` | `npm test -- --runInBand src/wardrobe/miniapp-admin.service.spec.ts src/wardrobe/miniapp-admin.controller.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts` | 2026-08-19 | 0 | passed（3 套件、60 项通过。相对改前基线 53 项，+7 来自本轮新增的验收沙盒与衣橱复制用例） |
| Manifest 全量执行 | 同上 | TEST-001~TEST-004 各自完整调用命令 | 2026-08-19 | 0 | passed（四条命令均退出码 0；跳过项增加均可由同文件新增用例被 `-t` 过滤解释） |
| 整体回归 | 同上 | `npm test -- --runInBand` | 2026-08-19 | 0 | passed（40 套件、230 项通过） |

- 适用的其它检查：`npm run test:miniapp` 仍不作为本轮通过门禁；PLAN 已写明其失败属于既有天气穿搭合同。
- P5 评审门禁：ready

## P6 用户验收

| 项 | 结论 | 证据 |
|---|---|---|
| AC-01 第三只微信标成沙盒；困困子/老婆不标 | 用户确认已标 ID 4；未对 ID 1 / ID 3 执行标记 | 库存页操作；库内 `user 4 sandbox=1`，`user 1/3 sandbox=0` |
| AC-02 拷全且对上沙盒衣服 | 用户确认复制成功；库内沙盒衣物 ID 238～380，AI 搭配 380/365 属 ID 4，源对应 235/219 | 用户陈述 + 只读查询 |
| AC-03 源未改 | 用户确认 ID 3 内容未少；库内 ID 3 仍 143 件 | 用户陈述 + `owner_id=3 count=143` |
| AC-04 整橱覆盖 | 本轮未再验 | 用户确认首次拷贝后未要求覆盖验收 |
| AC-05 非沙盒拒绝写入 | 工程测试覆盖；本轮生产未对非沙盒发起复制 | TEST-002 |

结论：用户于 2026-08-20 标记复制功能完成。非正式启用。整橱覆盖不计入本次 P6 通过项。
