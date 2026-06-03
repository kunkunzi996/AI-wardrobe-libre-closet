# 微信小程序 Web-View 壳使用说明

这版小程序不是原生重写版，而是一个“网页入口版”。

大白话说：现有 Libre Closet 网页应用还是主体，小程序只负责打开这个网页。

## 导入哪个目录

在微信开发者工具里导入这个目录：

```text
C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet
```

不要导入 `miniprogram` 子目录。因为根目录里的 `project.config.json` 已经告诉微信开发者工具：真正的小程序代码在 `miniprogram/` 里面。

## AppID 填在哪里

文件：

```text
project.config.json
```

现在默认是：

```json
"appid": "touristappid"
```

本地预览可以先用这个占位值。正式发布前，要把它改成你自己的微信小程序 AppID。

## HTTPS 网页地址填在哪里

文件：

```text
miniprogram/pages/webview/index.js
```

现在已经配置为：

```js
const WEB_APP_URL = 'https://aimatchwear.asia';
```

如果以后更换域名，把它改成新的正式 HTTPS 地址，例如：

```js
const WEB_APP_URL = 'https://your-domain.example.com';
```

注意：微信小程序正式版不能直接打开 `http://127.0.0.1:3000` 或 `http://localhost:3000`。必须是 HTTPS 网址。

## 微信公众平台还要配置什么

正式发布前，还需要在微信公众平台里配置业务域名。

需要做的是：

1. 登录微信公众平台。
2. 进入对应小程序。
3. 找到开发设置里的业务域名配置。
4. 把你的 HTTPS 网页域名加进去。

如果没有配置业务域名，小程序代码没问题也可能打不开网页。

## 本地检查命令

在仓库目录运行：

```powershell
npm.cmd run test:miniapp
```

这个命令会检查：

- 小程序必需文件是否存在
- JSON 配置是否能正常解析
- `project.config.json` 是否指向 `miniprogram/`
- `app.json` 是否包含 `pages/webview/index`
- 页面里是否有 `web-view`

## 当前限制

这版只是 web-view 壳，不是原生小程序重写。

所以登录、上传衣物、AI 识别、搭配推荐这些功能，实际还是由网页应用和后端负责。小程序只是入口。
