# AI穿搭衣橱

自用的 AI 搭配衣橱。仓库是 [kunkunzi996/AI-wardrobe-libre-closet](https://github.com/kunkunzi996/AI-wardrobe-libre-closet)。界面显示名来自 `APP_NAME`，当前为「AI穿搭衣橱」；微信小程序导航标题是「AI 衣橱」。

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
