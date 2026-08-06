# PROJECT_STATE

> 本文件只写**当前事实**。已完结的历史记录和功能验收明细归档在 `docs/PROJECT_LOG.md`。

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

- **生产环境**：`https://aimatchwear.asia` 正常服务，部署基线 `bd8882c`（2026-08-06）。
- **小程序体验版**：停留在 `1.0.1`（2026-07-12 上传）。此后的前端改动——折叠选择框改版（`a5c1fdd`）、Stitch「我的」页面、补标数量边界修复（`0644511`）——**均未上传体验版**，体验版用户看不到。需要时在微信开发者工具点「上传」，无需动服务器。
- **数据隔离**：微信登录 + 按 `openid` 隔离已验收，双微信号可分别管理各自衣橱。
- **待人工验收**：Stitch「我的」页面的视觉和 tab 跳转尚未在微信开发者工具确认。

最新已验收功能提交为：

```text
bd8882c 修复：提高补标批次时间预算，让「常规分析 3 件」真的跑满 3 件
```

最新主分支部署验收提交为：

```text
bd8882c 修复：提高补标批次时间预算，让「常规分析 3 件」真的跑满 3 件
```

> 说明：`bd8882c` 于 2026-08-06 通过**服务器本地构建**部署并验收，生产部署基线已从 `52ee408` 推进到 `bd8882c`。小程序前端自 `a5c1fdd` 起的改动（含 `0644511` 的补标数量边界修复）**仍未上传体验版**，需要时在微信开发者工具点「上传」。

## 当前阶段

阶段：MVP 完成 / 体验版微信登录隔离已验收 / Qwen 3.7 识图升级已验收 / 重复衣物入库提醒已验收 / 重复判断结构化细化 V2.1 已验收 / 查看类似衣服 已验收 / 前端换肤方案B柔彩卡片 已验收并合入 main（未传体验版）/ 手动添加今日穿搭 已验收并合入 main / 今日穿搭删除 已完成服务器部署和微信开发者工具验收 / 今日穿搭修改 已完成服务器部署和微信开发者工具验收 / AI 搭配反馈导出和管理员库存导出 已完成服务器部署和微信开发者工具验收 / 衣物结构化标签库 已完成生产部署和微信开发者工具验收 / 衣物表单折叠选择框改版 已验收并合入 main（纯前端，无需部署，未传体验版）/ 存量衣物 AI 补标签 已开发并完成首次生产试点（困困子账号 3 件，剩 12 件）/ 补标数量边界与时间预算修复 已完成服务器本地构建部署和线上验收（`bd8882c`）

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

## 关键入口

小程序页面：

- `miniprogram/pages/wardrobe/index.*`：衣橱首页、批量导入/导出/导入备份、批量删除
- `miniprogram/pages/garment-form/index.*`：单件上传、AI 识别、批量导入逐张确认
- `miniprogram/pages/garment-detail/index.*`：衣物详情
- `miniprogram/pages/outfit/index.*`：AI 搭配
- `miniprogram/pages/daily-outfit/index.*`：今日穿搭
- `miniprogram/pages/add-outfit/index.*`：手动添加今日穿搭，全身照必填，衣柜单品可选
- `miniprogram/pages/profile/index.*`：我的页面、反馈数据导出入口、管理员库存导出入口
- `miniprogram/pages/admin-inventory/index.*`：管理员库存导出页面，按用户导出当前库存 Excel
- `miniprogram/utils/api.js`：小程序登录、token 保存、所有 API 请求头

后端入口：

- `src/auth/miniapp-auth.controller.ts`：小程序微信登录接口 `/api/miniapp/auth/login`
- `src/auth/miniapp-auth.service.ts`：微信 `code2Session`、按 `openid` 找到/创建用户、签发 JWT
- `src/auth/conditional-auth.guard.ts`：读取小程序 `Authorization: Bearer ...` token
- `src/wardrobe/miniapp-wardrobe.controller.ts`：小程序衣物 API、AI 分析、备份导入导出
- `src/wardrobe/miniapp-outfit.controller.ts`：小程序搭配推荐 API
- `src/wardrobe/miniapp-daily-outfit.controller.ts`：小程序今日穿搭 API
- `src/wardrobe/miniapp-admin.controller.ts`：小程序管理员用户列表 / 用户库存导出 API
- `src/wardrobe/miniapp-admin.service.ts`：管理员白名单校验、用户列表、按用户读取库存
- `src/wardrobe/miniapp-outfit-feedback.controller.ts`：AI 搭配反馈保存 / 导出 API
- `src/wardrobe/outfit-feedback.service.ts`：反馈保存与按用户查询
- `src/dal/entity/outfit-feedback.entity.ts`：反馈数据表实体
- `src/wardrobe/recommendation/outfit-generator.service.ts`：穿搭推荐生成
- `src/ai/outfit-ai.service.ts`：AI 搭配提示词与返回结果规范
- `src/ai/garment-vision.service.ts`：衣物图片识别
- `src/file/file-service.abstract.ts`：图片标准化与阿里云抠图

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

最近一次生产服务器验收：2026-08-06，`bd8882c` 已通过服务器本地构建部署；公网首页、衣物接口、标签库接口均返回 200，容器内实际常量确认为 `BACKFILL_TIME_BUDGET_MS = 105_000`，启动日志 `Nest application successfully started` 无报错，切换停机约 5 秒。上一次为 2026-07-12（`52ee408`，衣物结构化标签库，体验版 `1.0.1`）。

### 服务器规格与已知约束（2026-08-06 实测）

- 腾讯云轻量应用服务器，Ubuntu，主机名 `VM-0-10-ubuntu`，2 核 / 1.9GB 内存 / 50GB 磁盘。
- 已配置 **4GB swapfile**（`/swapfile`，已写入 `/etc/fstab` 并实测重挂），`vm.swappiness=10`（已写入 `/etc/sysctl.conf`）。加 Swap 前为 0，任何内存尖峰都可能触发 OOM Killer 杀掉生产容器。
- **服务器到 GitHub 的链路基本不通**：连测 3 次 `github.com` 全部 20 秒超时；而 `registry.npmjs.org` 正常（0.7~1.3 秒）。所有依赖 GitHub 的环节都会卡：Releases 上的预编译二进制、`git fetch`、GitHub Actions 的镜像包传输。
- 因此仓库变量 **`AUTO_DEPLOY_MAIN` 已于 2026-08-06 置为 `false`**，推 `main` 不再自动部署。需要部署时手动触发工作流，或走服务器本地构建（步骤见 `docs/github-actions-auto-deploy.md`）。
- 镜像标签约定：`ai-wardrobe:latest` 为在跑版本，`candidate-<sha>` 为待验证构建产物，`rollback-<sha>` 为回滚点。当前回滚点 `ai-wardrobe:rollback-10bbc70`。
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

- 当前状态：MVP 完成，已接入小程序微信登录和按用户隔离，体验版双微信号验收通过；Qwen 3.7 衣物图片识别升级、重复衣物入库提醒、重复判断结构化细化 V2 / V2.1、查看类似衣服、手动添加今日穿搭、今日穿搭删除、今日穿搭修改、AI 搭配反馈导出、管理员库存导出、衣物结构化标签库 均已通过微信开发者工具验收。**生产部署基线为 `bd8882c`（2026-08-06，服务器本地构建），与 `main` 一致。** 小程序前端自 `a5c1fdd` 起的改动尚未上传体验版。
- 建议任务：
  - 继续「存量衣物 AI 补标签」——困困子账号还剩 12 件待处理；跑批前确认已有当日备份。
  - 需要给体验版用户使用时，在微信开发者工具上传体验版（当前体验版还看不到折叠选择框和补标数量修复）。
  - 可选优化：给 `docker/Dockerfile` 配置国内二进制镜像源（`registry.npmmirror.com`），把服务器构建从约 47 分钟压缩到几分钟。
  - 继续收集真实试用反馈，优先修复影响保存、删除、识别、导入导出的关键问题。
- 继续文件：优先看 `PROJECT_STATE.md`、`docs/backend-architecture-source-of-truth.md`、`miniprogram/DESIGN.md`、`miniprogram/pages/garment-form/index.*`、`miniprogram/utils/api.js`、`src/wardrobe/garment-tag-taxonomy.ts`。
- 后端开发前必须看：`docs/backend-architecture-source-of-truth.md`。
- 小程序表单改动前必须知道：衣物表单的字段选择框由 `miniprogram/pages/garment-form/index.js` 里的 `fieldSelectorConfigs` 驱动（决定每个字段单选/多选、选项来自本地常量还是标签库）；`buildFieldGroups` 每次都从当前 `form` 值重建视图模型，所以 AI 回显、编辑回显、批量导入三条路径都能自动同步。改这里时**不要动提交格式**：单值字段是字符串，季节/风格/场景是「、」拼接串，后端靠 `GarmentService.normalizeTags` 拆数组。
- 风险提醒：不要丢 `.env`；不要提交本地微信开发者工具配置；旧的 `owner=null` 公共衣橱数据不会自动迁移到某个微信用户；服务器 GitHub 连接不稳定时不要误判为分支不存在。
