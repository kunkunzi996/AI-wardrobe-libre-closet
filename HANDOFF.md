# HANDOFF.md

> 当前交接更新时间：2026-10-08
> 本次范围：整轮P6已确认并归档；PR #19 的 9 文件规范返修 de923bb 已提交推送并通过远端 lint/回归，发布仍被主线旧 MinIO 镜像拉取问题阻塞，生产尚未改动。

## 当前入口：衣物手动 AI 整理与预览采用

### 当前状态

- 最新发布门禁：de923bbba9c75dc737832f4149ee48f8d71589e3 已推送。后端 CI 37772089955 构建/格式/lint/覆盖率回归/本地冒烟/本地负载通过，但 MinIO 步骤拉取 minio/minio:latest 被拒绝、退出 125；与旧主线 35678804056 同一故障，依赖步骤被跳过，完整 CI 未绿。独立 Playwright 37772096106 SUCCESS。PR #19 OPEN 未合入；等待用户另行允许仅修 CI 存储环境，不改产品及断言、不关闭检查。生产和测试容器 ID/镜像/启动时间均复核未变，本轮付费 0。
- 工作区：E:/orca/Libre-Closet/youhua；分支 feature/garment-image-normalization；施工固定点 d479aa7fa7b75f64afc6f092c029f4bc199311ed。完整功能提交 052dee1e4f9ddd0b577a96862f82d9c6a30aa06e 已推送；用户明确授权生产部署并认可预检后的备份、迁移、整理开关和正式小程序上传步骤。当前保留主线后续改动并进行发布验证，尚未正式上线；不重开既有评审/验收、不改冻结记录、不调用付费模型、不清理临时环境。
- 规范返修边界及本机验证：保留主线新版 README 和备案页脚；首次 CI lint 剩 32 错误，原始文本 47。用户后续“允许”只修 9 个载体，以 9235a0f5e0000df42aa530fc306bd6220f7fb2cd 为返修前固定点，业务、安全及断言保持不变。当前 9 文件及全量 TS lint 都为 0 错误，格式、44 套/350 项、17 页面场景、结构/无产物类型检查通过；同名状态一致、原断言及冻结四文件哈希未变，文件名过滤 262158 样本全部等价。独立进程排除了混用旧主线类型图的诊断误报，没有修改误报涉及文件。
- P5 回归：返修后的 manifest 十项、44 套/349 项、17 个页面事件及三账已通过，见归档 test.md#P5-CURRENT-P4-RETURN-20261007。既有 CLOSURE-1 两独立轴原报告已取回并登记：Standards / Spec 均 PASS、两项均 CLOSED、剩余配额1/2，见归档 test.md#P5-CLOSURE-1-RECOVERED-20261008。此前“缺关闭凭据”是主 Agent 漏查现有完成实例，已纠正，不再复评。
- 手机补测：用户鸿蒙微信亲测反馈“全部都pass，没问题”；P6-06、P6-07A、P6-07B 用户结论均 PASS。21/22 各一次成功模拟派发、一次候选下载，真实付费模型调用 0。没有逐项录屏/截图，手机可见行为依据用户确认。
- 五类真实模型整体效果已有用户认可，原凭证保留在本轮外部证据根目录。免费手机夹具不是新模型质量或真实供应商计费证明。
- P6-14/15已按用户许可实际执行：源19件/45图真实导出恢复，V1/V2各追加1件；管理员首次复制19件/2搭配/2今日穿搭到空目标。四种图片字节/引用与采用关系保留、源不变/目标独立，92图片读回、6次私有越权拒绝、16接收端详情逐页查看，抠图/生成/付费均0。用户随后原话“认可”，两项已登记用户 PASS（接受代理验收及边界，非亲手执行），见归档 test.md#P6-CURRENT-TRANSFER-20261008；文件选择/确认回调受控，未覆盖手机分享/真实鼠标确认。用户再以“确认”接受现有范围并关闭整轮P6，PASS（约定范围）；原首次状态GET提示SPEC GAP、真实S3、首次登录全部分支及正式生产等未验项仍保留。
- 四文件已按 spec/plan/task/test 顺序逐个归档至 docs/archive/2026-10-08-衣物手动-AI-整理与预览采用/；四个移动前后SHA-256一致、四个原路径均不存在，当前无活跃SPEC/PLAN/TASK/TEST。整轮权威结论为归档 test.md#P6-CURRENT-CLOSED-20261008；旧执行证据保持原样，未清理任何环境。

- 本机驾驶舱里程碑已保存：E:/Ai-coding/hook相关/cockpit-data/cards/2026/10/08/git-e588e1ff1994b630/20261008T171854+0800_codex_milestone_ddba97b9-e95.md；verification_state=passed，仅本轮获准验收范围。场面提醒已问未写，不默认获得修改共用规则的授权。

### 验收环境（勿与旧项目混用）

- 微信体验版 1.0.9；“G的智能试衣间”，AppID wxfd7f6fa52c4ed844；平台已核对体验版标记，未提交审核或正式发布。
- 隔离后台：https://aimatchwear.asia/_p6/image-20261008；服务端 /root/libre-closet-p6-phone9-20261008，独立数据，仅 21/22 两件夹具；原生产业务容器不替换。
- 手机项目：E:/Caches/Temp/libre-closet-p6-20261007-170937-63282e54/server9-20261008/miniapp。旧 snapshot 指向本地后台，不用于公司手机验收。
- 免费两次额度已用完，不自动重置、延长或再生成。入口 2026-10-09 10:49:07（北京时间）到期；到期不等于自动停容器或删除临时数据。
- 新免费保图环境独立于上述手机环境：本机127.0.0.1:3324（PID68672）、旧格式只读夹具3325（PID55332），仓库外data-transfer10-20261008及transfer10-miniapp；源A=1、恢复=3、复制=4，仅本机独立沙盒。旧3316仍在运行未替换；这些新端口不用于公司手机，不重置、重复导入/复制或停止删除。

### 下一步先读与门禁

1. PROJECT_STATE.md 当前入口。
2. 本轮四文件在 docs/archive/2026-10-08-衣物手动-AI-整理与预览采用/；只在复核本轮结果时定向读取，不作为下一轮活跃文档。
3. 归档 test.md#P5-CLOSURE-1-RECOVERED-20261008：已完成双轴原报告的取证登记，不再次调用 kun-review/code-review。
4. 归档 test.md#P6-CURRENT-CLOSED-20261008：整轮P6已明确确认；不重复询问、导入、复制、收费或改写历史。最小 lint 返修已提交推送并获远端验证，但主线旧 MinIO 拉取故障已重现，下一步另行取得 CI 存储环境修复权限，不强行合入或跳过测试。生产新备份/候选构建/迁移/整理开关/正式小程序上传均未执行，生产及隔离环境原样保留；临时环境清理仍需另行确认。

- 本轮证据根目录：E:/Caches/Temp/libre-closet-p6-20261007-170937-63282e54；此前最新报告 evidence/p6-supplement7-report-standalone.html、结果 evidence/p6-supplement7-results.json。旧报告手机待验子项已由归档 test.md#P6-CURRENT-PHONE-20261008 三条登记补齐，原文件不回写。
- 本次发布证据根目录：E:/Caches/Temp/libre-closet-release-20261008-13039f31088945e99616e63b9fb51cfb；evidence/integrated.jest.json 是本次 350 项结果，scripts/check-git-format.cjs 和 check-git-lint.cjs 为只读 Git 文本诊断，不修改源码。发布阻塞结果见 evidence/release-blocked.json；与冻结 P5/P6 分开保存，不提交产物。
- 最新保图报告 evidence/p6-transfer10-report-final-standalone.html、结果p6-transfer10-results-final.json，171条ui命令/退出码/原输出以及工具失败均保留；不以不完整URL或旧公开图MIME断言的验收脚本错误判产品FAIL。原图预览遮挡截图已保留并一次刷新后重取16页，报告只用无遮挡详情。原报告/结果保留确认前状态；最新用户结论在归档 test.md 的两项认可与整轮确认节，不回写原执行证据。外部 p6-close-archive-journal.json 保留归档前四文件哈希及精确路径，不提交测试产物。
- 只允许已定位 9 文件的最小 lint 返修和进度登记，不扩展功能、不改提示词、测试断言或冻结 TEST 定义，不自动修 SPEC GAP，不收费或重置夹具。检查通过后按既有授权中文提交、推送、主线合入、受控生产部署和正式小程序上传；不把上传开发版或体验版冒充平台正式发布。生产备份/候选验证/迁移/回滚证据须齐备。
- 禁止批量删除、清空真人衣橱、清理 Docker 缓存或写全局记忆。需要停临时服务、撤销测试路由或删除文件时，先确认精确目标和权限。

## 上一轮交接快照（2026-08-22，原文保留，不是本轮状态）

> 生成时间：2026-08-22
> 生成原因：废除库存状态已部署并用户确认启用，洁癖门收尾

## 1. 本轮在干什么（一句话）
- 小程序不再有待洗/收纳等库存状态，衣服在衣橱里就是能穿。

## 2. 已完成 / 未完成
- 已完成：接口/备份/Excel 去掉状态字段；网页状态下拉去掉；生产 `b356919` 已部署；用户 P6 01–05、07 PASS 并确认启用。
- 未完成：体验版仍 `1.0.1` 未上传。
- 已取消：困困子剩余件和老婆真人衣橱不再补标（2026-08-26）。
- 验收状态：P5 PASS；P6 用户已确认启用。P6-06/08 未执行。

## 3. 本轮碰过的文件
- 功能：`src/wardrobe/miniapp-*.ts`、`outfit-generator`、`outfit-ai`、`garment.service`、网页 `views/wardrobe/*`、管理员 Excel
- 状态：`PROJECT_STATE.md`、`docs/PROJECT_LOG.md`、`HANDOFF.md`、ADR 0005/0006

## 4. 下一轮必须先读
- PROJECT_STATE.md
- HANDOFF.md
- docs/adr/0006-no-garment-inventory-status.md
- docs/backend-architecture-source-of-truth.md

## 5. 下一轮禁止事项
- 不要 drop `garment.status` 列（本轮明确保留）
- 不要清空真实衣橱
- 不要把困困子或老婆标成验收沙盒
- 不要再跑困困子剩余件或老婆真人衣橱补标
- 不要走 GitHub Actions 自动部署（`AUTO_DEPLOY_MAIN=false`）
- 不要 `docker builder prune`
- 不要把备份检查脚本挂在容器根目录（必须 `/app`）
- 切回上一业务版用 `rollback-f12563b-live-20260822`
- 不要用桌面旧项目 `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` 预览
- 不要默认全文读取 `docs/archive/**`
- 验生产接口时不要拿部署前的旧网络记录当证据

---

## 待确认
- 无

## 待拍板（最多 3 条）
- 是否上传新体验版（当前仍 `1.0.1`）
