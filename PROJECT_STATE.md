# PROJECT_STATE

更新时间：2026-06-16

## 当前状态

AI 衣橱 MVP 版本已完成并完成主要功能验收。当前主分支 `main` 已包含本阶段全部已验收功能，最新功能提交为：

```text
0cf7e05 feat: add wardrobe bulk delete mode
```

## 当前阶段

阶段：MVP 完成 / 体验版验证中

当前重点不是继续堆新功能，而是：

- 稳定体验版
- 修复真实用户反馈的关键问题
- 保持服务器代码、GitHub `main`、微信小程序体验版三者对齐

## 已完成能力

- 原生小程序衣橱首页：列表、筛选、详情入口、重新加载
- 单件衣物上传：图片压缩、AI 识别、表单二次确认、保存
- 鞋子/包包/配饰等非衣服图片的 AI 分类识别修复
- 阿里云图片分割/抠图接入，生产环境依赖 `.env` 中 Aliyun 配置
- 围绕核心衣物生成穿搭推荐，并确保结果包含核心衣物
- 今日穿搭保存
- 衣橱照片批量导入：相册多选、后台预识别、逐张确认/跳过
- 衣橱备份导出：ZIP 包含 `manifest.json` 和 `photos/`
- 衣橱备份导入：独立 `.zip` 入口，恢复衣物信息和照片
- 首页长按衣物卡片进入批量删除模式，可多选删除

## 关键入口

小程序页面：

- `miniprogram/pages/wardrobe/index.*`：衣橱首页、批量导入/导出/导入备份、批量删除
- `miniprogram/pages/garment-form/index.*`：单件上传、AI 识别、批量导入逐张确认
- `miniprogram/pages/garment-detail/index.*`：衣物详情
- `miniprogram/pages/outfit/index.*`：AI 搭配
- `miniprogram/pages/daily-outfit/index.*`：今日穿搭

后端入口：

- `src/wardrobe/miniapp-wardrobe.controller.ts`：小程序衣物 API、AI 分析、备份导入导出
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
BG_REMOVAL_PROVIDER
ALIBABA_CLOUD_ACCESS_KEY_ID
ALIBABA_CLOUD_ACCESS_KEY_SECRET
ALIYUN_IMAGE_SEG_ENDPOINT
ALIYUN_IMAGE_SEG_REGION
ALIYUN_IMAGE_SEG_RETURN_FORM
ALIYUN_IMAGE_SEG_TIMEOUT_MS
```

验证容器环境：

```bash
docker exec ai-wardrobe sh -c 'test -n "$QWEN_API_KEY" && echo "QWEN_API_KEY OK" || echo "QWEN_API_KEY MISSING"'
docker exec ai-wardrobe sh -c 'test -n "$ALIBABA_CLOUD_ACCESS_KEY_ID" && echo "AK_ID OK" || echo "AK_ID MISSING"'
docker exec ai-wardrobe sh -c 'test -n "$ALIBABA_CLOUD_ACCESS_KEY_SECRET" && echo "AK_SECRET OK" || echo "AK_SECRET MISSING"'
```

## 标准服务器同步流程

用户是服务器新手。以后每次需要上线或测试新代码，都必须给完整命令，不要只说“拉代码”。

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
npm test -- miniapp-wardrobe.controller.spec.ts --runInBand
npm run build
```

## 下一轮建议从这里开始

- 当前状态：MVP 完成，`main` 已包含批量导入导出、核心衣物搭配、批量删除等能力。
- 建议任务：体验版真实用户反馈收集、关键 Bug 修复、发布前数据备份流程演练。
- 继续文件：优先看 `PROJECT_STATE.md`、`docs/MVP_COMPLETION_SUMMARY.md`、`docs/ARCHITECTURE_HANDOFF.md`。
- 风险提醒：不要丢 `.env`；不要提交本地微信开发者工具配置；服务器 GitHub 连接不稳定时不要误判为分支不存在。
