# HANDOFF.md

> 生成时间：2026-08-20
> 生成原因：沙盒全量补标跑通，准备试 AI 穿搭

## 1. 本轮在干什么（一句话）
- 给验收沙盒加全量自动补标，并在沙盒 ID 4 跑完 143 件。

## 2. 已完成 / 未完成
- 已完成：沙盒全量补标功能；沙盒 143 件分析、2862 个新标签、失败 0；老婆真人衣橱未动。
- 未完成：尚未用沙盒微信号试 AI 穿搭；体验版仍 `1.0.1`；困困子仍 11 件未补标。
- 验收状态：全量补标已由用户跑通。非正式启用。无需部署服务器。

## 3. 本轮碰过的文件
- 功能：`miniprogram/pages/admin-inventory/index.*`、`miniprogram/utils/full-backfill.js`、`scripts/validate-miniapp-shell.cjs`
- 状态：`PROJECT_STATE.md`、`docs/PROJECT_LOG.md`、`HANDOFF.md`

## 4. 下一轮必须先读
- PROJECT_STATE.md
- HANDOFF.md
- docs/backend-architecture-source-of-truth.md

## 5. 下一轮禁止事项
- 不要宣布新版穿搭正式启用
- 不要用困困子或老婆真人号试新版穿搭，只用第三只微信（沙盒 ID 4）
- 不要把困困子或老婆标成验收沙盒，不要对真人衣橱做复制写入
- 不要清空真实衣橱
- 不要走 GitHub Actions 自动部署（`AUTO_DEPLOY_MAIN=false`）
- 不要 `docker builder prune`
- 不要把备份检查脚本挂在容器根目录 `/check-backup.js`（必须 `/app`）
- 不要改 `rollback-52d124c-20260818T031630Z`；切回上一业务版用 `rollback-52d124c-live-20260819`
- 不要因为桌面 main 约 97 个 `M` 就清理工作区（`core.autocrlf` 噪音）
- 不要默认全文读取 `docs/archive/**`
- 不要用桌面旧项目 `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` 预览本轮前端

---

## 待确认
- 无

## 待拍板（最多 3 条）
- 是否上传新体验版（当前决定先不传）
- 是否补验整橱覆盖
- 是否把「完整性检查必须在 /app 下跑 better-sqlite3」记进项目场面提醒
