# Project Log

This document is intended for the maintaining team to use to document decisions. This may be a medium for documenting, reviewing, and approving as a means of expressing consensus on project business decisions where the direct output is not necessarily code or assets that may be otherwise checked in and version controlled.

> **Example Entry (Date in ISO8601 format, Year-Month-Day):**
>
> The team agrees to _BLANK_ project business decision(s)...

## 2026-06-16

AI 衣橱 MVP 阶段完成并进入体验版验证期。当前 `main` 已包含原生小程序衣橱首页、单件 AI 识别上传、核心衣物搭配、今日穿搭、批量导入/导出/导入备份、批量删除等已验收能力。

阶段收尾文档：

- `PROJECT_STATE.md`
- `docs/MVP_COMPLETION_SUMMARY.md`

后续开发应优先从体验版用户反馈和关键稳定性问题开始，不建议在未收集反馈前继续扩展大功能。

## 2026-06-18

小程序微信登录和按用户隔离已完成并通过体验版验收。最新已验收提交：

```text
8425f50 feat: add WeChat miniapp login isolation
```

验收结论：

- 小程序原生页通过 `wx.login` 登录，后端按微信 `openid` 绑定 `User`。
- 衣橱、备份导入导出、AI 搭配推荐、今日穿搭按当前微信用户隔离。
- 双微信号体验版验证通过：你和你老婆可以分别管理各自衣橱，数据不混用。

后续重点：

- 保持 `.env` 中 `WECHAT_MINIAPP_APP_ID`、`WECHAT_MINIAPP_APP_SECRET`、`ACCESS_TOKEN_SECRET` 不丢失、不提交。
- 继续收集真实试用反馈，优先处理关键 Bug 和体验阻塞。
- 旧的 `owner=null` 公共衣橱数据不会自动迁移到某个微信用户，如需迁移应单独做数据迁移任务。
