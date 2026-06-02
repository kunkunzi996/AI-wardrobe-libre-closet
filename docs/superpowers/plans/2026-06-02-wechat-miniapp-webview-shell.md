# WeChat Miniapp Webview Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an importable WeChat mini-program shell that opens the deployed Libre Closet web app through `web-view`.

**Architecture:** Keep the existing NestJS/PWA app unchanged. Add a small `miniprogram/` project plus root `project.config.json`; the mini-program reads one configured HTTPS URL and either opens it in `web-view` or shows a setup prompt when the URL is missing.

**Tech Stack:** WeChat mini-program JSON/WXML/WXSS/JS, Node.js validation script, existing npm scripts.

---

### Task 1: Add Mini-Program Shell

**Files:**
- Create: `project.config.json`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`
- Create: `miniprogram/pages/webview/index.json`
- Create: `miniprogram/pages/webview/index.wxml`
- Create: `miniprogram/pages/webview/index.wxss`
- Create: `miniprogram/pages/webview/index.js`

- [x] **Step 1: Create WeChat project config**

Create `project.config.json`:

```json
{
  "description": "Libre Closet WeChat mini-program web-view shell",
  "miniprogramRoot": "miniprogram/",
  "projectname": "Libre Closet",
  "appid": "touristappid",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true
  },
  "compileType": "miniprogram",
  "libVersion": "latest"
}
```

- [x] **Step 2: Create global mini-program files**

Create `miniprogram/app.json`:

```json
{
  "pages": ["pages/webview/index"],
  "window": {
    "navigationBarTitleText": "AI 衣橱",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f7f7f5"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

Create `miniprogram/app.wxss`:

```css
page {
  background: #f7f7f5;
  color: #202124;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

- [x] **Step 3: Create web-view page**

Create `miniprogram/pages/webview/index.json`:

```json
{
  "navigationBarTitleText": "AI 衣橱"
}
```

Create `miniprogram/pages/webview/index.wxml`:

```xml
<web-view wx:if="{{targetUrl}}" src="{{targetUrl}}" />

<view wx:else class="setup">
  <view class="panel">
    <view class="title">还没有配置网页地址</view>
    <view class="body">请先把 Libre Closet 部署成 HTTPS 网站，然后在 index.js 里填写 WEB_APP_URL。</view>
    <view class="hint">微信正式版还需要在微信公众平台添加业务域名。</view>
  </view>
</view>
```

Create `miniprogram/pages/webview/index.wxss`:

```css
.setup {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  box-sizing: border-box;
}

.panel {
  width: 100%;
  padding: 40rpx;
  border: 1rpx solid #dedbd2;
  border-radius: 12rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.title {
  margin-bottom: 20rpx;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.3;
}

.body,
.hint {
  color: #4f5355;
  font-size: 28rpx;
  line-height: 1.6;
}

.hint {
  margin-top: 20rpx;
}
```

Create `miniprogram/pages/webview/index.js`:

```js
const WEB_APP_URL = '';

Page({
  data: {
    targetUrl: WEB_APP_URL,
  },
});
```

### Task 2: Add Validation and Instructions

**Files:**
- Create: `scripts/validate-miniapp-shell.cjs`
- Modify: `package.json`
- Create: `docs/wechat-miniapp-webview.md`

- [x] **Step 1: Add validation script**

Create `scripts/validate-miniapp-shell.cjs` that verifies required files exist, JSON files parse, `project.config.json` points to `miniprogram/`, and the page contains a `web-view`.

- [x] **Step 2: Add npm script**

Add this script to `package.json`:

```json
"test:miniapp": "node scripts/validate-miniapp-shell.cjs"
```

- [x] **Step 3: Add Chinese usage doc**

Create `docs/wechat-miniapp-webview.md` explaining:

- Import path: `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet`
- Where to fill AppID: `project.config.json`
- Where to fill HTTPS URL: `miniprogram/pages/webview/index.js`
- WeChat business domain requirement
- Current limitation: no native rewrite yet

### Task 3: Verify and Save

**Files:**
- Modify only files from Task 1 and Task 2.

- [x] **Step 1: Run miniapp validation**

Run: `npm.cmd run test:miniapp`

Expected: PASS with required files and JSON checks passing.

- [x] **Step 2: Run web build**

Run: `npm.cmd run build`

Expected: PASS. This proves the existing web app still builds.

- [x] **Step 3: Check Git changes**

Run: `git status --short --branch`

Expected: only mini-program shell, validation script, docs, and `package.json` changed.

- [x] **Step 4: Commit and push**

Commit message:

```bash
git commit -m "feat: add WeChat miniapp webview shell"
```

Push to GitHub if the remote is configured.
