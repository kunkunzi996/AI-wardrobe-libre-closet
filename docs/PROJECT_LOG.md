# Project Log

This document is intended for the maintaining team to use to document decisions. This may be a medium for documenting, reviewing, and approving as a means of expressing consensus on project business decisions where the direct output is not necessarily code or assets that may be otherwise checked in and version controlled.

> **Example Entry (Date in ISO8601 format, Year-Month-Day):**
>
> The team agrees to _BLANK_ project business decision(s)...

## 2026-08-20

衣橱复制到验收沙盒已完成生产部署和用户验收。功能提交 `7e406cb` / `f12563b`，生产以服务器本地构建部署为 `ai-wardrobe:candidate-f12563b`。用户在库存页把第三只微信（用户 ID 4）标成验收沙盒，从老婆号（ID 3，143 件）确认复制到该沙盒；沙盒得到独立副本（衣物 ID 238～380），AI 搭配引用的是沙盒新 ID（如连衣裙 380 / 外套 365），对应源 ID 为 235 / 219。用户确认 ID 3 内容未少。非正式启用；整橱覆盖路径本轮未再验。2026-08-20 洁癖门已将本轮四文件冻结到 `docs/archive/2026-08-20-衣橱复制到验收沙盒/`。

## 2026-08-19

P6 补验窗口关闭。用户确认剩余未验项不再补验：P6-08 / P6-12 坐标精度维持 SPEC GAP；P6-09 空衣橱、P6-10 待洗提醒、P6-11 网页端、P6-12 双账号维持本轮不验。未改原十三条结论，未宣布正式启用，体验版仍 `1.0.1`。详见 `docs/p6-miniapp-outfit-acceptance-2026-08-18.md`。

## 2026-08-18

小程序结构化标签穿搭与天气已合入 `main` 并部署生产 `52d124c`。P6 可验项已收口：用户拍板无 FAIL；P6-08 穿着感词与 P6-12 坐标精度为 SPEC GAP；待洗 / 空衣橱 / 双账号 / 网页端本轮不验。非正式启用（剩 11 件未补标）。结论原文：`docs/p6-miniapp-outfit-acceptance-2026-08-18.md`。

## 2026-06-16

AI 衣橱 MVP 阶段完成并进入体验版验证期。当前 `main` 已包含原生小程序衣橱首页、单件 AI 识别上传、核心衣物搭配、今日穿搭、批量导入/导出/导入备份、批量删除等已验收能力。

阶段收尾文档：

- `PROJECT_STATE.md`
- `docs/MVP_COMPLETION_SUMMARY.md`

后续开发应优先从体验版用户反馈和关键稳定性问题开始，不建议在未收集反馈前继续扩展大功能。

## 2026-06-18

小程序微信登录和按用户隔离已完成并通过体验版验收。最新已验收提交：

```text
8425f50 feat: add WeChat miniapp login isolation
```

验收结论：

- 小程序原生页通过 `wx.login` 登录，后端按微信 `openid` 绑定 `User`。
- 衣橱、备份导入导出、AI 搭配推荐、今日穿搭按当前微信用户隔离。
- 双微信号体验版验证通过：你和你老婆可以分别管理各自衣橱，数据不混用。

后续重点：

- 保持 `.env` 中 `WECHAT_MINIAPP_APP_ID`、`WECHAT_MINIAPP_APP_SECRET`、`ACCESS_TOKEN_SECRET` 不丢失、不提交。
- 继续收集真实试用反馈，优先处理关键 Bug 和体验阻塞。
- 旧的 `owner=null` 公共衣橱数据不会自动迁移到某个微信用户，如需迁移应单独做数据迁移任务。

## 2026-07-19 存量衣物 AI 补标签施工与开发记录

> 2026-08-06 从 `PROJECT_STATE.md` 归档至此，原文保留。后续进展：PR `#1` 已合并进 `main`，独立工作区 `Libre-Closet-backfill-garment-tags` 已移除；数据库备份已完成；首次生产试点实际跑在困困子账号（用户 ID 1）而非老婆账号，共 3 件、新增 68 个标签。

### 施工计划记录

- 已完成“存量衣物 AI 补标签”施工计划 V2 评审修订，文件为：计划/补齐库存衣物标签-施工计划-v2.md。
- 本轮只修改了施工规格，没有创建分支、没有修改业务代码、没有迁移数据库、没有部署。
- V2 已明确：处理标记的真实含义、镜像字段合并规则、批次超时与并发锁、失败回滚、迁移测试、数据库备份和人工试点。
- 下一步只有在用户确认自动批量写入例外、目标用户范围和 feature/backfill-garment-tags 分支后，才能进入开工门禁。

### 开发与回归记录

- 用户已确认：使用 `feature/backfill-garment-tags` 独立工作区，管理员自动追加缺失标签是明确例外，当前正式试点仅处理老婆账号。
- 本轮新增 `tags_backfilled_at` SQLite/PostgreSQL 迁移、管理员批处理接口和管理员库存页操作入口；普通新增/编辑衣物仍保持 AI 结果人工确认。
- 红线：不覆盖已有标量或数组、不修改 `garment.category`、AI fallback/异常不写处理标记、每件衣物独立事务落库。
- 已通过本地回归：管理员与迁移测试 3 组共 34 项、两个小程序 JS 语法检查、小程序结构校验、项目构建和 `git diff --check`；局部 ESLint 无 error，保留项目原有复杂度与 mock 警告。
- 功能提交 `248dc5a` 和历史格式修复提交 `a4fdf25` 均已推送；尚未部署，也没有运行任何正式补标批次。部署前必须先完成数据库备份，并先对老婆账号执行 `limit=1` 试点。
- 当前流水线运行状态：手动挡，`PR_CREATED`；工作区为 `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet-backfill-garment-tags`，分支为 `feature/backfill-garment-tags`，PR 为 `#1`。GitHub Playwright 检查已通过；`a4fdf25` 已修复 13 个历史格式问题，`ab03546` 已修复 65 个历史 ESLint 错误，GitHub Linux/Node 22 上的构建、格式、lint 和覆盖率测试均已通过。后端流程的本地端到端冒烟测试已固定为 `zh-CN`；最新 CI 已证明中文入口都正常，剩余失败只来自 CI 临时 `APP_NAME` 与硬编码品牌断言不一致，现已移除重复品牌断言，待推送后重新验证。数据库备份、部署后迁移日志确认和老婆账号 1 件人工试点均尚未开始。

## 2026-08-06 已验收功能明细归档

> 从 `PROJECT_STATE.md` 的「当前状态」章节归档至此，原文逐字保留。归档原因：该章节已累积 45 行历史叙事，与「已完成能力」清单重复，影响状态文档的可读性。`PROJECT_STATE.md` 保留精简版当前状态，功能细节以本节为准。

衣物表单标签与字段折叠选择框改版已完成开发和微信开发者工具验收，并已合入 `main`（`a5c1fdd`）。本轮把「添加/编辑衣物」页的标签区从平铺 chips 改为折叠选择框：5 组结构化标签（天气 / 色彩感觉 / 穿着感 / 长度 / 版型）和 8 个老字段（分类 / 颜色 / 季节 / 细分 / 材质 / 厚薄 / 风格标签 / 场景标签）现在统一为同一种「浅灰圆角框 + 点开才显示子标签」的交互，页面不再使用微信原生 `picker` 和自由输入框。单选字段为分类（必填不可清空）、颜色、细分、材质、厚薄；多选字段为季节、风格标签、场景标签。细分 / 材质 / 厚薄 / 风格 / 场景的可选项直接取自后台标签库白名单（复用已有 `GET /api/miniapp/garments/taxonomy`），AI 识别出的库外值会追加为可取消的选中项，不丢数据。

**该轮为纯小程序前端改动，后端零改动、无数据库迁移、无需部署服务器**：提交给后端的字段名和格式与改版前完全一致（单值字段仍是字符串，季节 / 风格 / 场景仍是「、」拼接串，由后端 `GarmentService.normalizeTags` 按 `/[,，、]/` 拆成数组）。已通过 Codex 代码审查（无高 / 中优先级问题）、`npm run test:miniapp`、`npm run build` 和微信开发者工具验收。同步更新了 `scripts/validate-miniapp-shell.cjs` 的结构校验断言（旧 picker 事件名断言已替换为折叠选择框断言），并清理了 `.picker-value` 遗留死样式。**尚未上传体验版**（需要时在微信开发者工具点「上传」即可，无需动服务器。）

AI 衣橱 MVP 版本已完成并完成主要功能验收。当前主分支 `main` 已包含本阶段全部已验收功能。小程序微信登录和按微信用户隔离已完成部署后体验版验收：你和你老婆两个微信号可以管理各自衣橱，互相不混数据。Qwen 3.7 衣物图片识别升级已完成服务器部署和微信开发者工具验收。重复衣物入库提醒功能已完成验收并合入主分支，`main` 最新版本已同步到服务器并验收成功。重复判断结构化细化 V2 / V2.1 也已完成服务器部署和微信开发者工具体验版验收。`查看类似衣服` 小功能现已完成服务器部署和微信开发者工具体验版验收。AI 搭配反馈导出、反馈衣物 ID 对照、管理员用户库存导出、库存照片嵌入 Excel 均已完成服务器部署和微信开发者工具验收。

衣物结构化标签库已完成生产部署和微信开发者工具验收：后台新增从“季节”到“版型”的 12 组固定标签（不含“反馈”），衣物新增可选 `taxonomy_tags` JSON 字段；Qwen 识图提示词只能从后台白名单选择，模型返回后还会由代码二次过滤，库外标签不会保存。小程序上传页按标签组展示 AI 结果，保存后衣物详情可查看标签；添加/编辑表单已补齐“天气、色彩感觉、穿着感、长度、版型”5 组可点选标签，并通过后端 `GET /api/miniapp/garments/taxonomy` 读取同一套白名单。相关 4 个测试套件共 37 项、`npm run test:miniapp`、SQLite 迁移冒烟测试和 `npm run build` 均通过；生产接口已验证返回 12 组完整标签，小程序体验版 `1.0.1` 已上传成功。

重复衣物入库提醒已完成：单件新增和批量导入识图后，如果与当前用户库存中的衣物相似，会弹窗提示“可能已经入库”，提醒用户避免重复保存。该功能已通过本地单测、构建、小程序结构校验和微信开发者工具体验版验收。

重复判断结构化细化 V2 / V2.1 已完成：在原有重复提醒基础上，新增 `pocketPresence`、`pocketPosition`、`chestMarkPresence`、`chestMarkType`、`chestMarkPosition`、`chestMarkText` 六个结构化字段，用来区分“同色同版型但胸前细节不同”的衣物，避免把“黑色短袖 + 小字母”和“黑色短袖 + 胸前口袋标签”误判成重复。V2.1 进一步补了 boolean 归一化，以及“共同没有口袋/胸标”不再作为强相似证据。

`查看类似衣服` 小功能已完成：遇到被判断为相似的衣服时，表单页会显示“查看类似衣服”，用户点击后可以把本次新增衣服和库存里的相似衣服放在一起对比，再决定是否继续录入。该功能已通过本地构建、小程序结构校验、服务器部署和微信开发者工具体验版验收。

前端换肤（方案 B 柔彩卡片）已完成：衣橱 / 添加编辑 / 详情 / AI 搭配 / 今日穿搭五个页面统一改成「柔和紫 + 5 种柔彩分类色 + Notion 醒目黄」设计系统，新增自定义底部标签栏（衣橱 / 搭配 / 今日），衣物卡按分类自动配色，并补了 `miniprogram/DESIGN.md` 设计规范。该轮为**纯前端样式 / 导航改动，不涉及后端、数据模型或 API**，已在微信开发者工具验收通过并合入 `main`；尚未上传体验版（需要时再 upload）。

手动添加「今日穿搭」功能已完成验收并合入 `main`：今日页新增「添加穿搭」入口；新增小程序 `pages/add-outfit` 页面，支持必选全身照、填写理由/场合/评分/反馈、可选关联衣柜单品；后端 `Outfit` 新增整体照片关联和 sqlite/postgres 迁移；`/api/miniapp/daily-outfits` 改为 multipart 上传原图保存，不走衣物抠图；AI 推荐保存入口也会先要求选择/拍摄一张穿搭照片。该功能已通过本地单测、构建、小程序结构校验和用户确认的微信开发者工具端到端验收。

今日穿搭删除功能已完成服务器部署和微信开发者工具验收：今日页长按穿搭卡片可弹出删除确认；后端新增 `DELETE /api/miniapp/daily-outfits/:id`，删除前按当前微信用户做 owner 校验；删除日历记录后会统计搭配引用数，只有未被其他日期引用时才连带清理搭配和照片。该功能已通过本地 TypeScript 检查、控制器单测、小程序结构校验、服务器 Docker 重建和用户确认的微信开发者工具删除验收。

今日穿搭修改功能已完成服务器部署和微信开发者工具验收：今日页长按穿搭卡片可选择“修改”，进入 `pages/edit-outfit` 后可编辑理由、场合、评分、反馈、关联衣物，并可重拍/重选全身照。后端新增详情接口 `GET /api/miniapp/daily-outfits/:id/detail` 和修改接口 `POST/PATCH /api/miniapp/daily-outfits/:id`；部署联调中已修复小程序 `PATCH` 兼容问题和 Nest 同方法多 HTTP 装饰器导致的 `Cannot POST` 路由问题。该功能已通过本地控制器单测、项目构建、服务器 Docker 重建和用户确认的微信开发者工具修改保存验收。

AI 搭配反馈收集功能已完成服务器部署和微信开发者工具验收：AI 搭配页每套推荐方案下方新增反馈区，用户可三选一评价（搭配得不错 / 一般 / 不喜欢）并填写文字理由（选填，最多 500 字）。提交后存入新数据表 `outfit_feedback`，快照包含评价、文字、当时的需求语句、方案标题/理由、衣物 id 列表、推荐来源（ai/fallback）、核心衣物 id 和归属用户，后端另提供 `GET /api/miniapp/outfit-feedback/export` 按当前用户导出全部反馈用于后期分析。新增 sqlite/postgres 迁移只建新表，不改旧表。已通过本地控制器单测、`npm run test:miniapp`、`npm run build`、建表 SQL 临时库实测和部署后导出验收。

反馈数据导出 Excel 已完成服务器部署和微信开发者工具验收：「我的」页面菜单新增「导出反馈数据」入口，小程序经 `wx.downloadFile` + `wx.openDocument` 下载并打开真实 `.xlsx` 文件，可转发保存用于分析。后端在反馈 Controller 新增 `GET /api/miniapp/outfit-feedback/export.xlsx`，用新依赖 `exceljs` 生成表格，并在原有“衣物ID列表”基础上补充“核心衣物对照”和“衣物ID对照”，方便看懂数字 ID 对应哪件衣服；下载响应模式与衣橱备份导出一致，数据按当前微信用户隔离。已通过本地控制器单测、`npm run test:miniapp`、`npm run build` 和部署后导出验收。

管理员库存导出已完成服务器部署和微信开发者工具验收：新增 `GET /api/miniapp/admin/users`、`GET /api/miniapp/admin/users/:id/garments`、`GET /api/miniapp/admin/users/:id/garments/export.xlsx`，管理员可在小程序「我的」页进入「管理员库存导出」，查看用户列表并导出某位用户的当前库存 Excel，表格包含衣物 ID、照片、名称、分类、颜色、状态、标签、备注等对照信息。管理员身份不新增数据库角色表，使用生产环境变量 `MINIAPP_ADMIN_USER_IDS` 或 `MINIAPP_ADMIN_WECHAT_OPEN_IDS` 配置白名单；未配置时入口不显示、接口拒绝访问。已通过本地管理员权限/导出单测、`npm run test:miniapp`、`npm run build`、服务器部署和用户确认的微信开发者工具导出验收。

Stitch「我的」页面小程序落地已完成本地开发：新增 `miniprogram/pages/profile` 页面，并把底部自定义标签栏扩展为「衣橱 / 搭配 / 今日 / 我的」。页面按 Stitch HTML 的“个人资料 + 衣橱统计 + 入口菜单”结构实现，统计数字读取当前用户衣橱真实数据。本地已通过 `npm run test:miniapp` 和 `npm run build`；尚需在微信开发者工具里做视觉和 tab 跳转验收。

## 2026-08-11 AI 客观标签白名单与日志安全收口

- AI 补标改为使用专用标签白名单，保留历史完整标签库供人工选择；版型仅表示 A 字、直筒、H 型等客观轮廓，紧身、修身、合身、宽松和舒适度等穿着体验不允许 AI 自动写入。
- 生产真实试点仅新增处理 1 件衣物（`#77 短裤`），版型为“廓形”，结构化标签不含 `wearingFeel`；加上此前 3 件，困困子账号共完成 4 件，剩余 11 件。页面结果、生产数据库和管理员库存 Excel 三层核对一致。
- 请求日志已对 Authorization、Cookie、Proxy-Authorization 和 Set-Cookie 做统一脱敏。修复通过 PR `#4` 合入 `main`，生产部署业务基线为 `4bc13bcd`，镜像为 `sha256:c0a6043b...`。
- 部署前备份 `/root/ai-wardrobe-backup-20260811T-final-codex` 的 SQLite WAL、`quick_check`、`integrity_check` 和三个数据库文件哈希均通过；上线后数据库仍有 168 件衣物，公网首页、taxonomy、garments 均为 200。
- 生产 `ACCESS_TOKEN_SECRET` 已原子轮换，其他环境配置未变，新容器已确认加载新密钥。Docker 日志与持久 `app.log` 在轮换前后两次 synthetic Bearer 哨兵测试中原文命中均为 0、`[Redacted]` 均命中。
- 两个包含旧密钥环境快照的 stopped 容器已按用户授权逐个删除；rollback 镜像、生产备份和构建/诊断临时文件继续保留。
