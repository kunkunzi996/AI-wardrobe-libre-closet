# HANDOFF.md

> 生成时间：2026-08-20
> 生成原因：衣橱复制到验收沙盒洁癖门收口

## 1. 本轮在干什么（一句话）
- 衣橱复制到验收沙盒已部署、用户验收通过，四文件已归档。

## 2. 已完成 / 未完成
- 已完成：生产 `f12563b` / `candidate-f12563b`；ID 4 沙盒副本 143 件且编号对上；ID 3 未少；四文件归档到 `docs/archive/2026-08-20-衣橱复制到验收沙盒/`。
- 未完成：整橱覆盖路径未再验；体验版仍 `1.0.1`；11 件补标。
- 验收状态：复制功能 P6 用户确认通过。非正式启用。当前无活跃 SPEC/PLAN/TASK/TEST。

## 3. 本轮碰过的文件
- 归档：`docs/archive/2026-08-20-衣橱复制到验收沙盒/{spec,plan,task,test}.md`
- 状态：`PROJECT_STATE.md`、`docs/PROJECT_LOG.md`、`HANDOFF.md`
- 部署备忘：`docs/github-actions-auto-deploy.md`（完整性检查必须在 `/app` 下跑）

## 4. 下一轮必须先读
- PROJECT_STATE.md
- HANDOFF.md
- docs/backend-architecture-source-of-truth.md

## 5. 下一轮禁止事项
- 不要宣布新版穿搭正式启用
- 不要把困困子或老婆标成验收沙盒，不要对真人衣橱做复制写入
- 不要清空真实衣橱
- 不要走 GitHub Actions 自动部署（`AUTO_DEPLOY_MAIN=false`）
- 不要 `docker builder prune`
- 不要把备份检查脚本挂在容器根目录 `/check-backup.js`（必须 `/app`）
- 不要改 `rollback-52d124c-20260818T031630Z`；切回上一业务版用 `rollback-52d124c-live-20260819`
- 不要因为桌面 main 约 97 个 `M` 就清理工作区（`core.autocrlf` 噪音）
- 不要默认全文读取 `docs/archive/**`

---

## 待确认
- 无

## 待拍板（最多 3 条）
- 是否把「完整性检查必须在 /app 下跑 better-sqlite3」记进项目场面提醒
- 是否补验整橱覆盖
- 是否上传新体验版（当前决定先不传）
