# PROJECT_STATE

更新时间：2026-06-28

## 当前状态

AI 衣橱 MVP 版本已完成并完成主要功能验收。当前主分支 `main` 已包含本阶段全部已验收功能。小程序微信登录和按微信用户隔离已完成部署后体验版验收：你和你老婆两个微信号可以管理各自衣橱，互相不混数据。Qwen 3.7 衣物图片识别升级已完成服务器部署和微信开发者工具验收。重复衣物入库提醒功能已完成验收并合入主分支，`main` 最新版本已同步到服务器并验收成功。重复判断结构化细化 V2 / V2.1 也已完成服务器部署和微信开发者工具体验版验收。`查看类似衣服` 小功能现已完成服务器部署和微信开发者工具体验版验收。

重复衣物入库提醒已完成：单件新增和批量导入识图后，如果与当前用户库存中的衣物相似，会弹窗提示“可能已经入库”，提醒用户避免重复保存。该功能已通过本地单测、构建、小程序结构校验和微信开发者工具体验版验收。

重复判断结构化细化 V2 / V2.1 已完成：在原有重复提醒基础上，新增 `pocketPresence`、`pocketPosition`、`chestMarkPresence`、`chestMarkType`、`chestMarkPosition`、`chestMarkText` 六个结构化字段，用来区分“同色同版型但胸前细节不同”的衣物，避免把“黑色短袖 + 小字母”和“黑色短袖 + 胸前口袋标签”误判成重复。V2.1 进一步补了 boolean 归一化，以及“共同没有口袋/胸标”不再作为强相似证据。

`查看类似衣服` 小功能已完成：遇到被判断为相似的衣服时，表单页会显示“查看类似衣服”，用户点击后可以把本次新增衣服和库存里的相似衣服放在一起对比，再决定是否继续录入。该功能已通过本地构建、小程序结构校验、服务器部署和微信开发者工具体验版验收。

前端换肤（方案 B 柔彩卡片）已完成：衣橱 / 添加编辑 / 详情 / AI 搭配 / 今日穿搭五个页面统一改成「柔和紫 + 5 种柔彩分类色 + Notion 醒目黄」设计系统，新增自定义底部标签栏（衣橱 / 搭配 / 今日），衣物卡按分类自动配色，并补了 `miniprogram/DESIGN.md` 设计规范。本轮为**纯前端样式 / 导航改动，不涉及后端、数据模型或 API**，已在微信开发者工具验收通过并合入 `main`；尚未上传体验版（需要时再 upload）。

手动添加「今日穿搭」功能已完成验收并合入 `main`：今日页新增「添加穿搭」入口；新增小程序 `pages/add-outfit` 页面，支持必选全身照、填写理由/场合/评分/反馈、可选关联衣柜单品；后端 `Outfit` 新增整体照片关联和 sqlite/postgres 迁移；`/api/miniapp/daily-outfits` 改为 multipart 上传原图保存，不走衣物抠图；AI 推荐保存入口也会先要求选择/拍摄一张穿搭照片。该功能已通过本地单测、构建、小程序结构校验和用户确认的微信开发者工具端到端验收。

最新已验收功能提交为：

```text
5c9f443 feat(miniapp): add manual daily outfit capture
```

最新主分支部署验收提交为：

```text
6c248c9 feat: add similar garment comparison view
```

## 当前阶段

阶段：MVP 完成 / 体验版微信登录隔离已验收 / Qwen 3.7 识图升级已验收 / 重复衣物入库提醒已验收 / 重复判断结构化细化 V2.1 已验收 / 查看类似衣服 已验收 / 前端换肤方案B柔彩卡片 已验收并合入 main（未传体验版）/ 手动添加今日穿搭 已验收并合入 main

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
- 鞋子/包包/配饰等非衣服图片的 AI 分类识别修复
- 阿里云图片分割/抠图接入，生产环境依赖 `.env` 中 Aliyun 配置
- 围绕核心衣物生成穿搭推荐，并确保结果包含核心衣物
- 今日穿搭保存
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
- `miniprogram/utils/api.js`：小程序登录、token 保存、所有 API 请求头

后端入口：

- `src/auth/miniapp-auth.controller.ts`：小程序微信登录接口 `/api/miniapp/auth/login`
- `src/auth/miniapp-auth.service.ts`：微信 `code2Session`、按 `openid` 找到/创建用户、签发 JWT
- `src/auth/conditional-auth.guard.ts`：读取小程序 `Authorization: Bearer ...` token
- `src/wardrobe/miniapp-wardrobe.controller.ts`：小程序衣物 API、AI 分析、备份导入导出
- `src/wardrobe/miniapp-outfit.controller.ts`：小程序搭配推荐 API
- `src/wardrobe/miniapp-daily-outfit.controller.ts`：小程序今日穿搭 API
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

最近一次生产/测试服务器验收：2026-06-28，手动添加「今日穿搭」功能通过用户确认的微信开发者工具端到端验收；`main` 已合入 `5c9f443`，后续需要让服务器从 `main` 拉取以和主分支对齐。

部署时必须保留 `.env`：

```bash
cp .env /root/ai-wardrobe.env.backup
cp /root/ai-wardrobe.env.backup /root/AI-wardrobe-libre-closet/.env
```

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
cp .env /root/ai-wardrobe.env.backup
git fetch --depth=20 origin +refs/heads/main:refs/remotes/origin/main
git switch main
git merge --ff-only origin/main
git log --oneline -3
cp /root/ai-wardrobe.env.backup /root/AI-wardrobe-libre-closet/.env
docker build -f docker/Dockerfile -t ai-wardrobe:latest .
docker stop ai-wardrobe
docker rm ai-wardrobe
docker run -d \
  --name ai-wardrobe \
  -p 127.0.0.1:3000:3000 \
  --env-file /root/AI-wardrobe-libre-closet/.env \
  -v ai_wardrobe_data:/app/data \
  ai-wardrobe:latest
docker ps
curl https://aimatchwear.asia/api/miniapp/garments
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
```

否则体验版进入原生页面时会登录失败，衣橱接口拿不到当前微信用户。`WECHAT_MINIAPP_APP_SECRET` 不要写进代码或提交到 GitHub。

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

- 当前状态：MVP 完成，已接入小程序微信登录和按用户隔离，体验版双微信号验收通过；Qwen 3.7 衣物图片识别升级、重复衣物入库提醒、重复判断结构化细化 V2 / V2.1、查看类似衣服、手动添加今日穿搭 均已通过微信开发者工具验收；`main` 已包含手动添加今日穿搭，服务器后续需要从 `main` 拉取对齐。
- 建议任务：让服务器拉取 `main` 并重建容器，确认正式主分支环境里“添加穿搭”仍能保存；随后上传微信体验版。
- 继续文件：优先看 `PROJECT_STATE.md`、`docs/backend-architecture-source-of-truth.md`、`miniprogram/utils/api.js`、`src/wardrobe/miniapp-daily-outfit.controller.ts`。
- 后端开发前必须看：`docs/backend-architecture-source-of-truth.md`。
- 风险提醒：不要丢 `.env`；不要提交本地微信开发者工具配置；旧的 `owner=null` 公共衣橱数据不会自动迁移到某个微信用户；服务器 GitHub 连接不稳定时不要误判为分支不存在。
