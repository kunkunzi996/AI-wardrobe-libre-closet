# AI 衣橱 MVP 完成总结

更新时间：2026-06-18

## 一句话结论

AI 衣橱 MVP 已完成：用户可以用微信小程序管理衣橱、AI 识别衣物、围绕核心衣物生成搭配、批量导入/导出/恢复衣橱照片，并在首页批量删除衣物。小程序微信登录和按用户隔离已通过体验版验收。

## 当前主分支

```text
main
8425f50 feat: add WeChat miniapp login isolation
```

## 已验收功能

### 衣橱基础管理

- 衣橱首页展示衣物卡片
- 分类和季节筛选
- 衣物详情查看
- 单件新增、AI 识别、表单确认、保存
- 长按首页衣物卡片进入批量删除模式
- 点选多张衣物后确认删除

### AI 识别与图片处理

- 图片上传前小程序端压缩
- Qwen 视觉模型识别衣物信息，当前默认识图模型为 `qwen3.7-plus`
- 支持鞋子、包包、配饰等非上衣/下装图片识别
- 阿里云图片分割用于衣物白底/抠图处理
- 批量导入时后台预识别，用户逐张确认
- 批量预识别失败时保留页面二次识别兜底

### AI 搭配

- AI 搭配入口
- 围绕指定核心衣物生成搭配
- 推荐结果强制包含核心衣物
- 可保存为今日穿搭

### 备份与恢复

- 导出 ZIP 备份包
- ZIP 包包含 `manifest.json` 和 `photos/`
- 独立“导入备份”入口
- 上传 ZIP 后恢复衣物信息和照片

### 微信登录与用户隔离

- 小程序启动时通过 `wx.login` 登录
- 后端按微信 `openid` 绑定用户并签发 JWT
- 衣橱、备份导入导出、AI 搭配、今日穿搭按微信用户隔离
- 已用两个微信号完成体验版验收，确认数据不混用

## 关键代码位置

```text
miniprogram/pages/wardrobe/index.*
miniprogram/pages/garment-form/index.*
miniprogram/pages/garment-detail/index.*
miniprogram/pages/outfit/index.*
miniprogram/pages/daily-outfit/index.*
miniprogram/utils/api.js
src/auth/miniapp-auth.controller.ts
src/auth/miniapp-auth.service.ts
src/auth/conditional-auth.guard.ts
src/wardrobe/miniapp-wardrobe.controller.ts
src/wardrobe/miniapp-outfit.controller.ts
src/wardrobe/miniapp-daily-outfit.controller.ts
src/wardrobe/recommendation/outfit-generator.service.ts
src/ai/garment-vision.service.ts
src/ai/outfit-ai.service.ts
src/file/file-service.abstract.ts
```

## 生产部署要点

服务器目录：

```bash
/root/AI-wardrobe-libre-closet
```

部署原则：

1. 先备份 `.env`
2. 拉 GitHub 最新 `main`
3. 恢复 `.env`
4. 重新构建 Docker
5. 重启 `ai-wardrobe` 容器
6. 验证公网 API
7. 微信开发者工具重新上传体验版

核心命令见根目录 `PROJECT_STATE.md`。

## 已知风险

- 服务器到 GitHub 偶发连接失败，常见为 `GnuTLS recv error (-110)` 或 GitHub 443 超时。
- `.env` 曾在部署过程中被覆盖，部署前后必须备份恢复。
- 小程序微信登录依赖 `.env` 中 `WECHAT_MINIAPP_APP_ID`、`WECHAT_MINIAPP_APP_SECRET`、`ACCESS_TOKEN_SECRET`，其中 AppSecret 不能提交到 GitHub。
- 小程序体验版是否更新，不只取决于服务器，还取决于微信开发者工具是否重新上传。
- 当前批量删除复用单件删除接口逐个删除，大量删除时速度取决于网络和后端响应。
- 备份导入只保证兼容本项目导出的 ZIP 格式，不作为通用 ZIP 导入器。

## 验收记录

本阶段多次执行过以下验证：

```bash
npm run test:miniapp
npm test -- miniapp-auth.service.spec.ts conditional-auth.guard.spec.ts miniapp-wardrobe.controller.spec.ts --runInBand
npm run build
```

用户侧已完成主要功能闭环验收：

- 围绕核心衣物搭配
- 鞋子识别
- 批量导入/导出/导入备份
- 批量导入后台预识别
- 首页长按批量删除
- 双微信号用户隔离

## 下一阶段建议

- 先不要继续大改，优先让体验版用户继续使用。
- 收集你和你老婆的真实试用反馈后，按 Bug 优先级修复。
- 做一次备份导出和导入恢复演练，确认用户能理解备份文件怎么使用。
- 如果用户衣物数量明显增加，再考虑批量删除后端接口、分页、图片加载性能优化。
