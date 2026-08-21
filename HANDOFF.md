# HANDOFF.md

> 生成时间：2026-08-22
> 生成原因：废除库存状态已部署并用户确认启用，洁癖门收尾

## 1. 本轮在干什么（一句话）
- 小程序不再有待洗/收纳等库存状态，衣服在衣橱里就是能穿。

## 2. 已完成 / 未完成
- 已完成：接口/备份/Excel 去掉状态字段；网页状态下拉去掉；生产 `b356919` 已部署；用户 P6 01–05、07 PASS 并确认启用。
- 未完成：体验版仍 `1.0.1` 未上传；困困子仍 11 件未补标。
- 验收状态：P5 PASS；P6 用户已确认启用。P6-06/08 未执行。

## 3. 本轮碰过的文件
- 功能：`src/wardrobe/miniapp-*.ts`、`outfit-generator`、`outfit-ai`、`garment.service`、网页 `views/wardrobe/*`、管理员 Excel
- 状态：`PROJECT_STATE.md`、`docs/PROJECT_LOG.md`、`HANDOFF.md`、ADR 0005/0006

## 4. 下一轮必须先读
- PROJECT_STATE.md
- HANDOFF.md
- docs/adr/0006-no-garment-inventory-status.md
- docs/backend-architecture-source-of-truth.md

## 5. 下一轮禁止事项
- 不要 drop `garment.status` 列（本轮明确保留）
- 不要清空真实衣橱
- 不要把困困子或老婆标成验收沙盒
- 不要走 GitHub Actions 自动部署（`AUTO_DEPLOY_MAIN=false`）
- 不要 `docker builder prune`
- 不要把备份检查脚本挂在容器根目录（必须 `/app`）
- 切回上一业务版用 `rollback-f12563b-live-20260822`
- 不要用桌面旧项目 `C:\Users\Administrator\Desktop\AI穿搭软件\Libre-Closet` 预览
- 不要默认全文读取 `docs/archive/**`
- 验生产接口时不要拿部署前的旧网络记录当证据

---

## 待确认
- 无

## 待拍板（最多 3 条）
- 是否上传新体验版（当前仍 `1.0.1`）
