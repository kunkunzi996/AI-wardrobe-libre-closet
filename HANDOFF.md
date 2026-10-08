# HANDOFF.md

> 当前交接更新时间：2026-10-08
> 本次范围：整轮P6已获用户按约定范围确认并完成四文件归档；未提交、推送或正式发布。

## 当前入口：衣物手动 AI 整理与预览采用

### 当前状态

- 工作区：E:/orca/Libre-Closet/youhua；分支 feature/garment-image-normalization；HEAD/施工固定点 d479aa7fa7b75f64afc6f092c029f4bc199311ed。已有功能改动未提交、推送或正式上线。
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
4. 归档 test.md#P6-CURRENT-CLOSED-20261008：整轮P6已明确确认；不重复询问、导入、复制、收费或改写历史。下一步等待完整功能中文提交的独立授权，推送、合入、正式发布和临时环境清理分别确认。

- 本轮证据根目录：E:/Caches/Temp/libre-closet-p6-20261007-170937-63282e54；此前最新报告 evidence/p6-supplement7-report-standalone.html、结果 evidence/p6-supplement7-results.json。旧报告手机待验子项已由归档 test.md#P6-CURRENT-PHONE-20261008 三条登记补齐，原文件不回写。
- 最新保图报告 evidence/p6-transfer10-report-final-standalone.html、结果p6-transfer10-results-final.json，171条ui命令/退出码/原输出以及工具失败均保留；不以不完整URL或旧公开图MIME断言的验收脚本错误判产品FAIL。原图预览遮挡截图已保留并一次刷新后重取16页，报告只用无遮挡详情。原报告/结果保留确认前状态；最新用户结论在归档 test.md 的两项认可与整轮确认节，不回写原执行证据。外部 p6-close-archive-journal.json 保留归档前四文件哈希及精确路径，不提交测试产物。
- 不改产品代码、提示词或 TEST 定义；不自动修 SPEC GAP；不收费、重置夹具、暂存、提交、推送、合入或发布。完整功能提交需另行授权，Commit Message 用中文。
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
