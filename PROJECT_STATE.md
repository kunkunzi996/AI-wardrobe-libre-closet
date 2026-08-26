# PROJECT_STATE

> 本文件只写**当前事实**。已完结的历史记录和功能验收明细归档在 `docs/PROJECT_LOG.md`。

## 2026-08-13 新标签穿搭消费与天气体验（当时本地施工中；后已合入并部署）

功能分支 `feature/outfit-taxonomy-consumption` 已在本地接通有效搭配标签画像、规则—AI—规则生成、腾讯天气代理和小程序天气模式。搭配页支持自动定位与手动城市，设备只保存模式和可选城市，坐标只随当前推荐请求发送；页面可显示城市、当前温度、未来八小时温度，定位或天气失败时继续推荐并提示“本次未使用实时温度”。

本地根因修正已把小程序穿搭确定性规则统一归到 `OutfitGeneratorService`：AI 成功、AI 降级和本地规则共用方案收敛，低温冲突核心会提示风险，整套颜色关系进入推荐理由；`OutfitAiService` 只保留供应商请求、解析和响应形状清洗。腾讯天气配置已收敛为 `TENCENT_LBS_KEY`、`TENCENT_LBS_BASE_URL`、`TENCENT_LBS_TIMEOUT_MS`，真实值仍只存在于仓库外生产环境配置。

当时仅为本地代码状态。后续已于 2026-08-18 以 `52d124c` 合入 `main` 并部署生产；P6 可验项收口见 `docs/PROJECT_LOG.md`。当时剩余 11 件未补标；2026-08-26 用户已取消剩余真人补标待办。新版推荐是否正式启用看验收沙盒，见 ADR 0003。

## 2026-08-11 AI 客观标签白名单施工（已部署，单件数据与安全验收通过）

功能代码已完成并通过本地验证。已实现 AI 专用标签白名单、两道 AI 结果过滤、提示词约束、拒绝项安全日志，以及历史标签兼容和处理标记测试；未改数据库、API 或小程序页面。

本地验证均已完成：

- `npm test -- --runInBand src/wardrobe/garment-tag-taxonomy.spec.ts src/ai/garment-vision.service.spec.ts src/wardrobe/miniapp-admin.service.spec.ts`：PASS，3 个套件、45 项测试；
- `npm run test:miniapp`：PASS；
- `npm test -- --runInBand`：PASS，36 个套件、158 项测试；
- `npm run build`：PASS，退出码 0；
- `npx prettier --check ...`：首次因 5 个授权文件格式问题 FAIL，修正后复跑 PASS；
- `git diff --check`：PASS，退出码 0。

生产部署和真实 AI 单件试点均已完成；未做数据库迁移或历史标签清洗。2026-08-11 19:19（北京时间）通过微信开发者工具管理员库存页，仅对困困子账号（用户 ID 1）执行一次 `limit=1`：服务端返回 `requestedLimit=1`、`effectiveLimit=1`、`attemptedThisRun=1`、`analyzedThisRun=1`、`filledGarmentCount=1`、`filledFieldCount=16`、失败 0、镜像冲突 0、剩余 11 件。实际处理衣物为 `#77 短裤`；落库结构化标签不含 `wearingFeel`，没有舒适、亲肤、透气、束缚、紧身、修身、合身或宽松，版型为 AI 白名单内的客观轮廓“廓形”。数据库核对显示已补标总数由 3 增至 4，`#70/#73/#75` 三件试点前后整行 SHA-256 完全一致。

补标后管理员库存 Excel 已重新导出并读取：`#77` 行的版型为“廓形”，结构化标签无“穿着感”，AI 补标时间为 `2026-08-11 19:19:10`；其余 11 件仍无补标时间。页面结果弹窗、生产数据库和 Excel 三层证据一致。

该次人工验收曾进入 `ACCEPTANCE_BLOCKED`：只读检查生产日志时发现请求日志会记录完整 `Authorization: Bearer ...` 访问令牌。按“发现日志泄露立即停止”的验收门禁，本轮没有处理第 2 件，也没有扩大到 3 件。后续已完成请求日志脱敏、生产部署、双日志哨兵验证和 `ACCESS_TOKEN_SECRET` 轮换，当前安全验收状态见下方最终生产收口。

历史流水线状态：`DEPLOYMENT_BLOCKED`（由 `PRIMARY_SYNCED` 进入阻塞）。功能分支 `feature/ai-objective-tag-whitelist` 已通过 PR [#2](https://github.com/kunkunzi996/AI-wardrobe-libre-closet/pull/2) 合并到 `main`，合并提交为 `e1fd372`；GitHub `back-end-ci` 与 Playwright `test` 均通过，本地主工作区已同步。2026-08-11 生产持久构建重试退出码为 `1`：生产阶段 `npm ci` 中 `better-sqlite3` 预编译下载超时，随后 `node-gyp rebuild` 因找不到 Python 失败；候选镜像 `ai-wardrobe:candidate-e1fd372` 不存在。旧容器 `ai-wardrobe` 仍 running，镜像为 `sha256:29f998fa...`，公网首页与 `/api/miniapp/garments/taxonomy` 均实测 `200`，线上当前健康。未创建当日备份、未停止或切换容器、未执行真实 AI。恢复入口：等待用户确认可行的构建环境/方案后，从 `main@e1fd372` 重新建立候选镜像并重新走部署前门禁；本次不自行选择方案、不重复盲目重试。

历史流水线状态（首次白名单部署后）：`ACCEPTANCE_BLOCKED`（部署层为 `SMOKE_GREEN`）。生产已部署合并提交 `819121ca2c4e1e7df114852f7f964a35d155c3ec`（PR [#3](https://github.com/kunkunzi996/AI-wardrobe-libre-closet/pull/3)，`back-end-ci` 与 Playwright `test` 均 SUCCESS；未走 GitHub Actions 部署工作流）。服务器通过 bundle 同步 `main` 后，从仓库 Dockerfile 构建 `ai-wardrobe:candidate-819121c`，耗时约 `511.3s`；candidate 与 `ai-wardrobe:latest` 当时均指向镜像 `sha256:223b39b8822ab07deae228392b42c684d9df4dda79cfa031006a92c445fc76d3`，旧版本回滚标签为 `ai-wardrobe:rollback-819121c`（`sha256:29f998fa...`）。切换前已完成停机备份：`/root/ai-wardrobe-backup-20260811-171042`，245 个文件、486M，SQLite `integrity_check=ok`；旧容器停止 `2026-08-11T09:10:49.499Z`，新容器启动 `2026-08-11T09:13:34.362Z`，停机约 `164.863s`。上线冒烟全部通过：容器 running、启动日志 `Nest application successfully started`、必需环境变量逐键均 OK、`ai_wardrobe_data:/app/data` 与生产 DB 存在、只读 `integrity_check=ok` 且 `garment_count=168`、构建产物含 `AI_GARMENT_TAG_TAXONOMY`、公网首页与 `/api/miniapp/garments/taxonomy` 均 `200`、核心 GET `/api/miniapp/garments` 返回 `200`。真实 AI 单件数据与 Excel 核对通过，但生产请求日志泄露完整访问令牌，因而进入后续安全修复。

本轮安全修复发布过程曾进入 `DEPLOYMENT_BLOCKED`。请求日志脱敏修复已通过 PR [#4](https://github.com/kunkunzi996/AI-wardrobe-libre-closet/pull/4) 合并，merge 提交为 `4bc13bcd1b50ccb408ffa64f2d4713b0fac5f490`；服务器仓库已同步到该提交。首次候选构建运行约 12 分 29 秒无产物后已 TERM 终止，当时未生成候选镜像、未切换容器或轮换密钥；后续恢复和最终部署结果见下方记录。

本轮唯一受控构建重试（2026-08-11 UTC 12:45）使用独立日志 `/tmp/ai-wardrobe-build-4bc13bc-retry-20260811T124513493446784Z.log` 和服务器端 20 分钟硬超时，退出码 `125`、日志 353 bytes、候选镜像仍不存在。安全摘要定位为 Docker CLI 不接受本次命令的 `--progress` 参数（`unknown flag`），未见 Docker daemon、网络、磁盘、内存或内核 OOM 证据；未创建本轮新备份，未停止旧容器，未进入部署/脱敏/密钥轮换。恢复入口：需用户另行确认后修正构建命令并重新走全部门禁；本轮不再重试。

最终构建与部署门禁（2026-08-11 UTC 12:52 起）：移除不兼容参数后的唯一构建成功（exit `0`），候选 `ai-wardrobe:candidate-4bc13bc` 已生成；无数据卷原生依赖查询和构建产物脱敏配置检查均 PASS。已建立回滚标签 `ai-wardrobe:rollback-4bc13bc-20260811T125713Z`。按门禁停止旧容器并完成新备份 `/root/ai-wardrobe-backup-20260811T125749Z`（三个 SQLite 文件、245 个文件）；候选只读 integrity 检查因操作命令路径引号错误未得到结果，立即停止切换并直接启动原旧容器恢复，旧镜像未变，公网首页、taxonomy、garments 均返回 `200`。候选未切换、脱敏未上线、`ACCESS_TOKEN_SECRET` 未轮换，未运行 AI 或修改衣物数据；备份、构建日志及回滚标签均保留。恢复入口：需用户另行确认后修正完整性检查命令并重新走部署门禁；本轮不再继续。

在旧容器恢复运行期间，对既有备份再次执行完整性门禁：候选镜像与备份只读挂载的 Node 代码结构预检为 `PASS`，实际只读 integrity 命令结果为 `integrity_check=FAIL`（未输出错误原文）。按门禁立即停止，未停止旧容器、未切换候选、未轮换密钥、未运行 AI 或修改数据；具体失败原因未知，不再尝试。恢复入口：需用户另行确认后进行独立的完整性诊断，再重新走全部部署门禁。

备份副本只读诊断（2026-08-11）：旧容器与公网三接口均健康，备份 `sqlite3.db`、`-wal`、`-shm` 均存在且非空，hash 前后保持一致。`node -e` 参数索引/退出码结构预检为 `PASS`；唯一实际结构化脚本因内联载荷截断返回 `node_script=FAIL|hash_unchanged=PASS`，未得到 SQLite 打开、WAL、quick_check 或 integrity_check 结论。该证据支持“脚本/参数失败”，不支持推断数据库损坏；按门禁不再重试、不接触 live volume、不修改任何生产或备份文件。恢复入口：需用户另行确认后采用已审计脚本进行独立诊断。

Codex 独立只读复核（2026-08-11）：使用单独上传并校验哈希的诊断脚本，以无网络、备份目录只读挂载、脚本只读挂载的候选容器检查 `/root/ai-wardrobe-backup-20260811T125749Z`。首次脚本明确返回 `MODULE_NOT_FOUND`，确认此前笼统 `FAIL` 的根因是脚本位于 `/diagnose.js` 时无法解析 `/app/node_modules/better-sqlite3`，不是数据库损坏；改用 `/app/package.json` 解析镜像依赖后，数据库只读打开 `PASS`、`journal_mode=wal`、`quick_check=PASS`、`integrity_check=PASS`、`garment_count=168`。三个 SQLite 文件诊断前后哈希完全一致。生产容器全程未停止，复核后仍 running，公网首页、taxonomy、garments 均为 `200`；未部署脱敏、未轮换密钥、未运行 AI 或修改生产数据。恢复入口：数据库完整性阻塞已排除，若继续上线，须重新从部署前门禁开始完成最终停机备份、候选切换、日志 sentinel 和密钥轮换。

安全修复最终生产收口（2026-08-11）：当前状态为 `SECURITY_ACCEPTED` / `SMOKE_GREEN`。部署前新建停机备份 `/root/ai-wardrobe-backup-20260811T-final-codex`，245 个文件、486M；备份副本只读检查为 `journal_mode=wal`、`quick_check=PASS`、`integrity_check=PASS`、`garment_count=168`，三个 SQLite 文件哈希前后不变。生产已切换至 PR [#4](https://github.com/kunkunzi996/AI-wardrobe-libre-closet/pull/4) 的脱敏镜像 `sha256:c0a6043b...`，`ai-wardrobe:latest` 与 `candidate-4bc13bc` 指向同一镜像；当前容器 running，挂载仍为 `ai_wardrobe_data:/app/data`。切换前及密钥轮换后各执行一次 synthetic Bearer 哨兵：公网 taxonomy 均为 `200`，Docker 日志和持久 `app.log` 中原始哨兵命中均为 `0`、`[Redacted]` 均命中，脱敏验证 PASS。

生产 `ACCESS_TOKEN_SECRET` 已原子轮换：密钥值已改变，其他环境配置哈希保持一致，文件权限仍为 `600`，新容器已验证加载新密钥；未读取、输出或保存密钥值。轮换后数据库 `integrity_check=ok`、衣物数仍为 `168`，公网首页、taxonomy、garments 均为 `200`，启动日志成功且近期错误计数为 `0`。旧 JWT 已不再被当前生产服务接受，你和你老婆需要在小程序重新登录；衣橱数据不受影响。本轮未再次运行 AI、未修改衣物数据。

用户确认清理后，两个 stopped 容器 `ai-wardrobe-pre-redaction-4bc13bc-20260811` 与 `ai-wardrobe-pre-secret-rotation-4bc13bc-20260811` 已逐个删除并确认不存在，旧密钥环境快照不再保留在停止容器中。清理后生产容器仍 running、镜像仍为 `sha256:c0a6043b...`、数据卷挂载正常，近期错误计数为 `0`，公网首页、taxonomy、garments 均为 `200`。rollback 镜像、生产备份和构建/诊断临时文件继续保留，未做批量删除。

## 2026-08-06 补标数量边界与时间预算修复（已部署验收）

本轮两个提交，均已合入 `main` 并推送，`bd8882c` 已部署生产。

- `0644511` 补标数量边界修复：`miniprogram/pages/admin-inventory/index.js` 原用 `tapIndex === 0 ? 1 : 3` 判断批次大小，异常回调（`tapIndex` 缺失或非法）会被误判成常规批次而一次分析 3 件，突破试点边界。改为只有明确选择第二项才传 `limit=3`，其余一律回落到 1 件。同时在 `scripts/validate-miniapp-shell.cjs` 新增断言，覆盖 `tapIndex` 为 `0`/`undefined`/`1` 三种回调。
- `bd8882c` 时间预算修复：一批最多分析几件由 `(BACKFILL_TIME_BUDGET_MS - BACKFILL_TIME_RESERVE_MS) / AI_VISION_TIMEOUT_MS` 决定。生产 `AI_VISION_TIMEOUT_MS=30000`，原预算 90 秒算出 `floor(75000/30000)=2`，导致界面写「常规分析 3 件」实际只跑 2 件。预算提到 105 秒后 `floor(90000/30000)=3`，与 `BACKFILL_LIMIT_MAX` 对齐。未改单图超时，避免压缩单张图容错时间。
- 时间余量已核对：小程序补标请求超时与 Nginx `proxy_read_timeout` 均为 120 秒；循环内实时闸门保证最后一件在「开始 + 90 秒」前结束，仍留 30 秒给响应。
- 验证：36 个测试套件共 147 项全部通过；`npm run test:miniapp` 通过；`npm run build` 退出码 0；微信开发者工具实测两个选项分别命中 `limit=1` 与 `limit=3`。
- 部署方式为**服务器本地构建**（GitHub 链路不通，详见下文「服务器规格与已知约束」）。

### 本轮已实跑的生产补标批次

管理员「困困子」（用户 ID 1，15 件衣物）已实际执行 3 件补标，新增 68 个标签，剩余 12 件待处理，失败 0 件。全库当时统计为 168 件衣物 / 3 个用户 / 4 件已补标。

### 生产数据备份

部署前已完成停机备份，停机 39 秒：

```text
/root/ai-wardrobe-backup-20260806-164128    481M / 245 个文件
```

已校验 `integrity_check: ok`。**注意数据库为 SQLite WAL 模式，还原时 `sqlite3.db`、`sqlite3.db-wal`、`sqlite3.db-shm` 三个文件必须一起放回**，只放主库会丢最近未合并的数据。

## 当前状态

AI 衣橱已完成 MVP 并进入迭代期。`main` 包含全部已验收能力，功能清单见下方「已完成能力」，**每个功能的验收明细、实现细节和历史决策归档在 `docs/PROJECT_LOG.md`**。

当前可用状态：

- **生产环境**：`https://aimatchwear.asia` 正常服务，生产业务代码基线为 `b356919`（2026-08-21 服务器本地构建，镜像 `ai-wardrobe:candidate-b356919` / `f75fdaa6c75f`）。上一业务镜像 `ai-wardrobe:rollback-f12563b-live-20260822`（`3a57481e4c89`）。更早回滚点 `rollback-52d124c-live-20260819` 与 `rollback-52d124c-20260818T031630Z` 保留未改。本次停机备份 `/root/ai-wardrobe-backup-20260821T174930Z`。
- **本轮功能**：废除衣物库存状态。小程序接口、备份、Excel 不再出现 `status`/`statusLabel`/`wearableCount`；网页衣橱去掉状态下拉。数据库列保留。用户 2026-08-22 确认启用。
- **轮次文档**：当前无活跃 `docs/spec.md` / `plan.md` / `task.md` / `test.md`。本轮已冻结在 `docs/archive/2026-08-22-废除衣物库存状态/`。衣橱复制轮次在 `docs/archive/2026-08-20-衣橱复制到验收沙盒/`。
- **小程序体验版**：仍为 `1.0.1`（2026-07-12）。用户只要自己预览，未上传新体验版；老婆手机仍是旧包。
- **数据隔离**：微信登录 + 按 `openid` 隔离已验收。本轮双账号串衣未再验。
- **补标**：沙盒（用户 ID 4）143 件已全量分析。困困子账号试点 4 件后未再继续；老婆真人衣橱未跑补标。2026-08-26 用户决定这两项都不再做，不再当作待办。补标功能入口保留。
- **日志**：生产 `app.log` 已于 2026-08-18 按方案 A 日切（`/etc/logrotate.d/ai-wardrobe-app`，copytruncate，留 7 天，超 50MB 提前切）。旧日志在卷内 `app.log-20260818`，额外备份 `/root/ai-wardrobe-app.log.bak-20260818T125420Z`。

最新已验收功能提交为：

```text
f4becfb 功能：废除小程序衣物库存状态
```

最新主分支部署验收提交为：

```text
b356919（服务器本地构建 candidate-b356919；PR #8 合入 main）
```

> 说明：`b356919` 于 2026-08-21 通过**服务器本地构建**部署。上一业务基线是 `f12563b`。小程序体验版仍为 `1.0.1`，未上传。用户确认启用本轮「无库存状态」行为。

## 当前阶段

阶段：MVP 完成 / 体验版微信登录隔离已验收 / Qwen 3.7 识图升级已验收 / 重复衣物入库提醒已验收 / 重复判断结构化细化 V2.1 已验收 / 查看类似衣服 已验收 / 前端换肤方案B柔彩卡片 已验收并合入 main（未传体验版）/ 手动添加今日穿搭 已验收并合入 main / 今日穿搭删除 已完成服务器部署和微信开发者工具验收 / 今日穿搭修改 已完成服务器部署和微信开发者工具验收 / AI 搭配反馈导出和管理员库存导出 已完成服务器部署和微信开发者工具验收 / 衣物结构化标签库 已完成生产部署和微信开发者工具验收 / 衣物表单折叠选择框改版 已验收并合入 main（纯前端，无需部署，未传体验版）/ 存量衣物 AI 补标签 已完成困困子 4 件生产试点，剩余真人补标已取消/ AI 客观标签白名单、请求日志脱敏与生产密钥轮换 已完成部署和安全验收（`4bc13bcd`）/ 小程序结构化标签穿搭与天气已部署（`52d124c`），P6 可验项已收口、补验窗口已于 2026-08-19 关闭（非正式启用）/ 衣橱复制到验收沙盒已完成生产部署和用户验收（`f12563b`，非正式启用）/ 验收沙盒全量补标已用户跑通（沙盒 143 件 / 2862 标签，纯前端）/ 废除衣物库存状态已部署并用户确认启用（`b356919`）

后端骨架验收状态：已验收（2026-06-19，后端验收官通过）

当前重点不是继续堆新功能，而是：

- 稳定体验版
- 修复真实用户反馈的关键问题
- 把重复判断从“粗相似”继续收紧到“结构化细节相似”
- 保持服务器代码、GitHub `main`、微信小程序体验版三者对齐
- 保护 `.env`、微信 AppSecret、用户衣橱隔离和备份数据

## 已完成能力

- 原生小程序衣橱首页：列表、筛选、详情入口、重新加载
- 单件衣物上传：图片压缩、AI 识别、表单二次确认、保存
- 衣物表单折叠选择框：添加/编辑衣物页的 5 组结构化标签和 8 个老字段（分类/颜色/季节/细分/材质/厚薄/风格标签/场景标签）统一为「点开才显示子标签」的折叠选择框；分类/颜色/细分/材质/厚薄单选，季节/风格/场景多选；选项取自后台标签库白名单，AI 库外值追加为可取消项；提交格式与后端保持不变
- 鞋子/包包/配饰等非衣服图片的 AI 分类识别修复
- 阿里云图片分割/抠图接入，生产环境依赖 `.env` 中 Aliyun 配置
- 围绕核心衣物生成穿搭推荐，并确保结果包含核心衣物
- 今日穿搭保存
- 今日穿搭删除：长按今日穿搭卡片，确认后删除该条记录；搭配和照片只在没有其他日历引用时清理
- 今日穿搭修改：长按今日穿搭卡片选择“修改”，可编辑文字信息、评分、关联衣物，也可更换全身照；后端同时支持 `POST/PATCH /api/miniapp/daily-outfits/:id`
- 手动添加今日穿搭：必选全身照，可填写理由/场合/评分/反馈，可选关联衣柜单品，已通过微信开发者工具端到端验收并合入 `main`
- 衣橱照片批量导入：相册多选、后台预识别、逐张确认/跳过
- AI 客观标签自动写入：AI 仅从专用白名单写入可观察或允许推测的标签，不写紧身、修身、合身、宽松、舒适、亲肤、透气、束缚等穿着体验；生产单件试点与 Excel 核对已通过
- HTTP 请求日志安全：Authorization、Cookie、Proxy-Authorization 和 Set-Cookie 在控制台及持久日志中统一显示为 `[Redacted]`；生产双哨兵验证通过，JWT 签名密钥已轮换
- 衣橱备份导出：ZIP 包含 `manifest.json` 和 `photos/`
- 衣橱备份导入：独立 `.zip` 入口，恢复衣物信息和照片
- 首页长按衣物卡片进入批量删除模式，可多选删除
- 小程序微信登录：`wx.login` 换后端 JWT，按微信 `openid` 绑定用户
- 小程序数据隔离：衣橱、备份导入导出、搭配推荐、今日穿搭均按当前微信用户读取/保存
- 双微信号体验版验收通过：你和你老婆可分别管理各自衣橱
- Qwen 3.7 衣物图片识别：服务器已部署 `7078492`，容器环境已切到 `QWEN_VISION_MODEL=qwen3.7-plus`，微信开发者工具验收成功
- 重复衣物入库提醒：单件新增和批量导入识图后，会基于当前微信用户自己的库存查找相似衣物，并在保存前弹窗提醒避免重复入库
- 重复判断结构化细化 V2 / V2.1：已通过服务器部署和微信开发者工具体验版验收，系统现在会结合口袋、胸前标识类型/位置/文字等结构化字段来判断是否重复，并降低“共同缺少特征”导致的误报
- 查看类似衣服：当系统识别出相似衣物时，表单页会提供“查看类似衣服”入口，用户可以把本次新增衣服和库存里的相似衣物放在一起对比后，再决定是否继续录入
- 后端架构基线：已补齐 `docs/backend-architecture-source-of-truth.md`，后续业务开发必须遵守 Controller / Service / Entity / Guard / Config 分层规则
- 衣橱复制到验收沙盒：管理员可把空用户标成验收沙盒（困困子/老婆等已有衣橱数据的号不能新标），确认件数后把源衣橱的衣物、照片、标签、搭配、今日穿搭和反馈拷成独立副本；源只读。已在生产拷过老婆号 → 第三只微信（ID 4）。非正式启用。整橱覆盖能力代码在，本轮未再验。
- 验收沙盒全量补标：库存页只对验收沙盒提供「全量补标（自动连跑）」，按现有每批 3 件接口连续请求；真人衣橱仍只能 1 件或 3 件。沙盒 ID 4 已跑完 143 件、新增 2862 标签。
- 废除衣物库存状态：小程序衣橱/搭配 JSON、备份 zip、管理员 Excel 不再出现库存状态；网页衣橱去掉状态下拉/筛选/展示。数据库 `status` 列保留，生产 311 件均为 wearable。用户 2026-08-22 确认启用。网页端不再作为使用入口。

## 关键入口

小程序页面：

- `miniprogram/pages/wardrobe/index.*`：衣橱首页、批量导入/导出/导入备份、批量删除
- `miniprogram/pages/garment-form/index.*`：单件上传、AI 识别、批量导入逐张确认
- `miniprogram/pages/garment-detail/index.*`：衣物详情
- `miniprogram/pages/outfit/index.*`：AI 搭配
- `miniprogram/pages/daily-outfit/index.*`：今日穿搭
- `miniprogram/pages/add-outfit/index.*`：手动添加今日穿搭，全身照必填，衣柜单品可选
- `miniprogram/pages/profile/index.*`：我的页面、反馈数据导出入口、管理员库存导出入口
- `miniprogram/pages/admin-inventory/index.*`：管理员库存导出、验收沙盒标记、衣橱复制预览与拷全结果
- `miniprogram/utils/api.js`：小程序登录、token 保存、所有 API 请求头

后端入口：

- `src/auth/miniapp-auth.controller.ts`：小程序微信登录接口 `/api/miniapp/auth/login`
- `src/auth/miniapp-auth.service.ts`：微信 `code2Session`、按 `openid` 找到/创建用户、签发 JWT
- `src/auth/conditional-auth.guard.ts`：读取小程序 `Authorization: Bearer ...` token
- `src/wardrobe/miniapp-wardrobe.controller.ts`：小程序衣物 API、AI 分析、备份导入导出
- `src/wardrobe/miniapp-outfit.controller.ts`：小程序搭配推荐 API
- `src/wardrobe/miniapp-daily-outfit.controller.ts`：小程序今日穿搭 API
- `src/wardrobe/miniapp-admin.controller.ts`：小程序管理员用户列表 / 用户库存导出 / 验收沙盒标记 / 衣橱复制预览与复制 API
- `src/wardrobe/miniapp-admin.service.ts`：管理员白名单校验、用户列表、按用户读取库存、验收沙盒标记
- `src/wardrobe/wardrobe-copy.service.ts`：衣橱整橱复制与覆盖
- `src/wardrobe/miniapp-outfit-feedback.controller.ts`：AI 搭配反馈保存 / 导出 API
- `src/wardrobe/outfit-feedback.service.ts`：反馈保存与按用户查询
- `src/dal/entity/outfit-feedback.entity.ts`：反馈数据表实体
- `src/wardrobe/recommendation/outfit-generator.service.ts`：穿搭推荐生成
- `src/ai/outfit-ai.service.ts`：AI 搭配提示词与返回结果规范
- `src/ai/garment-vision.service.ts`：衣物图片识别
- `src/file/file-service.abstract.ts`：图片标准化、阿里云抠图、`copyStoredFile` 复制已存照片（复制衣橱不走抠图）

## 生产服务器

服务器项目目录：

```bash
/root/AI-wardrobe-libre-closet
```

公网域名：

```text
https://aimatchwear.asia
```

Docker 镜像/容器：

```text
image: ai-wardrobe:latest
container: ai-wardrobe
port: 127.0.0.1:3000->3000
volume: ai_wardrobe_data:/app/data
```

最近一次生产服务器验收：2026-08-21，`b356919` 已通过服务器本地构建部署；在跑镜像 `ai-wardrobe:candidate-b356919`。切前业务回滚点 `ai-wardrobe:rollback-f12563b-live-20260822`，更早回滚点保留。本次停机备份 `/root/ai-wardrobe-backup-20260821T174930Z`。

### 服务器规格与已知约束（2026-08-06 实测）

- 腾讯云轻量应用服务器，Ubuntu，主机名 `VM-0-10-ubuntu`，2 核 / 1.9GB 内存 / 50GB 磁盘。
- 已配置 **4GB swapfile**（`/swapfile`，已写入 `/etc/fstab` 并实测重挂），`vm.swappiness=10`（已写入 `/etc/sysctl.conf`）。加 Swap 前为 0，任何内存尖峰都可能触发 OOM Killer 杀掉生产容器。
- **服务器到 GitHub 的链路基本不通**：连测 3 次 `github.com` 全部 20 秒超时；而 `registry.npmjs.org` 正常（0.7~1.3 秒）。所有依赖 GitHub 的环节都会卡：Releases 上的预编译二进制、`git fetch`、GitHub Actions 的镜像包传输。
- 因此仓库变量 **`AUTO_DEPLOY_MAIN` 已于 2026-08-06 置为 `false`**，推 `main` 不再自动部署。需要部署时手动触发工作流，或走服务器本地构建（步骤见 `docs/github-actions-auto-deploy.md`）。
- 镜像标签约定：`ai-wardrobe:latest` 为在跑版本，`candidate-<sha>` 为待验证构建产物，`rollback-<sha>` 为回滚点。当前在跑 `candidate-b356919`（与 `latest` 同镜像）。切回上一业务版用 `rollback-f12563b-live-20260822`。
- 清理 Docker 垃圾只用 `docker image prune`（删无标签镜像）；**不要用 `docker builder prune`**，那会清掉构建层缓存，导致下次构建重新耗时约 47 分钟。

GitHub Actions 自动部署工作流 `.github/workflows/deploy-main.yml` 仍然可用：推送 `main` 会先执行 `npm run test:miniapp` 和 `npm run build`；部署环节由 `if: github.event_name == 'workflow_dispatch' || vars.AUTO_DEPLOY_MAIN == 'true'` 控制。镜像在 GitHub runner 上构建后 `docker save` 打包传到服务器 `docker load`，服务器不重新构建。配置与排查见 `docs/github-actions-auto-deploy.md`。

### 生产密钥的位置（2026-08-06 起变更）

真实密钥存放在**仓库目录之外**：

```bash
/root/ai-wardrobe.env      # 19 个键，权限 600，git 永远碰不到
```

仓库内的 `.env` 是被 git 跟踪的文件，只保留上游默认值（`APP_NAME` 和一对 VAPID 密钥，共 3 个键），**不要往里面写任何真实密钥**。

变更原因：真实密钥原本写在仓库内的 `.env` 里，带来两个风险——`git switch/merge` 会覆盖它（每次部署都要备份再恢复，漏一次就丢密钥），而且本仓库是**公开仓库**，一次 `git add -A` 就会把微信 AppSecret、阿里云密钥等推上公网。挪出仓库后两个风险一起消失，部署脚本里的备份/恢复步骤也已删除。

容器通过 `--env-file /root/ai-wardrobe.env` 注入。真实环境变量优先级高于镜像内的 `.env`，镜像里那份只是兜底。

## 必需环境变量

生产环境至少要确认这些变量在容器内存在：

```text
QWEN_API_KEY
QWEN_API_BASE_URL
QWEN_VISION_MODEL
QWEN_TEXT_MODEL
AI_VISION_TIMEOUT_MS
ACCESS_TOKEN_SECRET
WECHAT_MINIAPP_APP_ID
WECHAT_MINIAPP_APP_SECRET
MINIAPP_ADMIN_USER_IDS 或 MINIAPP_ADMIN_WECHAT_OPEN_IDS（管理员库存导出需要）
BG_REMOVAL_PROVIDER
ALIBABA_CLOUD_ACCESS_KEY_ID
ALIBABA_CLOUD_ACCESS_KEY_SECRET
ALIYUN_IMAGE_SEG_ENDPOINT
ALIYUN_IMAGE_SEG_REGION
ALIYUN_IMAGE_SEG_RETURN_FORM
ALIYUN_IMAGE_SEG_TIMEOUT_MS
TENCENT_LBS_KEY
TENCENT_LBS_BASE_URL
TENCENT_LBS_TIMEOUT_MS
```

当前衣物图片识别只走 Qwen 配置；`QWEN_VISION_MODEL` 默认值为 `qwen3.7-plus`。旧的 `AI_VISION_MODEL=gpt-4.1-mini` 识图兜底已不再使用。生产服务器 `.env` 如果写了 `QWEN_VISION_MODEL=qwen-vl-plus` 会覆盖代码默认值，必须改成 `QWEN_VISION_MODEL=qwen3.7-plus` 后重启容器。

验证容器环境：

```bash
docker exec ai-wardrobe sh -c 'test -n "$QWEN_API_KEY" && echo "QWEN_API_KEY OK" || echo "QWEN_API_KEY MISSING"'
docker exec ai-wardrobe sh -c 'echo "QWEN_VISION_MODEL=$QWEN_VISION_MODEL"'
docker exec ai-wardrobe sh -c 'test -n "$WECHAT_MINIAPP_APP_ID" && echo "WECHAT_MINIAPP_APP_ID OK" || echo "WECHAT_MINIAPP_APP_ID MISSING"'
docker exec ai-wardrobe sh -c 'test -n "$WECHAT_MINIAPP_APP_SECRET" && echo "WECHAT_MINIAPP_APP_SECRET OK" || echo "WECHAT_MINIAPP_APP_SECRET MISSING"'
docker exec ai-wardrobe sh -c 'test -n "$ALIBABA_CLOUD_ACCESS_KEY_ID" && echo "AK_ID OK" || echo "AK_ID MISSING"'
docker exec ai-wardrobe sh -c 'test -n "$ALIBABA_CLOUD_ACCESS_KEY_SECRET" && echo "AK_SECRET OK" || echo "AK_SECRET MISSING"'
```

## 标准服务器同步流程

用户是服务器新手。以后每次需要上线或测试新代码，都必须给完整命令，不要只说“拉代码”。

项目级规则：每次功能研发、Bug 修复或配置调整完成后，如果后续涉及服务器拉取代码、切换/合并分支、重建 Docker 容器、修改 `.env`、恢复配置或验证生产环境，完成报告里必须给用户一整段可直接复制执行的服务器命令，并明确说明本次是拉 `main` 还是拉某个功能分支。

从 GitHub 同步 `main`：

```bash
sudo -i
cd /root/AI-wardrobe-libre-closet
git fetch --depth=20 origin +refs/heads/main:refs/remotes/origin/main
git switch main
git merge --ff-only origin/main
git log --oneline -3
docker tag ai-wardrobe:latest ai-wardrobe:rollback-$(git rev-parse --short HEAD@{1})
docker build -f docker/Dockerfile -t ai-wardrobe:candidate-$(git rev-parse --short HEAD) .
```

构建成功后再切换容器（先构建到 `candidate-<sha>`，失败时线上不受影响）：

```bash
docker tag ai-wardrobe:candidate-$(git rev-parse --short HEAD) ai-wardrobe:latest
docker rm -f ai-wardrobe
docker run -d \
  --name ai-wardrobe \
  -p 127.0.0.1:3000:3000 \
  --env-file /root/ai-wardrobe.env \
  -v ai_wardrobe_data:/app/data \
  ai-wardrobe:latest
docker ps
curl https://aimatchwear.asia/api/miniapp/garments
```

切换后必须逐键验证密钥读到了，只看接口 200 不够：

```bash
for k in $(grep -oE '^[A-Za-z_]+=' /root/ai-wardrobe.env | tr -d '='); do
  v=$(docker exec ai-wardrobe printenv "$k" 2>/dev/null)
  [ -n "$v" ] && echo "OK   $k" || echo "MISS $k"
done
```

如果 GitHub 连接失败，常见报错：

```text
GnuTLS recv error (-110)
Failed to connect to github.com port 443
```

这通常是服务器到 GitHub 网络不稳定。优先重试 fetch；连续失败再考虑本地打包上传服务器。

## 微信小程序发布提醒

很多 MVP 功能是小程序前端改动。服务器部署成功后，体验版仍需要在微信开发者工具中点击：

```text
上传
```

否则体验版用户看不到新的小程序页面交互。

微信登录上线必须在服务器 `.env` 保留：

```text
WECHAT_MINIAPP_APP_ID=你的小程序AppID
WECHAT_MINIAPP_APP_SECRET=你的小程序AppSecret
ACCESS_TOKEN_SECRET=生产强随机字符串
MINIAPP_ADMIN_WECHAT_OPEN_IDS=管理员微信openid
```

否则体验版进入原生页面时会登录失败，衣橱接口拿不到当前微信用户；管理员库存导出入口也不会显示。`WECHAT_MINIAPP_APP_SECRET` 和管理员 `openid` 不要写进代码或提交到 GitHub。

## 本地工作区注意事项

本地经常存在微信开发者工具配置变更：

```text
M project.config.json
?? project.private.config.json
```

这两个默认不要提交，除非用户明确要求。

## 验收命令

常用本地验证：

```bash
npm run test:miniapp
npm test -- miniapp-auth.service.spec.ts conditional-auth.guard.spec.ts miniapp-wardrobe.controller.spec.ts --runInBand
npm run build
```

## 下一轮建议从这里开始

- 当前状态：废除库存状态已部署 `b356919` 并经用户 P6 确认启用。轮次文档已归档。体验版仍 `1.0.1`。真人衣橱剩余补标已取消，不再当作待办。
- 建议任务：
  - 体验版按既有决定先不上传，老婆维持 `1.0.1`。
  - 整橱覆盖路径如需验收，对已有沙盒再拷一次并确认只剩新副本。
- 继续文件：优先看 `PROJECT_STATE.md`、`docs/PROJECT_LOG.md`、`docs/backend-architecture-source-of-truth.md`。
- 后端开发前必须看：`docs/backend-architecture-source-of-truth.md`。
- 小程序表单改动前必须知道：衣物表单的字段选择框由 `miniprogram/pages/garment-form/index.js` 里的 `fieldSelectorConfigs` 驱动（决定每个字段单选/多选、选项来自本地常量还是标签库）；`buildFieldGroups` 每次都从当前 `form` 值重建视图模型，所以 AI 回显、编辑回显、批量导入三条路径都能自动同步。改这里时**不要动提交格式**：单值字段是字符串，季节/风格/场景是「、」拼接串，后端靠 `GarmentService.normalizeTags` 拆数组。
- 风险提醒：不要丢 `.env`；不要提交本地微信开发者工具配置；旧的 `owner=null` 公共衣橱数据不会自动迁移到某个微信用户；服务器 GitHub 连接不稳定时不要误判为分支不存在；`.github/workflows/deploy-main.yml` 尚未具备本轮人工部署使用的 SQLite WAL 停机备份、候选验证和回滚门禁，`AUTO_DEPLOY_MAIN` 在单独加固验收前必须保持 `false`。SQLite 备份完整性检查必须在镜像 `/app` 下加载 `better-sqlite3`，不要把脚本挂在容器根目录。
