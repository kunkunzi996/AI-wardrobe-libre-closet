# 原生微信小程序 MVP 设计

## 目标

把当前 web-view 小程序壳改造成个人主体可用的原生微信小程序第一版。第一版只做“衣橱最小可用版”：用户可以在小程序里查看衣物、添加衣物、上传图片、查看衣物详情。

大白话说：小程序不再打开网页，而是自己显示页面；服务器和域名继续负责保存数据、保存图片、提供接口。

## 当前背景

- 小程序主体：个人主体，不能正式使用 `web-view` 业务域名。
- 已有后端：`https://aimatchwear.asia`
- 已有服务器：腾讯云 Ubuntu 服务器，Docker 部署 Libre Closet。
- 已有功能：网页端已经有衣物、图片上传、AI 识别、搭配推荐等服务能力。
- 当前缺口：后端主要是网页路由和 HTML 渲染，还缺少给小程序直接调用的 JSON API。

## 第一版范围

第一版包含：

- 原生小程序首页：衣物列表。
- 原生小程序添加页：选择图片、填写基础信息、上传保存。
- 原生小程序详情页：查看单件衣物图片和信息。
- 后端新增小程序 API：
  - 获取衣物列表
  - 获取单件衣物详情
  - 上传图片并创建衣物
  - 删除衣物

第一版暂不包含：

- web-view 页面。
- 复杂搭配编辑器。
- 日历穿搭记录。
- 完整网页端功能迁移。
- 微信登录和多用户账号体系。
- 小程序内 AI 自动识别表单草稿。

这些后续都可以加，但第一版先把“能在个人主体小程序里管理衣橱”跑通。

## 架构

原生小程序和服务器分工如下：

- 小程序负责页面展示、用户输入、图片选择、调用接口。
- 后端负责数据保存、图片保存、数据库、后续 AI 能力。
- 域名 `https://aimatchwear.asia` 作为小程序合法服务器域名。

数据流：

1. 小程序打开首页。
2. 小程序调用 `GET https://aimatchwear.asia/api/miniapp/garments`。
3. 后端返回 JSON 衣物列表。
4. 用户添加衣物时，小程序调用 `wx.chooseMedia` 选择图片。
5. 小程序用 `wx.uploadFile` 上传图片和表单字段到后端。
6. 后端保存图片和衣物记录。
7. 小程序刷新列表。

## 后端 API 设计

新增控制器建议放在：

```text
src/wardrobe/miniapp-wardrobe.controller.ts
```

接口路径：

```text
GET    /api/miniapp/garments
GET    /api/miniapp/garments/:id
POST   /api/miniapp/garments
DELETE /api/miniapp/garments/:id
```

返回格式使用 JSON，不返回 HTML。

衣物列表字段：

- `id`
- `name`
- `category`
- `categoryLabel`
- `color`
- `colorLabel`
- `status`
- `statusLabel`
- `season`
- `brand`
- `size`
- `photoUrl`
- `detailUrl`

创建衣物使用 `multipart/form-data`，字段包括：

- `photo`
- `name`
- `category`
- `color`
- `season`
- `brand`
- `size`
- `notes`

## 小程序页面设计

替换当前 `miniprogram/pages/webview/`，新增原生页面：

```text
miniprogram/pages/wardrobe/index
miniprogram/pages/garment-form/index
miniprogram/pages/garment-detail/index
```

首页：

- 顶部显示“AI 衣橱”。
- 主体显示衣物卡片网格。
- 没有衣物时显示空状态和“添加第一件衣物”。
- 底部或右下角有添加按钮。

添加页：

- 选择图片。
- 预览图片。
- 填写名称、分类、颜色、季节、品牌、尺码、备注。
- 点击保存后调用后端上传接口。

详情页：

- 显示衣物图片。
- 显示基础信息。
- 提供删除按钮。

## 错误处理

小程序端：

- 请求失败时显示“服务器连接失败，请稍后重试”。
- 上传失败时显示“上传失败，请重新选择图片”。
- 必填字段为空时在页面内提示。

后端：

- 没有图片时返回 `400`。
- 衣物不存在时返回 `404`。
- 上传文件不是图片时返回 `400`。
- 接口统一返回 JSON 错误，不返回网页错误页。

## 测试方式

后端：

- 新增控制器单元测试，覆盖列表、详情、创建、删除。
- 运行 `npm.cmd test`。
- 运行 `npm.cmd run build`。

小程序：

- 新增 `npm.cmd run test:miniapp` 检查页面文件和 API 域名配置。
- 在微信开发者工具导入项目，编译首页。
- 配置服务器域名：
  - request 合法域名：`https://aimatchwear.asia`
  - uploadFile 合法域名：`https://aimatchwear.asia`
  - downloadFile 合法域名：`https://aimatchwear.asia`
- 手动验收：
  - 首页可以加载。
  - 可以添加一件衣物。
  - 添加后列表出现新衣物。
  - 可以进入详情。
  - 可以删除衣物。

## 发布前要求

微信公众平台需要配置服务器域名。个人主体不能使用 web-view 业务域名，但原生小程序请求后端接口仍需要配置合法服务器域名。

正式发布前还需要确认小程序类目和内容不违反个人主体小程序限制。
