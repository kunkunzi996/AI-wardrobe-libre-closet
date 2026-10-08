# PROJECT_STATE

> 本文件只写**当前事实**。已完结的历史记录和功能验收明细归档在 `docs/PROJECT_LOG.md`。

## 2026-10-08 衣物手动 AI 整理与预览采用（P5/P6 已归档，正式后台已部署，小程序 1.0.10 已上传，平台发布待核对）

当前分支 feature/garment-image-normalization，施工固定点为 d479aa7fa7b75f64afc6f092c029f4bc199311ed；完整功能提交 052dee1e4f9ddd0b577a96862f82d9c6a30aa06e 已随PR #19合入，本轮生产代码固定为main合并提交809853f874aaed47da805a43b099922eeb65aa40，正式后台已上线；小程序1.0.10上传成功，本次未操作或核对平台体验版/正式发布设置。用户于 2026-10-08 原话“确认”，认可按现有验收范围结束整轮 P6 并归档；当前无活跃 SPEC/PLAN/TASK/TEST。四份既有文件已按顺序逐个移入 docs/archive/2026-10-08-衣物手动-AI-整理与预览采用/，移动后四个哈希均与移动前一致、四个原路径均不存在。以下旧轮次状态为历史快照，不覆盖本轮事实。

用户后续明确授权“提交推送，部署到生产环境里吧”，并在只读预检后以“ok按你的建议来”确认：保留主线后续 README 与备案页脚改动，建立本轮数据库及图片新备份，再执行新增迁移、开启手动整理，使用正式后台配置上传小程序。当前正式后台已完成受控部署，小程序1.0.10已上传成功，不把候选构建、接口 200 或上传成功当作P6或小程序平台正式发布；本次未操作体验版、审核或发布设置。不触发付费生成，不重开 P5 评审，不改冻结验收记录，不清理临时验收环境。生产预检确认旧镜像 sha256:2cd4f3d5467bfe304ab978e6a66edda19b666cd3d874f8fe47972e22e1f238d8 可作为回滚目标、SQLite 与本地图片存储、311 件衣物及数据库完整性正常；自动部署仍为 false，本轮备份与迁移已执行，见下方当前执行位置。

发布合入记录：完整功能 052dee1 和保留主线说明/备案页脚的同步提交 ce42e08a1ba44c32bcea731d5101b7c974e684bb 均已推送；[PR #19](https://github.com/kunkunzi996/AI-wardrobe-libre-closet/pull/19) 已正常合入为809853f874aaed47da805a43b099922eeb65aa40，保留原主线74edcd81232514e545672f0ddccece9fa3a3f197后续改动。合并树与已测70e2012一致。合入前的本机检查为 44 套/350 项全通过，原 349 项同名仍通过、新增备案页脚 1 项通过，17 页面场景、小程序结构与无产物类型检查均通过。按既有忽略配置直接核对 Git 已提交文本的格式检查通过；本机全量格式命中的 115 个未改动文件只是 Windows CRLF，不做批量格式化。 下方旧失败均为已解决历史，不据此重开评审或宣称当前仍阻塞。

首次发布门禁阻塞：[后端 CI 37768761711](https://github.com/kunkunzi996/AI-wardrobe-libre-closet/actions/runs/37768761711) 构建和格式检查通过，lint 自动修复后仍有 32 个错误；原始 Git 文本检查共 47 条，主线对应载体为 0。用户随后原话“允许”，授权只修已定位的 9 个文件，保持业务、安全校验及测试断言不变。当前最小返修已完成：测试替身明确返回 Promise、保留缺实现时的公开契约断言和动态加载、明确夹具类型并移除无意义断言；文件名安全过滤改为同范围字符码检查，262158 个前后对照样本覆盖全部 65536 个 UTF-16 字符且完全一致。未修改规则、提示词、接口或冻结文档。

返修后的本机验证：9 个授权载体 lint 为 0 错误；独立新进程检查全部 189 个已跟踪 TS 文件为 0 错误（现有警告及忽略项不做顺带修复），格式检查、44 套/350 项回归、17 页面场景、小程序结构及无产物类型检查均退出 0。350 项名称与状态和返修前完全一致，8 个测试载体原断言语义保持一致，四份冻结文件哈希未变。全量诊断首次在同进程混用旧主线类型图时产生 2 条夹具类型误报，真实文件直接 lint 和当前源码独立进程复核均通过，未改误报涉及的业务文件。主线既有 CI 35678804056 的 MinIO 镜像拉取失败是独立阻塞，不自行修流水线或绕过门禁；远端实际结果如下。

远端规范返修历史结果：最小规范返修提交 de923bbba9c75dc737832f4149ee48f8d71589e3 已推送。[后端 CI 37772089955](https://github.com/kunkunzi996/AI-wardrobe-libre-closet/actions/runs/37772089955) 的构建、格式、lint、覆盖率回归、本地浏览器冒烟与负载均 SUCCESS，随后在 start minio s3 object storage 失败，退出 125：minio/minio:latest 镜像 pull access denied。与主线旧 CI 35678804056 同一步、同镜像、同退出码及同错误，不是本次已消除的 lint 问题；后面的对象存储测试等均因依赖失败跳过，不能声称完整 CI 通过。[独立 Playwright 37772096106](https://github.com/kunkunzi996/AI-wardrobe-libre-closet/actions/runs/37772096106) 已 SUCCESS。

用户再次原话“允许”，授权只修 CI 存储测试环境、保留全部测试，通过后继续既有部署流程；本次固定点 11ede46eaf6a36e58f06d4958fb5823e53dd2e3d。官方 MinIO 已改为源码分发；官方文档所列 Quay 镜像也实测无 manifest。仅调整 .github/workflows/github-actions-ci.yml：按官方发布提交 9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a（RELEASE.2025-10-15T17-29-55Z）及其 Go 1.24.8 编译 CI 专用 MinIO，数据独立放 runner.temp、仅监听回环地址；创建原测试桶前检查进程与健康就绪，失败立即退出。首次源码编译预算将 CI 上限从 10 分钟改为 20 分钟，原非存储步骤及全部命令/环境/断言保持一致，不弱化或跳过测试。YAML、脚本语法及范围/步骤守卫已验证，后续完整远端运行已成功，不仅是静态守卫；原桶实际创建及全部后续存储检查均通过，见下方当前执行位置。

当前执行位置：70e2012bacf91705b7ca7aa37539528e0ebebb4f 已推送；功能分支后端 37775139593 与 Playwright 37775145229 均 SUCCESS，PR #19 正常合入为 main@809853f874aaed47da805a43b099922eeb65aa40，合并树与已测分支一致。主线后端 37776207255、Playwright 37776207206 也 SUCCESS；44 套/350 项、本地及 PostgreSQL/MinIO 两组冒烟/负载、Lighthouse 等全部原步骤通过，原测试桶实际创建成功。AUTO_DEPLOY_MAIN 仍 false，部署工作流的 Deploy main 实际 SKIPPED，本轮使用受控人工发布，不绕过测试。

本轮生产：由 main@809853f 的 Git archive 固定快照构建，源包 SHA-256 f0dccbdb2a04f4859daa53e4b15ce8e0a7bcfdc0181c22a8601e0da0aae6a797。服务器旧仓库 /root/AI-wardrobe-libre-closet 的脏文件未动；源码独立在 /root/ai-wardrobe-release-20261008-809853f/source。首次构建达到 1200 秒上限未形成候选，依赖安装及编译子阶段退出 0；旧本机 SSH 传输无最终返回，核对后只停止 PID68116，传输退出 1，远端总退出码未取回，不伪写 124 或构建通过。保留缓存按相同源码/配置受控重试，615.55 秒退出 0；最终候选/当前镜像均为 sha256:41baeb3e8e95ad3246ba6b93694dae069a61ec7e611b012be054272976ab5123，revision 标签匹配809853f。候选 better-sqlite3、sharp、编译后模型/开关及迁移检查通过，在线一致副本单项迁移演练通过，原表行哈希不变。

更正预检结论：实际 src/app.module.ts 的 onModuleInit 会调用 orm.getMigrator().up()，此前认为启动不迁移是漏查 AppModule。候选检查/副本演练均只运行独立助手，不启动正式应用或接触原库；正式启动在停机全卷与私有配置备份、显式允许的单项迁移之后进行，启动时无待迁移项。

正式停机备份 /root/ai-wardrobe-release-20261008-809853f/backup 已逐文件验证字节一致，SQLite integrity_check=ok、外键问题0，私有环境配置备份权限600且内容一致。只执行 Migration20261006000100：新增 nullable original_photo_id 及空整理任务表，全部原表行和原图片字节不变，311件衣物/386条文件/4个账号/4套搭配未变。仅追加四项已授权的 QWEN_IMAGE 配置，原私有 Key 和其他配置完整保留且与运行环境逐键一致，手动整理已开启。新容器 ai-wardrobe（87617e3efe32eb2bf24fcc504421da92196d7396fd0ed2b65bda2b9415b302cb）running；旧容器恢复性改名为 ai-wardrobe-rollback-20261008-809853f、停机保留，旧镜像2cd4f3d也加回滚标签。切换检查全流程上界29.576秒，不声称精确HTTP停机时间。

只读部署冒烟与随后复核均退出0：公网首页/分类/本人衣橱正常，旧衣物整理状态idle且缺原图不可整理，本人展示图字节与存储一致、no-store；无令牌401、另一主人403、旧版本和缺原图404。整理任务0，触发付费调用0，不把这些作为新 P6 用户真实验收。隔离手机容器/路由/本机夹具未改，不删除文件或清理镜像/验收环境。

小程序上传门禁：正式项目 E:/orca/Libre-Closet/youhua，AppID wxfd7f6fa52c4ed844，API_BASE_URL=https://aimatchwear.asia，版本1.0.10；客户端Codex、skill0.3.9、equal、已登录、tokenRequired=false。原 upload 返回 pending，taskId=confirmation_upload_f3c28fa7-cb52-47a2-ad13-37b34c6dd285。2026-10-08 用户原话“已确认”后，只查询此任务一次，实际退出码0，ok=true、status=success、detail=execution_success、result.success=true，上传总包169507字节。上传已成功，不再等待确认或重复上传；本次未核对或变更平台体验版/审核/正式发布状态，不声称手机已切到1.0.10。查询的cwd为E:/orca/Libre-Closet/youhua，完整PowerShell命令：

```powershell
& 'E:\Program Files (x86)\Tencent\微信web开发者工具\wechatide.cmd' -c Codex polling_task_result --task-id confirmation_upload_f3c28fa7-cb52-47a2-ad13-37b34c6dd285
exit $LASTEXITCODE
```

上传确认后的只读CI复核：纯文档提交1572d26089047699a14e8b12926eaee5a8d10c4f的后端37781865715、Playwright37781865678均completed / SUCCESS；部署工作流37781865632的Verify before deploy通过、Deploy main实际SKIPPED。该提交只有三份状态文档，不改变已部署809853f的产品代码；这些CI结果不作为新的P6验收。

本轮外部发布证据 E:/Caches/Temp/libre-closet-release-20261008-13039f31088945e99616e63b9fb51cfb/evidence：ci-green-and-release-preparation.json、build-retry.log/receipt、rehearsal.json、backup-verification.json、production-migration.json、deployment.json，以及本次miniapp-upload-confirmed.json。完整命令/退出码/失败及成功输出分开保存，不提交产物；冻结四文件哈希再次一致，既有 P5/P6 与规格缺口不回写。原待确认凭证保留，不回写旧输出。只同步当前三份发布状态文档，不写全局记忆、场面提醒或新验收里程碑。

TASK-01b～05b 已按顺序逐卡绿，各 a 卡保留准备阶段红证据：私有原图、一次抠图、固定五类候选预览、超时/退出/重启恢复不重生、明确采用只切 photo、所有当前出口同图及既有推荐只刷新照片。备份版本 3 和沙盒复制保留原图/当前图/候选/固定输入图，目标文件独立、源只读；版本 1/2 兼容，处理中快照不重放。手动换图保留可能仍被整理引用的旧字节。

返修后的 P5 Current：TEST-014～023 十组均退出 0，44 套/349 项完整回归、17 项页面事件、小程序结构、无产物编译及名称级三账通过；完整证据见归档 test.md#P5-CURRENT-P4-RETURN-20261007。既有 CLOSURE-1 原始双轴报告已取回：Standards、Spec 均 PASS，STD-B01/STD-B02（别名SPEC-B01/SPEC-B02）均 CLOSED，剩余配额1/2，P5关闭结果PASS。权威登记见归档 test.md#P5-CLOSURE-1-RECOVERED-20261008；此前称缺关闭报告是漏查已完成实例，现已纠正，不重开评审。归档前只读复核十项定义/原命令/已有结果和三账通过，没有改写原证据或重跑产品测试。

按后续授权做过真实模型样图与隔离手机测试：五类整体效果已获用户认可；1.0.9 已核对为微信体验版，未提交审核/正式发布。隔离手机后台为 https://aimatchwear.asia/_p6/image-20261008，独立目录 /root/libre-closet-p6-phone9-20261008，不替换原生产业务容器。它只提供 21、22 两件免费受控夹具，2026-10-09 10:49:07（北京时间）到期；到期不是自动清理，未授权停服或删除。

2026-10-08 用户在鸿蒙微信亲测反馈“全部都pass，没问题”：P6-06 快速连点、P6-07A 切后台返回、P6-07B 关闭微信扫码重开，用户结论均 PASS。服务端只读账本核对各一次成功模拟派发/候选下载，新增真实付费调用为 0；无逐项截图/录屏，不能补写为已收到。权威登记见归档 test.md#P6-CURRENT-PHONE-20261008。

2026-10-08 按用户“可以继续”完成 P6-14/15 免费隔离补测：源19件/45图实际备份恢复，V1/V2各追加1件旧图；管理员复制19件、2搭配、2今日穿搭到空沙盒。四种图片字节/引用及采用关系保留、目标独立、源/旧库/旧账本不变，92图片读回匹配、6次私有越权拒绝，16个接收端详情实际查看。独立本机后台3324、数据data-transfer10-20261008，旧3316不替换；未触及真实衣橱或手机1.0.9。文件选择/确认回调受控，不声称手机文件分享或真实鼠标确认已验；抠图/生成/付费均0。用户随后原话“认可”，两项登记用户 PASS（接受代理验收及边界，非亲手执行），见归档 test.md#P6-CURRENT-TRANSFER-20261008；原外部报告/结果保留确认前状态，不回写执行证据。用户再以“确认”结束整轮P6，结论PASS（约定范围），见 [整轮用户确认](docs/archive/2026-10-08-衣物手动-AI-整理与预览采用/test.md#P6-CURRENT-CLOSED-20261008)。首次状态GET提示仍为SPEC GAP，真实S3、首次微信登录全部分支、手机文件分享、真实鼠标确认及正式生产等未验项保留；不重评、现场修复、提交、合入、发布或清理临时环境。

本次收尾已记录 [本机驾驶舱里程碑](E:/Ai-coding/hook相关/cockpit-data/cards/2026/10/08/git-e588e1ff1994b630/20261008T171854+0800_codex_milestone_ddba97b9-e95.md)（verification_state=passed，仅本轮约定范围）；场面提醒在归档前已询问，未收到点头就不新增或改共用规则。归档当时只同步文档与逐个移动四份轮次 Markdown，未删除文件、修改产品源码、提交推送、正式发布或清理临时环境。之后的提交、推送与发布授权及实际进度见本节开头；临时环境清理仍未授权。

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

- 当前状态：衣物手动 AI 整理的 P5/P6 已按约定范围确认并冻结归档，无活跃 SPEC/PLAN/TASK/TEST。完整功能及最小规范/存储返修已提交推送、PR #19 已合入，main@809853f 的正式后台已备份、迁移、开启手动整理并上线，只读部署冒烟通过；不当作新的 P6 真实验收。正式配置1.0.10已上传成功，平台体验版/审核/正式发布尚未核对或变更；此前核对的1.0.9是隔离体验版。真人衣橱剩余补标已取消。
- 建议任务：
  - P5 双轴关闭报告已取回并登记，不再列为缺件，也不重新评审。
  - 本轮验收和归档已完成，不重跑/改写冻结历史；原 SPEC GAP 和未验项保留。后端部署及小程序1.0.10上传已完成，原确认任务终态success，无需再查询或重传。下一步先核对微信平台开发版本1.0.10，再由用户决定体验版切换或审核发布；未经确认不操作平台、不宣称正式发布，不清理临时环境。
- 继续文件：优先看 `PROJECT_STATE.md`、`HANDOFF.md`，本轮规格/计划/任务/验收在 `docs/archive/2026-10-08-衣物手动-AI-整理与预览采用/`。其它历史需要时定向读取 `docs/PROJECT_LOG.md`，不默认全文加载旧归档。
- 后端开发前必须看：`docs/backend-architecture-source-of-truth.md`。
- 小程序表单改动前必须知道：衣物表单的字段选择框由 `miniprogram/pages/garment-form/index.js` 里的 `fieldSelectorConfigs` 驱动（决定每个字段单选/多选、选项来自本地常量还是标签库）；`buildFieldGroups` 每次都从当前 `form` 值重建视图模型，所以 AI 回显、编辑回显、批量导入三条路径都能自动同步。改这里时**不要动提交格式**：单值字段是字符串，季节/风格/场景是「、」拼接串，后端靠 `GarmentService.normalizeTags` 拆数组。
- 风险提醒：不要丢 `.env`；不要提交本地微信开发者工具配置；旧的 `owner=null` 公共衣橱数据不会自动迁移到某个微信用户；服务器 GitHub 连接不稳定时不要误判为分支不存在；`.github/workflows/deploy-main.yml` 尚未具备本轮人工部署使用的 SQLite WAL 停机备份、候选验证和回滚门禁，`AUTO_DEPLOY_MAIN` 在单独加固验收前必须保持 `false`。SQLite 备份完整性检查必须在镜像 `/app` 下加载 `better-sqlite3`，不要把脚本挂在容器根目录。
