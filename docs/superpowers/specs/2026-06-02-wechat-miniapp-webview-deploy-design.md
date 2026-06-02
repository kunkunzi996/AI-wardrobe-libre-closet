# 微信小程序 Web-View 部署设计

## 目标

用最快、最稳的方式做出可用的微信小程序版本：保留现在的 Libre Closet 网页/PWA 应用作为主产品，再用一个很小的微信小程序 `web-view` 壳把网页打开。

大白话说：先把现在这个网站部署成一个真正的 HTTPS 网址，然后做一个小程序入口，让小程序打开这个网址。

## 当前项目状态

- 仓库路径：`C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- 当前分支：`main`
- 应用类型：NestJS 网页/PWA 应用，页面使用 Handlebars
- 现有微信小程序项目：没有
- 现有 `project.config.json`：没有
- 可用于网页部署的脚本：
  - `npm run build`
  - `npm run start:prod`

## 选定方案

创建一个很小的原生微信小程序壳，只放一个 `web-view` 页面。

这个小程序壳会包含：

- `project.config.json`
- `miniprogram/app.json`
- `miniprogram/app.wxss`
- `miniprogram/pages/webview/index.json`
- `miniprogram/pages/webview/index.wxml`
- `miniprogram/pages/webview/index.wxss`
- `miniprogram/pages/webview/index.js`

页面会读取配置好的 HTTPS 网址，然后通过微信的 `web-view` 组件打开这个网页。

## 需要用户提供或确认的信息

在微信开发者工具里正式发布前，需要用户提供或确认：

- 微信小程序 AppID
- 最终的 HTTPS 网页地址
- 这个网页域名是否已经添加到微信公众平台的小程序业务域名里

没有这些信息，仓库里仍然可以先放一个本地可导入的小程序壳，但不能完整发布成正式生产小程序。

## 网页部署要求

现有 Libre Closet 服务端需要部署到一个满足下面条件的地方：

- HTTPS
- 能持久保存 SQLite 数据和上传的衣物图片，或者已经配置好 PostgreSQL/S3
- 环境变量要和当前应用配置匹配
- 有一个稳定的公网域名，后续可以在微信里加入白名单

网页部署和小程序壳是两件事。小程序壳只负责打开 HTTPS 网页。

## 错误处理

小程序壳会让 `web-view` 页面保持简单：

- 如果没有配置网址，就在微信开发者工具里显示一个清楚的设置提示页。
- 如果网址存在但被微信拦截，修复点不在代码里，而是在微信公众平台添加业务域名。
- 如果登录、上传、AI 功能失败，优先排查网页应用后端，因为小程序壳只是一个容器。

## 测试方式

本地验证包括：

- 运行 `npm run build` 构建网页应用。
- 在微信开发者工具里导入小程序文件夹。
- 确认项目打开时没有 JSON 错误或编码错误。
- 确认 `web-view` 指向配置好的 HTTPS 网址。

生产环境验证包括：

- 在微信开发者工具里用预览模式打开小程序。
- 确认 HTTPS 域名已被微信允许。
- 确认衣橱首页可以加载。
- 确认核心流程在网页应用里仍然可用：衣物列表、上传、搭配推荐，以及已配置时的 AI 辅助录入。

## 不在本次范围内

这份设计不会把 Libre Closet 重写成原生微信小程序页面。原生重写是更大的工作，应该等 web-view 版本可用后，再作为单独项目处理。
