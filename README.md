# AI穿搭衣橱

自用的 AI 搭配衣橱。仓库是 [kunkunzi996/AI-wardrobe-libre-closet](https://github.com/kunkunzi996/AI-wardrobe-libre-closet)。界面显示名来自 `APP_NAME`，当前为「AI穿搭衣橱」；微信小程序导航标题是「AI 衣橱」。

## 小程序衣物 AI 整理（已验收，正式后台已部署，1.0.10 体验版已就绪，未公开发布）

新上传保留私有原图，默认图沿用既有一次抠图。详情手动生成一张候选，先预览、不自动换图；支持退出恢复与超时只查原次。明确采用只换展示图引用、不删原图/旧图，不改衣物资料；衣橱、重复候选、推荐、今日穿搭统一当前图版本，已有推荐返回只刷新照片。备份及沙盒复制已接通图片保留。历史无原图衣物及鞋包配饰等不支持整理。普通保存、查看不生成。

| 服务端配置 | 默认值 / 用途 |
|---|---|
| QWEN_IMAGE_ENABLED | false；必须显式开启才允许整理 |
| QWEN_API_KEY | 沿用现有服务端 Key，不能放小程序或日志 |
| QWEN_IMAGE_MODEL | 只允许 qwen-image-3.0-pro |
| QWEN_IMAGE_API_URL | https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation |
| QWEN_IMAGE_TIMEOUT_MS | 240000 毫秒 |

固定五类提示词版本 20261006-v1，生成参数 n=1、1024*1024、seed=701、prompt_extend=false、watermark=false。POST 只受理，Worker 先落盘派发状态再调用模型；候选落盘后才能 ready。明确失败与结果未知分开，未知不能声称未扣费或自动重新生成。私有图经主人及版本校验、带 Bearer 下载，公开 file/nobg/watermark 不可绕路；S3 真实桶裸读权限仍须单独验收。

此前已按授权部署独立的免费手机验收后台并上传 1.0.9 体验版，当时不替换生产业务或正式发布。P5 回归及既有双轴关闭评审通过；用户于 2026-10-08 确认按现有验收范围关闭整轮 P6，受控异常、真实 S3/首次登录全部分支/手机文件分享等覆盖限制及原规格缺口继续保留。冻结记录见 [整轮验收结论](docs/archive/2026-10-08-衣物手动-AI-整理与预览采用/test.md#P6-CURRENT-CLOSED-20261008) 和 [项目当前状态](PROJECT_STATE.md)。

P4 自动化阶段仅使用内存库与假端口；后续真实模型样图、隔离手机和体验版验收均另获许可，不把它们冒充生产业务发布。完整施工与验收流水已冻结在 docs/archive/2026-10-08-衣物手动-AI-整理与预览采用/ 的 task.md、test.md；当前没有活跃的 SPEC/PLAN/TASK/TEST。旧 MinIO 镜像问题按用户许可最小修复为固定官方源码编译，全部原测试保留；70e2012 功能分支及 main 合并版 809853f 的完整后端 CI、独立 Playwright 均成功（44 套/350 项，含本地和对象存储冒烟/负载）。PR #19 已合入。

2026-10-08 按独立发布授权，将 main@809853f874aaed47da805a43b099922eeb65aa40 的固定源码快照部署到正式后台 https://aimatchwear.asia，镜像 sha256:41baeb3e8e95ad3246ba6b93694dae069a61ec7e611b012be054272976ab5123，手动整理开关已开启。候选原生模块检查、数据库副本演练、正式停机全卷/私有配置备份、单项 Migration20261006000100 和只读部署冒烟均通过；311 件衣物、386 条文件记录及全部原图片字节保持不变。本轮不执行付费生成，不把部署冒烟代替 P6。旧业务容器 ai-wardrobe-rollback-20261008-809853f 与备份 /root/ai-wardrobe-release-20261008-809853f/backup 保留，隔离验收环境未动，自动部署仍为 false。

正式配置小程序 1.0.10 已上传成功：用户回复“已确认”后，仅查询原任务 confirmation_upload_f3c28fa7-cb52-47a2-ad13-37b34c6dd285 一次，实际终态 success / execution_success，未重复上传。此包指向正式后台 https://aimatchwear.asia。2026-10-08 用户随后“继续吧”，授权继续设为体验版；通过 Orca 内置浏览器刷新平台后，AppID wxfd7f6fa52c4ed844、版本1.0.10、备注“衣物手动AI整理与预览采用；正式后台main809853f”及已有“体验版”标记均匹配，无需重复切换。体验二维码已取得，入口pages/wardrobe/index，平台提示10月15日前有效；图片及命令凭证在本轮外部发布证据目录，不提交二维码产物。平台“线上版本”仍为“尚未提交线上版本”，本次没有提交审核或公开发布，也不冒充用户已在手机验收生产版本。此前1.0.9是隔离验收版，不再作为当前体验版使用入口。历史无原图衣物保持不可整理，不能通过迁移补造原图。

本轮从 main 的固定快照构建，不在服务器旧脏仓库拉取或开发。部署已完成，无需再次拉取或重复切换。可复制以下只读复核命令（本机已配置 ai-wardrobe SSH 别名）：

```powershell
ssh ai-wardrobe 'python3 -X utf8 /root/ai-wardrobe-release-20261008-809853f/helpers/release-control.py verify'
```

新备份版本 3 保留原图、当前图、候选及固定输入图，重复文件只存一份；版本 1/2 仍能导入，没有原图就保持为空。导入或沙盒复制只存原字节、不再抠图或生成；目标文件独立归目标主人，处理中快照恢复为“结果待确认”，不重放请求。供应商请求信息、结果地址及凭证不进入备份。声明的图片引用缺失会在写入前拒绝整个包。

服务重启时：queued 才能首次派发，processing 转为 uncertain，绝不重发生成 POST；已持久化的结果地址只恢复 GET 下载。明确 failed 后用户可手动再试，客户端 attemptKey 采用递增的时间前缀（base36 时间_随机串）；新次必须比当前次更新，旧 key 永远只查当前次，避免保留历史表也能拒绝重放。页面隐藏/关闭停止轮询并忽略晚到结果，后台任务继续。

中文文案里的产品说明是：记录衣物、管理衣橱、生成穿搭方案，并把每天真实穿着沉淀成可改进的搭配数据。标语是「先把衣橱管清楚，再让 AI 帮你搭配。」出处：`src/i18n/zh/lang.json`。

当前给衣橱主人用的产品是微信小程序。网页衣橱不再作为使用入口。见 `docs/adr/0005-miniapp-is-the-only-user-product.md` 与 `CONTEXT.md`。

文档中的公网地址是 [https://aimatchwear.asia](https://aimatchwear.asia)。小程序请求也指向这个域名（`miniprogram/utils/api.js`）。

当前事实以 `PROJECT_STATE.md` 为准。领域用语见 `CONTEXT.md`。上一轮交接记录在 `HANDOFF.md`。

## 和上游的关系

本仓库派生自 [Lazztech / Libre Closet](https://github.com/lazztech/libre-closet)（[Lazztech LLC](https://lazz.tech/about)）。`package.json` 的包名仍是 `libre-closet`，作者字段仍是 Lazztech LLC。许可证仍是 GNU AGPL-3.0。

本仓库的产品、部署和改动以这里的代码和文档为准。上游的发行说明、讨论区、GHCR / Docker Hub 拉取数不描述本仓库。

## 相对上游已写进仓库的差异

- 用户入口是微信小程序：登录、衣橱、AI 搭配、今日穿搭、我的。见 `miniprogram/app.json` 与 `PROJECT_STATE.md`。
- 默认应用名是「AI穿搭衣橱」（`.env`、`src/app.module.ts`、`src/i18n/zh/lang.json`）。
- 公网域名是 `https://aimatchwear.asia`。首页页脚有备案号，见下文。
- 微信登录按 `openid` 隔离衣橱。识图走通义千问，抠图走阿里云，天气走腾讯位置服务。生产密钥在仓库外，不在被跟踪的 `.env` 里。
- 穿搭使用结构化标签。没有指定核心衣物时，先筛候选衣橱再组套。AI 不可用或交回 0 套时，不再用本地规则出方案。见 `docs/adr/0007-no-default-core-filter-first.md`、`docs/adr/0008-no-local-outfit-fallback.md`。
- 小程序不再使用待洗、收纳等库存状态。数据库 `status` 列保留。见 `docs/adr/0006-no-garment-inventory-status.md`。
- 管理员可以把衣橱复制到验收沙盒。见 `docs/adr/0004-admin-full-wardrobe-copy.md`。
- 生产镜像在服务器上构建，标签是 `ai-wardrobe`，容器名是 `ai-wardrobe`。部署说明见 `PROJECT_STATE.md` 与 `docs/github-actions-auto-deploy.md`。
- 中文产品用语集中在 `src/i18n/zh/lang.json` 和 `CONTEXT.md`。

## 近期改动

这些都已经在 `main` 的提交记录里：

- **2026-09-07**：公网首页页脚增加备案号「粤ICP备2026075065号」，链接 [beian.miit.gov.cn](https://beian.miit.gov.cn)。提交 `6828c10`（PR #17）。页脚模板在 `views/index.hbs`。`PROJECT_STATE.md` 里写明的最近一次生产业务基线仍是 `b356919`（2026-08-21，服务器本地构建）。该文件没有记录这次页脚是否已经换到线上容器。
- **2026-08-26**：取消困困子剩余未补标衣物和老婆真人衣橱的补标待办。沙盒全量补标结果保留。提交 `d479aa7`。
- **2026-08-23**：清理过期架构说明、原版设计、P6 验收文档，以及已完成的旧施工计划。PR #13、#15。
- **2026-08-22**：废除衣物库存状态已合入 `main`（`b356919`）。`PROJECT_STATE.md` 记录该版本已在生产部署，并由用户确认启用。

## 本地运行

Node 版本见 `.nvmrc`（`v22.20.0`）。`package.json` 的 `engines` 要求 `22.x`。配置会先读 `.env.local`，再读 `.env`（`src/app.module.ts`）。`.env.*` 已被 `.gitignore` 忽略。仓库里的 `.env` 只有 `APP_NAME` 和一对 VAPID 占位，不要把微信、通义千问、阿里云、腾讯地图等真实密钥写进被 Git 跟踪的文件。

```bash
nvm install && nvm use
npm install
cp .env .env.local
npm run start:dev
```

开发服务起来后打开 [http://localhost:3000](http://localhost:3000)。

生产进程需要先构建：

```bash
npm run build
npm run start:prod
```

常用检查：

```bash
npm test
npm run test:miniapp
npm run build
```

## 部署

生产步骤写在：

- `PROJECT_STATE.md` 的「生产服务器」和「标准服务器同步流程」
- `docs/github-actions-auto-deploy.md`

文档里的部署事实：

- 服务器项目目录：`/root/AI-wardrobe-libre-closet`
- 容器 `ai-wardrobe`，端口 `127.0.0.1:3000:3000`，数据卷 `ai_wardrobe_data:/app/data`
- 真实环境变量在仓库外的 `/root/ai-wardrobe.env`（文档要求权限 `600`）
- 自 2026-08-06 起，仓库变量 `AUTO_DEPLOY_MAIN=false`。推送 `main` 会跑检查，不会自动连上服务器。文档要求在工作流补上 SQLite WAL 停机备份、候选验证和回滚门禁之前保持关闭。需要上线时按上述文档走服务器本地构建，或在 GitHub Actions 里手动运行部署工作流。

必需的生产变量名单在 `PROJECT_STATE.md` 的「必需环境变量」。变量校验定义在 `src/app.module.ts`。

## 许可证

[GNU AGPL-3.0](LICENSE)。`package.json` 的 `license` 字段是 `AGPL-3.0`。

再分发或提供本程序的网络服务时，须遵守该许可证。上游出处：[Lazztech / Libre Closet](https://github.com/lazztech/libre-closet)。
