# Libre Closet

## 本分支：小程序衣物 AI 整理（功能分支，尚未正式上线）

新上传保留私有原图，默认图沿用既有一次抠图。详情手动生成一张候选，先预览、不自动换图；支持退出恢复与超时只查原次。明确采用只换展示图引用、不删原图/旧图，不改衣物资料；衣橱、重复候选、推荐、今日穿搭统一当前图版本，已有推荐返回只刷新照片。备份及沙盒复制已接通图片保留。历史无原图衣物及鞋包配饰等不支持整理。普通保存、查看不生成。

| 服务端配置 | 默认值 / 用途 |
|---|---|
| QWEN_IMAGE_ENABLED | false；必须显式开启才允许整理 |
| QWEN_API_KEY | 沿用现有服务端 Key，不能放小程序或日志 |
| QWEN_IMAGE_MODEL | 只允许 qwen-image-3.0-pro |
| QWEN_IMAGE_API_URL | https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation |
| QWEN_IMAGE_TIMEOUT_MS | 240000 毫秒 |

固定五类提示词版本 20261006-v1，生成参数 n=1、1024*1024、seed=701、prompt_extend=false、watermark=false。POST 只受理，Worker 先落盘派发状态再调用模型；候选落盘后才能 ready。明确失败与结果未知分开，未知不能声称未扣费或自动重新生成。私有图经主人及版本校验、带 Bearer 下载，公开 file/nobg/watermark 不可绕路；S3 真实桶裸读权限仍须单独验收。

已按授权部署独立的免费手机验收后台并上传 1.0.9 体验版，不替换生产业务或正式发布。P5 回归及既有双轴关闭评审通过；用户于 2026-10-08 确认按现有验收范围关闭整轮 P6，受控异常、真实 S3/首次登录全部分支/手机文件分享等覆盖限制及原规格缺口继续保留。冻结记录见 [整轮验收结论](docs/archive/2026-10-08-衣物手动-AI-整理与预览采用/test.md#P6-CURRENT-CLOSED-20261008) 和 [项目当前状态](PROJECT_STATE.md)。

P4 自动化阶段仅使用内存库与假端口；后续已分别获准进行真实模型样图、隔离手机后台和体验版验收，不把它们写成生产业务发布。完整施工与验收流水已冻结在 docs/archive/2026-10-08-衣物手动-AI-整理与预览采用/ 的 task.md、test.md；当前没有活跃的 SPEC/PLAN/TASK/TEST，代码尚未提交、推送或正式上线。

新备份版本 3 保留原图、当前图、候选及固定输入图，重复文件只存一份；版本 1/2 仍能导入，没有原图就保持为空。导入或沙盒复制只存原字节、不再抠图或生成；目标文件独立归目标主人，处理中快照恢复为“结果待确认”，不重放请求。供应商请求信息、结果地址及凭证不进入备份。声明的图片引用缺失会在写入前拒绝整个包。

服务重启时：queued 才能首次派发，processing 转为 uncertain，绝不重发生成 POST；已持久化的结果地址只恢复 GET 下载。明确 failed 后用户可手动再试，客户端 attemptKey 采用递增的时间前缀（base36 时间_随机串）；新次必须比当前次更新，旧 key 永远只查当前次，避免保留历史表也能拒绝重放。页面隐藏/关闭停止轮询并忽略晚到结果，后台任务继续。

> Your wardrobe. Your data.

A free, open-source, self-hosted wardrobe organizer. Catalog your clothes, upload photos, build outfits, and access everything from your phone as an offline-ready PWA - all on your own server.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/github/v/tag/lazztech/libre-closet?label=Version&color=green)](https://github.com/lazztech/libre-closet/tags)
[![GHCR Pulls](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fipitio.github.io%2Fbackage%2FLazztech%2FLibre-Closet%2Flibre-closet.json&query=downloads&label=GHCR%20pulls&logo=github&logoColor=959da5&labelColor=333a41)](https://github.com/lazztech/libre-closet/pkgs/container/libre-closet)
[![Docker Pulls](https://img.shields.io/docker/pulls/lazztech/libre-closet?logo=docker&logoColor=959da5&labelColor=333a41&label=Docker%20Pulls)](https://hub.docker.com/r/lazztech/libre-closet)
[![Join the Discussion](https://img.shields.io/badge/Community-Join%20the%20Discussion-2EA44F?logo=github&logoColor=white&labelColor=1F2937)](https://github.com/Lazztech/Libre-Closet/discussions)

Crafted and engineered with care and intention by [Lazztech LLC](https://lazz.tech/about) 🖤

---

## News

**`v0.2.0` Released! - April 10, 2026**

#### Released

- `v0.3.0 - May 21, 2026`: Garment image background touch up tool
- `v0.2.5 - May 1, 2026`: Added option to disable register functionality
- `v0.2.4 - April 28, 2026`: Fix garment photo upload cropping
- `v0.2.3 - April 20, 2026`: Added Russian language support.
- `v0.2.2 - April 17, 2026:` Garment and Outfit names now optional
- `v0.2.1 - April 15, 2026:` fix empty outfit click area

---

## Quick start

```bash
docker run -d \
  -p 3000:3000 \
  -v librecloset_data:/app/data \
  ghcr.io/lazztech/libre-closet
```

Open [http://localhost:3000](http://localhost:3000). No account required by default.

**Want to try it without self-hosting?** A public instance is running at [https://librecloset.lazz.tech](https://librecloset.lazz.tech) - register a free account to get started. No guest login exists, but registration is instant and requires no email verification.

---

## Screenshots

Note, these screenshots are taken of the web application viewed as an installed standalone PWA. This tool may also be used like a traditional web app in the browser.

| Wardrobe (Mobile)                                      | Outfits (Mobile)                                 | Outfit Schedule (Mobile)                                 | Outfit Builder (Mobile)                          |
| ------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------ |
| ![Wardrobe grid](screenshots/Screenshot_mobile_1.webp) | ![Outfits](screenshots/Screenshot_mobile_2.webp) | ![Outfit Schedule](screenshots/Screenshot_mobile_3.webp) | ![Outfit ](screenshots/Screenshot_mobile_4.webp) |

| Wardrobe (Desktop)                              | Outfits (Desktop)                         | Outfit Schedule (Desktop)                         | Outfit Builder (Desktop)                        |
| ----------------------------------------------- | ----------------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| ![Wardrobe grid](screenshots/Screenshot_1.webp) | ![Outfits](screenshots/Screenshot_2.webp) | ![Outfit Schedule](screenshots/Screenshot_3.webp) | ![Outfit detail](screenshots/Screenshot_4.webp) |

---

## Features

- **Garment catalog** - name, category, brand, size, colors, notes, photo
- **Customizable categories** - custom category support with filtering and input suggestion as you type
- **Outfit builder** - combine garments into saved looks with the Clueless inspired outfit builder
- **Outfit Scheduling** - schedule out multiple outfits for given days through the week and get a view of what you've worn
- **Image Background Removal** - Images automatically have their backgrounds removed and optimized WebP upon upload
- **Offline-ready PWA** - install to home screen, works without internet
- **Optional auth** - run open for personal use or enable JWT accounts for multi-user
- **S3 or local storage** - local disk by default, swap to any S3-compatible provider
- **SQLite or PostgreSQL** - SQLite by default, PostgreSQL for scale
- **Multi-language** - UI available in English, Italian, French, Russian, German, and Spanish

---

## Self-hosting

### Docker (recommended)

```bash
# SQLite + local storage (simplest)
docker run -d \
  -p 3000:3000 \
  -v librecloset_data:/app/data \
  ghcr.io/lazztech/libre-closet
```

### docker-compose

```yaml
services:
  libre-closet:
    image: ghcr.io/lazztech/libre-closet
    ports:
      - '3000:3000'
    volumes:
      - librecloset_data:/app/data
    environment:
      AUTH_ENABLED: 'false'
      PWA_ENABLED: 'true'
      DATA_PATH: /app/data
    restart: unless-stopped

volumes:
  librecloset_data:
```

### Build from source

```bash
git clone https://github.com/lazztech/libre-closet
cd libre-closet
cp .env .env.local     # override defaults locally (gitignored)
npm install
npm run start:prod
```

---

## Configuration

`.env` contains committed defaults. Override any value via a `.env.local` file (gitignored) or by passing real environment variables to Docker.

| Variable                           | Description                                                                                                                                                                                                                                                                                                                            | Default        | Example                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `APP_NAME`                         | Display name shown in the UI and navbar                                                                                                                                                                                                                                                                                                | `Libre Closet` | `My awesome Closet manager`                                                               |
| `DATA_PATH`                        | Directory for SQLite DB and uploaded files                                                                                                                                                                                                                                                                                             | `./data`       | `./libre-closet-data`                                                                     |
| `AUTH_ENABLED`                     | Enable JWT user accounts and login                                                                                                                                                                                                                                                                                                     | `false`        | `true`                                                                                    |
| `DISABLE_REGISTRATION`                     | Disallows user sign ups when false                                                                                                                                                                                                                                                                                                     | `false`        | `true`                                                                                    |
| `PWA_ENABLED`                      | Enable service worker and PWA install prompt                                                                                                                                                                                                                                                                                           | `false`        | `true`                                                                                    |
| `ACCESS_TOKEN_SECRET`              | JWT signing secret - **change for production**                                                                                                                                                                                                                                                                                         | `ChangeMe!`    | `u9n8c2y847rfctb23468tcb689f243`                                                          |
| `WECHAT_MINIAPP_APP_ID`            | WeChat mini-program AppID used by `/api/miniapp/auth/login`                                                                                                                                                                                                                                                                            | -              | `wx1234567890abcdef`                                                                      |
| `WECHAT_MINIAPP_APP_SECRET`        | WeChat mini-program AppSecret used to exchange `wx.login` code for `openid`                                                                                                                                                                                                                                                            | -              | `your-wechat-app-secret`                                                                  |
| `MINIAPP_ADMIN_USER_IDS`           | Comma-separated mini-program user IDs allowed to access admin inventory exports                                                                                                                                                                                                                                                         | -              | `1,2`                                                                                     |
| `MINIAPP_ADMIN_WECHAT_OPEN_IDS`    | Comma-separated WeChat `openid` values allowed to access admin inventory exports                                                                                                                                                                                                                                                        | -              | `openid1,openid2`                                                                         |
| `TENCENT_LBS_KEY`                  | Tencent Location Service Key used only by the backend weather proxy; never include it in the mini-program package                                                                                                                                                                                                                      | -              | `your-tencent-lbs-key`                                                                    |
| `TENCENT_LBS_BASE_URL`             | Tencent Location Service API base URL                                                                                                                                                                                                                                                                                                  | `https://apis.map.qq.com` | `https://apis.map.qq.com`                                                       |
| `TENCENT_LBS_TIMEOUT_MS`           | Backend Tencent weather request timeout in milliseconds                                                                                                                                                                                                                                                                                | `8000`         | `8000`                                                                                    |
| `DATABASE_TYPE`                    | `sqlite` or `postgres`                                                                                                                                                                                                                                                                                                                 | `sqlite`       | `postgres`                                                                                |
| `DATABASE_HOST`                    | Postgres host                                                                                                                                                                                                                                                                                                                          | -              | `192.168.10.5`                                                                            |
| `DATABASE_PORT`                    | Postgres port                                                                                                                                                                                                                                                                                                                          | `5432`         | `9867`                                                                                    |
| `DATABASE_USER`                    | Postgres user                                                                                                                                                                                                                                                                                                                          | -              | `postgres`                                                                                |
| `DATABASE_PASS`                    | Postgres password                                                                                                                                                                                                                                                                                                                      | -              | `7yfhcn2349cr32f`                                                                         |
| `DATABASE_SCHEMA`                  | Postgres schema                                                                                                                                                                                                                                                                                                                        | `postgres`     | `libre-closet-schema`                                                                     |
| `DATABASE_SSL`                     | Use SSL for Postgres                                                                                                                                                                                                                                                                                                                   | `false`        | `true`                                                                                    |
| `FILE_STORAGE_TYPE`                | `local` or `object` (S3)                                                                                                                                                                                                                                                                                                               | `local`        | `object`                                                                                  |
| `OBJECT_STORAGE_ACCESS_KEY_ID`     | S3 access key                                                                                                                                                                                                                                                                                                                          | -              | `AKIAIOSFODNN7EXAMPLE`                                                                    |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | S3 secret key                                                                                                                                                                                                                                                                                                                          | -              | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`                                                |
| `OBJECT_STORAGE_ENDPOINT`          | S3-compatible endpoint URL                                                                                                                                                                                                                                                                                                             | -              | `https://s3.example.com:8443`                                                             |
| `OBJECT_STORAGE_REGION`            | S3 region                                                                                                                                                                                                                                                                                                                              | `us-east-1`    | `us-west-1`                                                                               |
| `OBJECT_STORAGE_BUCKET_NAME`       | S3 bucket name                                                                                                                                                                                                                                                                                                                         | `libre-closet` | `my-awesome-closet-manager-bucket`                                                        |
| `EMAIL_FROM_ADDRESS`               | From address for password reset emails                                                                                                                                                                                                                                                                                                 | -              | `LibreCloset@example.com`                                                                 |
| `EMAIL_TRANSPORT`                  | `gmail` or `mailgun`                                                                                                                                                                                                                                                                                                                   | `gmail`        | `mailgun`                                                                                 |
| `EMAIL_API_KEY`                    | Mailgun API key                                                                                                                                                                                                                                                                                                                        | -              | `fyhn2437cryb248cbrdc32`                                                                  |
| `PUBLIC_VAPID_KEY`                 | Web push - generate for production                                                                                                                                                                                                                                                                                                     | -              | `BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U` |
| `PRIVATE_VAPID_KEY`                | Web push - generate for production                                                                                                                                                                                                                                                                                                     | -              | `UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls`                                             |

Generate JWT secret:

```bash
openssl rand -base64 60
```

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

---

## Development

### Prerequisites

- Node (see `.nvmrc`) - install via [nvm](https://github.com/nvm-sh/nvm)
- Docker (optional, for Postgres testing)

```bash
nvm install && nvm use
npm install
cp .env .env.local     # override defaults locally (gitignored)
npm run start:dev
```

### Scripts

```bash
npm run start:dev       # watch mode
npm run start:prod      # production
npm run test            # unit tests
npm run test:e2e        # Playwright end-to-end
npm run test:cov        # coverage
npm run precommit       # lint + test + lighthouse (run before committing)
```

### Migrations

```bash
# SQLite (build first due to config differences)
npm run build
npx mikro-orm migration:create --config mikro-orm.sqlite.cli-config.ts

# PostgreSQL
npx mikro-orm migration:create --config mikro-orm.postgres.cli-config.ts
```

### Docker build

```bash
# Build image
docker build --no-cache -f docker/Dockerfile . -t libre-closet:latest

# Cross-compile for linux/amd64 (e.g. building on Apple Silicon for a VPS)
docker buildx build --platform linux/amd64 --no-cache -f docker/Dockerfile . -t libre-closet:latest
```

---

## Deployment recommendations

For most self-hosters: deploy to a VPS via [Coolify](https://coolify.io/) or Portainer using the docker-compose above with SQLite + local storage. SQLite handles thousands of users without issue - see [DjangoCon 2023: Use SQLite in Production](https://youtu.be/yTicYJDT1zE).

If you need horizontal scaling later, switch to S3-compatible storage and add [Litestream](https://litestream.io/) for streaming SQLite backups before considering a PostgreSQL migration.

---

## Contributing

PRs and issues are welcome. This project is licensed under AGPL-3.0 - contributions must be compatible with that license.

---

## License

[GNU AGPL-3.0](LICENSE)

---

## Star History

[![Star History Chart](https://api.star-history.com/image?repos=Lazztech/Libre-Closet&type=date&legend=top-left)](https://www.star-history.com/?repos=Lazztech%2FLibre-Closet&type=date&legend=top-left)
