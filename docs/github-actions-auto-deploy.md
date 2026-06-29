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

通过后才会 SSH 到服务器执行拉取 `main`、备份 `.env`、重建 Docker 镜像、重启 `ai-wardrobe` 容器。

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

如果没有这个变量，推送 `main` 只会跑检查，不会连接服务器。仍然可以在 Actions 页面手动点击 `Run workflow` 部署。

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
- `Deploy on server` 失败：服务器拉代码、Docker 构建或容器启动失败。
- `Public health check` 失败：容器可能启动了，但公网反代或服务健康有问题。
