# GitHub Actions 自动部署

本项目支持把 `main` 自动部署到生产服务器。

## 工作流

文件：

```text
.github/workflows/deploy-main.yml
```

触发方式：

- 推送到 `main`：自动运行检查；只有仓库变量 `AUTO_DEPLOY_MAIN=true` 时才会真正部署。
- GitHub 页面手动点击 `Run workflow`：无论 `AUTO_DEPLOY_MAIN` 是否开启，都会部署。

部署前会先执行：

```bash
npm ci
npm run test:miniapp
npm run build
```

通过后在 GitHub runner 上构建镜像并 `docker save | gzip` 打包，再 `scp` 传到服务器；服务器侧只做拉取 `main`、备份并恢复 `.env`、`docker load` 加载镜像、重启 `ai-wardrobe` 容器。

也就是说，**镜像在 GitHub 构建，服务器不重新构建**，只负责加载。

## 需要配置的 GitHub Secrets

在 GitHub 仓库页面进入：

```text
Settings -> Secrets and variables -> Actions -> Secrets
```

添加：

```text
DEPLOY_HOST      服务器 IP 或域名
DEPLOY_USER      SSH 用户，例如 root
DEPLOY_SSH_KEY   可以登录服务器的私钥内容
DEPLOY_PORT      SSH 端口，不填时默认 22
```

注意：不要把服务器密码、私钥或 `.env` 写进代码。

## 开启 push 自动部署

在 GitHub 仓库页面进入：

```text
Settings -> Secrets and variables -> Actions -> Variables
```

添加：

```text
AUTO_DEPLOY_MAIN=true
```

如果没有这个变量，或者变量存在但不等于 `true`，推送 `main` 只会跑检查，不会连接服务器。仍然可以在 Actions 页面手动点击 `Run workflow` 部署。

**当前取值：`AUTO_DEPLOY_MAIN=false`（2026-08-06 起）。** 关闭原因见下方「已知网络约束」，推 `main` 不再自动部署，改为按需手动触发或走服务器本地构建。

## 服务器侧前提

服务器上必须已经存在项目目录：

```bash
/root/AI-wardrobe-libre-closet
```

并且里面有生产 `.env`：

```bash
/root/AI-wardrobe-libre-closet/.env
```

部署会保留 `.env`，并使用现有 Docker 规则：

```text
image: ai-wardrobe:latest
container: ai-wardrobe
port: 127.0.0.1:3000:3000
volume: ai_wardrobe_data:/app/data
```

## 失败排查

如果失败，先看 GitHub Actions 日志：

- `Verify before deploy` 失败：代码检查或构建失败，先修代码。
- `Configure SSH key` 失败：Secrets 配错，重点检查服务器 IP、用户、SSH 私钥、端口。
- `Deploy on server` 失败或长时间卡住：`git fetch` 已内置最多 5 次重试；如果出现 `GnuTLS recv error (-110)`，是服务器到 GitHub 网络不稳。
  另有一种**不报错、只挂起**的形态：`scp` 已把镜像包完整传到服务器（`/tmp/ai-wardrobe.tar.gz` 达到完整大小且不再增长），但连接迟迟不收尾，后续远程脚本永远不执行。判断方法是登录服务器看 `/root/ai-wardrobe.env.backup` 的时间戳——远程脚本第一步就是备份 `.env`，时间戳没更新即代表脚本从未启动。这种情况直接取消工作流，改走服务器本地构建。

## 已知网络约束（2026-08-06 实测）

生产服务器到 GitHub 的链路**基本不通**，这是选择部署方式时的首要约束：

| 链路 | 实测结果 |
|---|---|
| 服务器 → `github.com` | ❌ 连测 3 次全部 20 秒超时（TCP 能连上，之后无响应） |
| 服务器 → `registry.npmjs.org` | ✅ 正常，0.7~1.3 秒，下载约 140 KB/s |
| 本机 → `github.com` | ✅ 正常，1~3 秒 |
| GitHub runner → 服务器 | ⚠️ 143MB 镜像包传输曾耗时 34 分钟，并在收尾阶段挂起 |

推论：**npm 依赖下载没问题，卡住的是所有需要访问 GitHub 的环节**（Releases 上的预编译二进制、`git fetch`、镜像包传输）。

## 备选：服务器本地构建

网络原因导致 GitHub 部署不可用时，可直接在服务器上构建：

```bash
ssh <服务器>
cd /root/AI-wardrobe-libre-closet
cp .env /root/ai-wardrobe.env.backup
git fetch --depth=20 origin +refs/heads/main:refs/remotes/origin/main
git switch main && git merge --ff-only origin/main
cp /root/ai-wardrobe.env.backup .env
docker tag ai-wardrobe:latest ai-wardrobe:rollback-$(git rev-parse --short HEAD@{1})
docker build -f docker/Dockerfile -t ai-wardrobe:candidate-$(git rev-parse --short HEAD) .
```

构建产物先落到 `candidate-<sha>` 标签，确认无误后再切换：

```bash
docker tag ai-wardrobe:candidate-<sha> ai-wardrobe:latest
docker rm -f ai-wardrobe
docker run -d --name ai-wardrobe -p 127.0.0.1:3000:3000 \
  --env-file /root/AI-wardrobe-libre-closet/.env \
  -v ai_wardrobe_data:/app/data ai-wardrobe:latest
```

注意事项：

- **首次构建约 47 分钟**，主要耗在安装后脚本重试 GitHub 下载（`sharp`、`better-sqlite3` 的预编译二进制托管在 GitHub Releases）。后续构建若 `package-lock.json` 未变会命中 Docker 层缓存，大幅加快。
- 因此**不要执行 `docker builder prune`**，那会清掉这层缓存；清理垃圾用 `docker image prune`（只删无标签镜像）即可。
- 服务器为 2 核 / 1.9GB 内存，已配置 4GB swapfile（`swappiness=10`）。实测构建期间 Swap 峰值约 185MB，未发生 OOM。
- 切换容器实测停机约 5 秒。
- `Public health check` 失败：工作流会在部署后最多重试约 1 分钟；如果仍失败，容器可能启动异常，或公网反代暂时无法连到后端。
