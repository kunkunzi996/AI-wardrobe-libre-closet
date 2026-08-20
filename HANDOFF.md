# HANDOFF.md

> 生成时间：2026-08-20
> 生成原因：衣橱复制到验收沙盒用户验收通过，准备合入 main

## 1. 本轮在干什么（一句话）
- 管理员把老婆衣橱整橱复制到第三只微信验收沙盒；已部署生产并经用户确认拷全、对得上、源未改。

## 2. 已完成 / 未完成
- 已完成：标记 ID 4 为沙盒、从 ID 3 复制、沙盒新 ID 对上、ID 3 内容未少、生产 `f12563b` / `candidate-f12563b`。
- 未完成：整橱覆盖路径未再验；轮次四文件未洁癖归档；体验版仍 `1.0.1`；11 件补标。
- 验收状态：复制功能 P6 用户确认通过。非正式启用。

## 3. 本轮碰过的文件
- 功能：`7e406cb`、`f12563b`（库存页、复制服务、沙盒标记、SQLite 迁移）
- 状态：`PROJECT_STATE.md`、`docs/PROJECT_LOG.md`、`HANDOFF.md`

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
- 不要改 `rollback-52d124c-20260818T031630Z`；切回上一业务版用 `rollback-52d124c-live-20260819`
- 不要因为桌面 main 约 97 个 `M` 就清理工作区（`core.autocrlf` 噪音）
- 不要默认全文读取 `docs/archive/**`

---

## 待确认
- 无

## 待拍板（最多 3 条）
- 是否做洁癖门归档本轮 spec/plan/task/test（`test.md` 定义哈希仍为 planned）
- 是否补验整橱覆盖
- 是否上传新体验版（当前决定先不传）
