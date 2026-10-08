# 衣物手动 AI 整理与预览采用 TESTS

- 上游：docs/plan.md、docs/task.md（用户认可 TASKS 后方可施工）
- 当前轮次：衣物手动 AI 整理与预览采用
- 自动化 TEST：有
- 无自动化原因：不适用
- 施工固定点：d479aa7fa7b75f64afc6f092c029f4bc199311ed
- 当前阶段：用户于 2026-10-08 确认按现有验收范围关闭整轮 P6；未验项及原 SPEC GAP 保留，详见 #P6-CURRENT-CLOSED-20261008。既有各场景的实际执行者、原结论与覆盖边界不改写。
- 当前 P5：返修后回归入场门禁 ready；既有 CLOSURE-1 的 Standards、Spec 双轴均 PASS，两条冻结阻断均 CLOSED，剩余返修配额 1/2。原报告已取回并登记于 #P5-CLOSURE-1-RECOVERED-20261008；本次没有重新评审或消耗配额。
- P3 只登记资产与可复跑命令，不编写新增测试代码；第一次开工由 P4 写入当时 HEAD 完整 SHA 并锁定。
- 后端命令显式使用 Node 22.23.3；每个 PowerShell 命令都自带 TZ=UTC。测试使用内存 SQLite、测试 JWT、假分割/生成和私有存储，不读取生产库或进行外网模型请求。
- 新集成载体通过当前 WardrobeModule 等公开入口搭建隔离测试应用，不启动生产 AppModule 的配置和自动迁移；外部端口明确覆盖。新增入口缺失的首轮红应是公开路径/行为不满足，不能把编译、模块载入或依赖安装问题记成产品红。
- 所有新用例使用稳定 TEST-xxx 名称前缀。shared fixture 的改动影响定义时须同步资产版本/哈希，既有保护意图不变；完整执行证据只落本文件。

## 本轮 TEST Manifest

| Asset ID | 名称 | 来源类型 | 定义版本 | 准备阶段 TEST 状态（历史） | 对应 TASK | P5 状态 |
|---|---|---|---:|---|---|---|
| TEST-014 | 现有小程序结构守卫 | reuse | 1 | reused-green | TASK-01a/TASK-01b | PASS |
| TEST-015 | 原图单次保存与私有图片主人隔离 | new | 6 | red | TASK-01a/TASK-01b | PASS |
| TEST-016 | 五类固定路由与一张模型生成 | new | 4 | red | TASK-02a/TASK-02b | PASS |
| TEST-017 | 手动触发与候选预览页面事件 | new | 4 | red | TASK-02a/TASK-02b | PASS |
| TEST-018 | 持久恢复与一次派发后端合同 | new | 3 | red | TASK-03a/TASK-03b | PASS |
| TEST-019 | 退出超时查询与身份隔离页面事件 | new | 3 | red | TASK-03a/TASK-03b | PASS |
| TEST-020 | 采用原子切图及所有当前出口一致 | new | 3 | red | TASK-04a/TASK-04b | PASS |
| TEST-021 | 明确采用及统一私有图片解析事件 | new | 2 | red | TASK-04a/TASK-04b | PASS |
| TEST-022 | 新旧备份保留图片且不重放生成 | adapt | 1 | red | TASK-05a/TASK-05b | PASS |
| TEST-023 | 衣橱图片复制独立且源只读 | adapt | 1 | red | TASK-05a/TASK-05b | PASS |

历史轮次有重复编号但不同语义；Derived From 以归档路径加旧 ID 精确消歧。本轮不覆盖这些历史 ID，不建立永久总索引。

## TEST Asset · TEST-014 · 现有小程序结构守卫

<a id="TEST-014"></a>

### 资产定义

- Asset ID：TEST-014
- 来源类型：reuse
- 历史来源：当前 scripts/validate-miniapp-shell.cjs，原无稳定资产编号，本轮首次登记。
- Derived From：无
- 定义版本：1
- 定义哈希：SHA-256 d4ac7c248e9aa90f99d11d99dbbf8f8450d54c441ec92dc745eb56a13d789e9f（载体原始文件字节）。
- 覆盖条目：AC-01～05 的已有小程序入口兼容，CC-06。
- Test Seam：项目已有小程序静态合同。
- 测试定义载体：scripts/validate-miniapp-shell.cjs（已存在，只读复用）。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 完整调用命令：npm run test:miniapp。
- 对应 TASK：TASK-01a、TASK-01b。
- 复用判断：当前命令实际通过，保持原有页面/API 结构保护，无需改语义；不能拿它替代新增事件测试。

### 测试定义

- 状态：reused-green
- 定义：现有 scripts/validate-miniapp-shell.cjs 原样运行，不修改守卫；固定测试名称“TEST-014 现有小程序结构守卫”。来源、命令和哈希已核对；仅用于既有结构回归，不替代新的原图/页面事件测试。

### 本轮执行记录

<a id="TEST-014-P4-01a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P3 改前来源核对 | 2026-10-06 | 当前 youhua 工作区，无产品改动 | 0 | 原生小程序静态检查通过 | baseline-green |
| P4 基线 | 2026-10-06 | feature/garment-image-normalization；HEAD=d479aa7fa7b75f64afc6f092c029f4bc199311ed；产品代码未改 | 0 | Native mini-program validation passed；原守卫未修改 | reused-green |
| P4 记录原样复跑 | 2026-10-06T15:14Z | feature/garment-image-normalization；同一 HEAD + 本卡测试；从资产记录读取原命令 | 0 | Native mini-program validation passed；定义 SHA-256 未变；无相关失败输出 | reused-green |
| P4 实现后 | 历史占位 | 已由 [TEST-014-P4-01b](#TEST-014-P4-01b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

<a id="TEST-014-P4-01b"></a>

TASK-01b 追加执行记录（上方 TASK-01a 结果和测试定义保持不变）：

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样复跑 | 2026-10-06 | feature/garment-image-normalization；HEAD=d479aa7fa7b75f64afc6f092c029f4bc199311ed + TASK-01a 冻结测试 | 0 | 原样 npm run test:miniapp；Native mini-program validation passed | reused-green |
| P4 实现后原样复跑 | 2026-10-06T15:43:51Z | 同一 HEAD + TASK-01b 白名单实现，未提交 | 0 | 原样 npm run test:miniapp；结构检查通过；守卫 SHA-256 与定义版本 1 不变 | green |

本卡 latest 有效 P4 结果为上述 green；上方尚未执行占位属于历史记录，不是本卡当前结果。仅证明结构兼容，原图事件的补充本地检查见 TEST-015-P4-01b，不替代手机验收。

## TEST Asset · TEST-015 · 原图单次保存与私有图片主人隔离

<a id="TEST-015"></a>

### 资产定义

- Asset ID：TEST-015
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：6
- 定义哈希：SHA-256 ab1d03d1c2e3503338fd5ac4b1bbd7eb1579692668d0a874b6ad0cdbfd58be91；按下表顺序拼接各载体的 UTF-8 相对路径、NUL、原始文件字节、NUL 后计算，包含各文件中的既有守卫，不只哈希名称。
- 覆盖条目：AC-01、EX-01、EX-03、HC-02、HC-07、CC-01。
- Test Seam：真实新增与图片角色路由 → 真实衣物服务 → 内存 SQLite；文件存储/分割为可观测假端口，测试 JWT 区分两个主人。
- 测试定义载体：src/wardrobe/garment-image-normalization.integration.spec.ts、src/dal/migrations/garment-image-normalization.migration.spec.ts、src/file/file-service.abstract.spec.ts、src/file/local-file/local-file.service.spec.ts、src/file/s3-file/s3-file.service.spec.ts、src/file/controller/file.controller.spec.ts、src/wardrobe/garment.service.spec.ts、src/wardrobe/miniapp-wardrobe.controller.spec.ts；新增断言统一前缀 TEST-015。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 对应 TASK：TASK-01a、TASK-01b。
- 复用判断：现有测试无 originalPhoto、私有读图和双图保存断言；迁移先例只提供执行方法，不能复用成行为证明。

完整调用命令：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/garment-image-normalization.integration.spec.ts src/dal/migrations/garment-image-normalization.migration.spec.ts src/file/file-service.abstract.spec.ts src/file/local-file/local-file.service.spec.ts src/file/s3-file/s3-file.service.spec.ts src/file/controller/file.controller.spec.ts src/wardrobe/garment.service.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts -t "TEST-015"
~~~

### 测试定义

- 状态：red
- 定义：上述 8 个载体已落地，固定 TEST-015 名称前缀，共 37 个新用例；原有 28 个用例不删除、不放宽，聚焦命令只选新用例。证明上传原字节只消费一次、originalPhoto 不经抠图/生成、默认 photo 只抠一次、保存不生成、失败不虚称已保存；历史原图仍空。迁移保留旧行与 status 列、唯一 garment 任务约束及双数据库 SQL 对应。受主图片读取与公共 file/nobg/watermark、编码路径绕过都验证；另一主人/未登录不得取得新增私有字节。私有角色 URL 带 ?v=<File.id>，缺失/无效/陈旧版本拒绝；响应为 private, no-store。不是只断言查库参数或随机文件名。
- 隔离夹具：真实 WardrobeModule、FileModule、GarmentService、LocalFileService、ORM、JWT 和 Fastify 注入请求；两个虚拟主人。仅存储字节、阿里云抠图及外部 fetch 为假端口。SQLite 为 :memory:，配置不读环境变量或 .env，DATA_PATH 的全部写入进入内存 Map，不创建目录、不读真实衣橱；QWEN_IMAGE_ENABLED=false，外网 fetch 一旦调用即失败。
- 防止假绿：权限/版本反例先要求同一主人正向读取成功；迁移从固定的 17 份既有 SQLite 迁移建立旧 schema，新增迁移尚不存在时保留旧 schema，由缺失字段/表合同断言报红，不用导入失败代替红灯。PostgreSQL 本卡仅核对迁移 SQL，不声称连接真实 PostgreSQL。

| 定义载体（按聚合哈希顺序） | 固定用例组 / 数量 | 文件 SHA-256 |
|---|---|---|
| src/wardrobe/garment-image-normalization.integration.spec.ts | TEST-015 原图保存与私有图片真实 HTTP 边界；17：上传、原图权限、账号/匿名/关闭全局鉴权、版本、公开/编码绕路、旧图兼容 | 52730c7447099d755a3dd7f35809757ed313d36fa443b60e4791730822038d38 |
| src/dal/migrations/garment-image-normalization.migration.spec.ts | TEST-015 原图与当前整理记录数据库迁移合同；3：SQLite 旧行/status/up/down、任务唯一/级联、PostgreSQL SQL 对应 | 6e2415a209192be2edb597b35545b82943ebd91d2f80bcee3f088ef0b3e7f1a4 |
| src/file/file-service.abstract.spec.ts | TEST-015 双图保存与原图失败；2：一次读流、原字节、一次抠图、写原图失败停止 | 01c8255f508a02d03560ff69e9094ec049ef6d460057bc32f76c44c69971a472 |
| src/file/local-file/local-file.service.spec.ts | TEST-015 LocalFileService 私有字节合同；2：原字节/主人/私有名、公开分享拒绝与内部读取 | 82e1f65252a50a7f7cc3dbcbdd3b4e2447c291ce061cc7d2829fec1db8316ab8 |
| src/file/s3-file/s3-file.service.spec.ts | TEST-015 S3FileService 私有字节合同；2：原字节/主人/ACL、公开分享拒绝与内部读取 | e71f01d79a8b8269f252f7c965545f07adfa0a956ffcabf0d53a3c89a1ca90c0 |
| src/file/controller/file.controller.spec.ts | TEST-015 FileController 公开绕路保护；7：五种路径、nobg、普通旧图兼容 | 8b58fd457879ed9758257e28dcf6de3869666ad2325cf33569814a7cbd6f195c |
| src/wardrobe/garment.service.spec.ts | TEST-015 衣物公开行为；3：相机双图/资料、失败不落衣物、原图加载/主人 | 8b8c85dfc5fad3ccb74a9e084c964c605a19b511460d4afee8ebbd7aef2f626e |
| src/wardrobe/miniapp-wardrobe.controller.spec.ts | TEST-015 正常新增由服务端指定相机来源，忽略客户端伪造的图片来源；1 | 75fa3da6c6aee8b58ee4351ab7759dfe4c287bc161c70f4bba035e44a7135a24 |

### 本轮执行记录

<a id="TEST-015-P4-01a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 改前相关旧测试 | 2026-10-06 | HEAD=d479aa7fa7b75f64afc6f092c029f4bc199311ed；测试改动前 | 0 | 下方 6 份既有测试完整命令通过，6 套 / 28 用例；不是 P5 全量回归 | baseline-green |
| P4 夹具调试（不计有效红） | 2026-10-06 | 本卡测试编写中 | 1 | 有绝对 import 路径及 fs.promises 假端口初始化问题；已只修复测试载体 | invalid-test-setup |
| P4 基线 | 2026-10-06T15:11Z | feature/garment-image-normalization；同一 HEAD + 冻结测试，产品代码未改 | 1 | 8 套正常载入；35 failed、2 passed、28 skipped；均为新合同缺失断言，无导入/语法/环境失败 | red |
| P4 记录原样复跑 | 2026-10-06T15:14Z | feature/garment-image-normalization；同一 HEAD + 冻结测试；从资产记录读取原命令 | 1 | 8 套 / 37 新用例：35 failed、2 passed；28 旧用例按固定筛选 skipped；7.616 秒；35 条均为断言失败，0 夹具/导入/语法错误，聚合哈希未变 | red |
| P4 实现后 | 历史占位 | 已由 [TEST-015-P4-01b](#TEST-015-P4-01b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

改前相关旧测试完整命令（仅历史基线，不替代本资产上方不可变命令）：

~~~powershell
$env:TZ='UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/file/file-service.abstract.spec.ts src/file/local-file/local-file.service.spec.ts src/file/s3-file/s3-file.service.spec.ts src/file/controller/file.controller.spec.ts src/wardrobe/garment.service.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts
~~~

最短失败证据：真实 POST 成功后 originalPhoto 为 undefined；主人新角色路径期望 200 实得 404；公开 file/nobg/watermark 和编码路径实得 200 而非拒绝；双图/私有 Buffer 公开契约尚缺失；SQLite 没有 original_photo_id 和任务表，PostgreSQL 缺扩展 SQL。两条已绿为普通旧图兼容守卫，不能拿来宣布原图或权限已经实现。无收费模型、无真实磁盘/数据库写入；本卡权威结果为 TEST-015 的 red，TEST-014 的 reused-green 只作基线守卫。

<a id="TEST-015-P4-01b"></a>

TASK-01b 追加执行记录（上方定义、命令、断言及 TASK-01a 红证据不变；本卡 latest 有效 P4 结果为 green）：

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样复跑 | 2026-10-06 | feature/garment-image-normalization；HEAD=d479aa7fa7b75f64afc6f092c029f4bc199311ed + TASK-01a 冻结测试 | 1 | 从资产读取原命令；8 套载入，35 failed、2 passed、28 skipped；7.355 秒；原图/路由/schema 缺失断言与上卡一致 | red |
| P4 第一轮实现 | 2026-10-06 | 同一 HEAD + 本卡实现中工作树 | 1 | 36 passed、1 failed、28 skipped；8.098 秒；真实 ORM 普通 findOne 的 photo 仅有 ID，读取 fileName 失败；只补图片 eager 加载，未改测试 | red |
| P4 实现后原样复跑 | 2026-10-06T15:43:51Z | 同一 HEAD + 本卡 19 个白名单实现文件，未提交 | 0 | 8 套 / 37 新用例全部通过，28 旧用例按固定筛选 skipped；7.931 秒；原图字节/单次抠图、主人隔离、角色版本、公共绕路、迁移及历史兼容通过 | green |
| P4 本卡要求的整体回归 | 2026-10-06T15:44:08Z | 同一 HEAD + 同一实现工作树 | 0 | 下方原样完整命令组最终退出 0；43 套 / 277 项通过，无跳过；Jest 23.254 秒；小程序结构与 TypeScript 无产物编译通过 | green |
| P4 补充本地页面检查调试 | 2026-10-06T15:45:14Z | 同一实现工作树，未修改冻结载体 | 1 | 一次性检查在 API 的登录 Promise 微任务之前统计下载，0 !== 1；只修正检查的等待时点，不是产品失败或有效红证据 | invalid-test-setup |
| P4 补充本地页面检查 | 2026-10-06T15:45:35Z | 同一实现工作树，未修改冻结载体 | 0 | 下方一次性命令：真实 api.js/详情 Page + 假 wx；原图私有请求头、URL 版本/身份隔离、合并下载、失败重试、原图预览及退出后的迟到结果拦截通过；无实际网络 | green |

证据核对：TEST-015 的 8 个载体逐文件哈希及聚合 SHA-256 仍为 fc7a3363b68b3be94615f710aa7f879da1aea58119256c4c73ae63706b97ccfb；TEST-014 仍为 d4ac7c248e9aa90f99d11d99dbbf8f8450d54c441ec92dc745eb56a13d789e9f。TEST Manifest/定义中的 red 或 reused-green 是冻结的准备卡结果，本卡仅追加执行结果，没有修改身份、版本、命令或断言。固定点未变；全部结果来自未提交工作树。

本卡整体回归完整命令（TASK-01b 明确要求的验证，不等于已执行 P5 正式评审）：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run test:miniapp
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npx --yes --package=node@22.23.3 -- node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.build.json
~~~

补充本地页面检查完整命令（一次性诊断，不新建或改写 TEST Asset；工作目录仍为 E:/orca/Libre-Closet/youhua，读取源码明确使用 UTF-8）：

~~~powershell
+@'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createPrivateImageResolver } = require('./miniprogram/utils/image-source');
const base = 'https://aimatchwear.asia';
const original = base + '/api/miniapp/garments/7/photos/original?v=11';
const publicPhoto = base + '/file/legacy.webp';
let token = 'fake-owner-a';
const downloads = [];
const resolver = createPrivateImageResolver({
  baseUrl: base, getIdentity: () => token,
  download: options => downloads.push(options),
});
const downloaded = (index, path) => downloads[index].success({
  statusCode: 200, tempFilePath: path, header: { 'Content-Type': 'image/png' },
});
(async () => {
  const first = resolver.resolvePrivateImageUrls({ originalPhotoUrl: original });
  const second = resolver.resolvePrivateImageUrls({ originalPhotoUrl: original });
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].header.Authorization, 'Bearer fake-owner-a');
  assert.equal(downloads[0].url.includes(token), false);
  downloaded(0, 'wxfile://owner-a-original.png');
  assert.equal((await first).originalPhotoUrl, 'wxfile://owner-a-original.png');
  assert.deepEqual(await second, await first);
  assert.equal((await resolver.resolvePrivateImageUrls({ photoUrl: publicPhoto })).photoUrl, publicPhoto);
  const foreign = 'https://other.invalid/api/miniapp/garments/7/photos/original?v=11';
  assert.equal((await resolver.resolvePrivateImageUrls({ originalPhotoUrl: foreign })).originalPhotoUrl, foreign);
  assert.equal(downloads.length, 1);
  const changedVersion = resolver.resolvePrivateImageUrls({ originalPhotoUrl: original.replace('v=11', 'v=12') });
  assert.equal(downloads.length, 2);
  downloaded(1, 'wxfile://new-version.png');
  await changedVersion;
  token = 'fake-owner-b';
  const oldIdentity = resolver.resolvePrivateImageUrls({ originalPhotoUrl: original });
  token = 'fake-owner-c';
  downloaded(2, 'wxfile://must-not-display.png');
  await assert.rejects(oldIdentity, /登录身份已变化/);
  const failure = resolver.resolvePrivateImageUrls({ originalPhotoUrl: original });
  downloads[3].fail();
  await assert.rejects(failure, /图片暂时无法加载/);
  const retry = resolver.resolvePrivateImageUrls({ originalPhotoUrl: original });
  downloaded(4, 'wxfile://owner-c.png');
  await retry;

  const apiModule = { exports: {} };
  const pageDownloads = [];
  const previews = [];
  const wx = {
    getStorageSync: () => 'fake-page-owner',
    downloadFile: options => pageDownloads.push(options),
    request: options => options.success({
      statusCode: 200, data: { item: { id: 7, name: '测试衣物', photoUrl: publicPhoto, originalPhotoUrl: original } },
    }),
    previewImage: options => previews.push(options),
  };
  vm.runInNewContext(fs.readFileSync('miniprogram/utils/api.js', 'utf8'), {
    module: apiModule, require: path => {
      assert.equal(path, './image-source'); return { createPrivateImageResolver };
    }, wx, console, Promise,
  });
  let definition;
  vm.runInNewContext(fs.readFileSync('miniprogram/pages/garment-detail/index.js', 'utf8'), {
    require: path => { assert.equal(path, '../../utils/api'); return apiModule.exports; },
    Page: value => { definition = value; }, wx, Promise,
  });
  const page = Object.assign({}, definition, {
    data: Object.assign({}, definition.data, { id: '7' }),
    setData(values) {
      for (const [key, value] of Object.entries(values)) {
        const parts = key.split('.');
        let target = this.data;
        for (const part of parts.slice(0, -1)) target = target[part];
        target[parts.at(-1)] = value;
      }
    },
  });
  await page.loadGarment();
  assert.equal(page.data.garment.name, '测试衣物');
  const preview = page.previewOriginalPhoto();
  await Promise.resolve();
  assert.equal(pageDownloads.length, 1);
  assert.equal(pageDownloads[0].header.Authorization, 'Bearer fake-page-owner');
  pageDownloads[0].success({ statusCode: 200, tempFilePath: 'wxfile://page-original.png' });
  await preview;
  assert.equal(previews.length, 1);
  assert.equal(previews[0].current, 'wxfile://page-original.png');
  assert.equal(previews[0].urls[0], 'wxfile://page-original.png');
  assert.equal(page.data.originalLoading, false);
  page.data.garment.originalPhotoUrl = original.replace('v=11', 'v=13');
  const latePreview = page.previewOriginalPhoto();
  await Promise.resolve();
  page.onUnload();
  const afterUnload = JSON.stringify(page.data);
  pageDownloads[1].success({ statusCode: 200, tempFilePath: 'wxfile://late.png' });
  await latePreview;
  assert.equal(previews.length, 1);
  assert.equal(JSON.stringify(page.data), afterUnload);
  const template = fs.readFileSync('miniprogram/pages/garment-detail/index.wxml', 'utf8');
  assert.match(template, /wx:if="{{garment\.originalPhotoUrl}}"[^>]*bindtap="previewOriginalPhoto"/);
  console.log('本地原图查看检查通过：私有头、版本/身份隔离、重试、真实 Page 预览和退出拦截；无网络请求。');
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
'@ | npx --yes --package=node@22.23.3 -- node -
~~~

范围与待验收：真实 WardrobeModule/ORM/HTTP 权限链和两种存储适配器的假端口已验证，SQLite 迁移 up/down 仅在内存库运行；PostgreSQL 只核对 SQL。S3 上传未设置 public-read，但真实桶策略是否允许裸读仍需获准后验证。页面检查不是微信真机验收，沙盒新增/重进、原图手机显示待验收。保存未接入 AI 生成；五类生成、候选采用、全入口图片映射、备份及复制留给后续卡。没有收费调用、生产数据读写、生产迁移、暂存/提交或部署；P5/P6 保持未执行。

收尾核对（2026-10-06，退出码 0）：git -c core.safecrlf=false diff --check 通过；重新读取 TASK/TEST，TASK-01b 只有一个 green 状态且指向本节，TASK-01a 保持 red，02a～05b 保持 pending。逐文件/聚合哈希、TEST-014/015 定义与命令、施工固定点和分支均再次核对一致；当前全部变更只属于本卡白名单及此前准备卡/已认可规划文档，没有暂存。

TASK-02a 共享夹具维护记录：只增加假图像 fetch 注入、测试配置重置与 TEST-016 用例，TEST-015 的 37 项断言未删除或放宽；外层包装改为不带编号，避免筛选 TEST-015 时误选 TEST-016。因载体字节改变登记 TEST-015 定义版本 2，旧版本 1 红绿证据保留。2026-10-06T16:25Z 原样 TEST-015 命令退出 0：8 套 / 37 passed、45 skipped，7.529 秒；原图/权限基线未变。

## TEST Asset · TEST-016 · 五类固定路由与一张模型生成

<a id="TEST-016"></a>

### 资产定义

- Asset ID：TEST-016
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：4
- 定义哈希：SHA-256 78de768ff26edaf99d9c2b58a565a2d4a22c94e3fa245190e47d3ef5088598d8；依次按 src/ai/garment-image.service.spec.ts、src/wardrobe/garment-image-normalization.integration.spec.ts 的 UTF-8 相对路径、NUL、原始字节、NUL 聚合。
- 覆盖条目：AC-02、AC-05、HC-03、HC-04、HC-05、CC-02。
- Test Seam：真实整理入口的类别选择，以及 GarmentImageService.generate 的 fetch 注入。
- 测试定义载体：src/ai/garment-image.service.spec.ts、src/wardrobe/garment-image-normalization.integration.spec.ts，固定 TEST-016 名称前缀。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 对应 TASK：TASK-02a、TASK-02b。
- 复用判断：识图请求不是图像生成，不能以 Vision 原用例冒充固定 prompt/n=1 验证。

完整调用命令：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/ai/garment-image.service.spec.ts src/wardrobe/garment-image-normalization.integration.spec.ts -t "TEST-016"
~~~

### 测试定义

- 状态：red
- 定义：32 个固定 TEST-016 用例（模型公开边界 15 项、真实 HTTP 分类/存储链 17 项）。五类已确认输入与冲突/未知类别；结构化品类优先、旧细分类兜底、八类不变；通过实际请求文本的冻结 SHA 验证五段提示词与 20261006-v1，单件品牌/客户端自由 prompt 不扩写。实际请求固定 qwen-image-3.0-pro、n=1、size=1024*1024、seed=701、prompt_extend=false、watermark=false；输入归一为 1024 方形 JPEG，不调用 Vision。配置缺失发送前 failed，供应商明确拒绝 failed，断网/响应不完整 uncertain；不重试。ready 前候选字节落盘、主人可读且他人拒绝，photo/品牌未自动改变；缺原图、未知/冲突类别和非法 attemptKey 禁止开始。首轮模型类不存在用公开合同断言报红，不依赖缺文件 import 失败。
- 载体 SHA-256：src/ai/garment-image.service.spec.ts=77a8b91961a030653399c320f220d6c8d9211e9c0e5dcdb5c042db420d10dc37；共享集成=52730c7447099d755a3dd7f35809757ed313d36fa443b60e4791730822038d38。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 历史占位 | 已由 [TEST-016-P4-02a](#TEST-016-P4-02a) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P4 实现后 | 历史占位 | 已由 [TEST-016-P4-02b](#TEST-016-P4-02b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

<a id="TEST-016-P4-02a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 首轮 | 2026-10-06T16:24:54Z | feature/garment-image-normalization；固定点 d479aa7fa7b75f64afc6f092c029f4bc199311ed + 01b 实现 + 本卡测试 | 1 | 2 套正常载入；32 failed、17 skipped，4.686 秒；generate 服务公开合同尚无实现，POST/GET normalization 期望 201/200 实得 404；没有 import/语法/环境失败 | red |
| P4 从记录原样复跑 | 2026-10-06T16:26:27Z | 同一工作树，冻结定义版本 1 | 1 | 32 failed、17 skipped，4.036 秒；相同公开合同/HTTP 404 缺失行为；假 fetch 不外连、提示词哈希已锁定 | red |

本卡仅改测试与台账，没有产品实现改动。下一张实现卡必须原样消费上述两行 PowerShell 命令与聚合哈希。

<a id="TEST-016-P4-02b"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样消费 | 2026-10-06 | 同一固定点 + 02a 冻结定义；未改产品代码 | 1 | 32 failed、17 skipped，3.197 秒；公开 generate 缺失及 normalization 404，与 a 卡原因一致 | red |
| P4 编译检查首轮 | 2026-10-06T16:33Z | 本卡实现中 | 1 | 新任务 create 缺 createdAt/updatedAt 的 TypeScript 必填输入；只在实现补日期，未改实体/测试 | failed |
| P4 实现后原样执行 | 2026-10-06T16:34:16Z | 同一固定点 + 02b 白名单实现，未提交 | 0 | 2 套、32 passed、17 skipped；5.393 秒；协议、五类路由、候选存储与主人权限、未自动换图通过；无相关失败 | green |
| P4 本卡整体回归 | 2026-10-06T16:35:09Z | 同一工作树 | 0 | 原样整体命令组（见 TEST-015-P4-01b）最终退出 0；44 套/309 项通过，22.321 秒；结构与无产物 tsc 通过，无跳过 | green |

TEST-014 原样退出 0；TEST-015 版本 2 原样退出 0（37 passed、45 skipped，8.33 秒）。三份冻结载体的哈希及四项资产定义/命令再核对未变，git diff --check 通过。仅假模型/存储，生成配置未真实开启；本卡回归不是 P5 评审或 P6 通过。

## TEST Asset · TEST-017 · 手动触发与候选预览页面事件

<a id="TEST-017"></a>

### 资产定义

- Asset ID：TEST-017
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：4
- 定义哈希：SHA-256 3db93a0599bbc230e0c381bfb8f28abcff05eaf0d6b7f9bffa4b38e755729170（脚本原始字节）。
- 覆盖条目：AC-02、AC-03、HC-01、CC-02。
- Test Seam：Node VM 注册真实 Page，通过公开页面事件观察 api/wx 行为；WXML 仅补充绑定检查。
- 测试定义载体：scripts/validate-garment-image-normalization.cjs 的 generate-preview 用例，固定 TEST-017 名称。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 完整调用命令：node scripts/validate-garment-image-normalization.cjs --case generate-preview。
- 对应 TASK：TASK-02a、TASK-02b。
- 复用判断：现有页面静态脚本无手动整理事件与“不采用保持旧图”语义，新增资产，不仅搜索按钮文本。

### 测试定义

- 状态：red
- 定义：4 个固定 TEST-017 用例，Node VM 加载真实详情 Page 和实际 api.js，假 wx/业务响应不访问外网。页面加载零 start，startImageNormalization 手动事件提交非空 attemptKey；ready 显示私有下载后的候选，当前 photo 不变。缺原图/不支持说明可见且零开始；dismissNormalizationPreview 只收起预览，零 adopt 和再次 start。实际 API 仅 POST/GET 受保护 normalization 业务路由，带 Bearer、请求只有 attemptKey，不包含模型/自由 prompt。WXML 绑定开始/关闭与候选、使用 aspectFit 完整显示衣物；不只搜索按钮来证明业务事件。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 历史占位 | 已由 [TEST-017-P4-02a](#TEST-017-P4-02a) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P4 实现后 | 历史占位 | 已由 [TEST-017-P4-02b](#TEST-017-P4-02b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

<a id="TEST-017-P4-02a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 首轮 | 2026-10-06T16:24:55Z | 同一固定点 + 01b 实现 + 本卡测试 | 1 | 0 passed、4 failed；缺 startImageNormalization、状态呈现、公开 API 与 WXML 绑定；Page 和现有 api 均正常载入 | red |
| P4 从记录原样复跑 | 2026-10-06T16:26:28Z | 同一工作树，冻结定义版本 1 | 1 | 0 passed、4 failed；相同缺失行为；无真实网络或收费模型 | red |

当前权威结果为 red；不是因测试脚本加载失败报红。源码只由 Node UTF-8 读取。

<a id="TEST-017-P4-02b"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样消费 | 2026-10-06 | 同一固定点 + 02a 冻结定义 | 1 | 4 failed；相同手动事件/状态/API/模板缺失 | red |
| P4 实现后原样执行 | 2026-10-06T16:34:17Z | 同一固定点 + 02b 白名单实现，未提交 | 0 | 4 passed、0 failed；真实 Page/API + 假 wx，零加载生成、手动预览、不采用保持原图、受保护请求均通过 | green |

脚本定义/哈希不变；无真实网络。退出/重启恢复留给下一卡，不用本项证明尚未实现的生命周期行为。

## TEST Asset · TEST-018 · 持久恢复与一次派发后端合同

<a id="TEST-018"></a>

### 资产定义

- Asset ID：TEST-018
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：3
- 定义哈希：SHA-256 bd060f998803a1e7bb7f6fdf3cc79ab6d3c77469c712391930ec5c8d8aa772e8（载体原始字节）。
- 覆盖条目：AC-03、AC-05、EX-04、HC-05、HC-08、CC-03。
- Test Seam：双 Service/Worker 共享真实 SQLite，通过公开 start/get/runPending 与真实 onApplicationBootstrap 启动钩子控制外部 Promise；测试等待钩子实际创建的后台工作，不以辅助恢复入口代替生产启动。
- 测试定义载体：src/wardrobe/garment-image-normalization.integration.spec.ts，固定 TEST-018 名称前缀。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 对应 TASK：TASK-03a、TASK-03b。
- 复用判断：历史后台锁与天气超时没有收费派发/持久恢复合同，new；只借用既有注入方式。

完整调用命令：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/garment-image-normalization.integration.spec.ts -t "TEST-018"
~~~

### 测试定义

- 状态：red
- 定义：10 个固定 TEST-018 用例，保留原 7 个并新增关闭生成开关后的真实启动恢复、已有结果下载、queued 暂停/重新开启。相同/不同 attemptKey 并发开始、双 Worker 领取、明确 failed 后新手动尝试、ready 不重生等边界，计数真实模型端口 POST。queued 重建服务可安全领取；已派发 processing 重启不重投而未知；超时/断网不等于失败或未扣费。完整响应已存 URL 时只恢复原图下载，GET/预览/adopt 不派发；晚到旧 attempt 不覆盖新记录，删除衣物后不回写。新候选存储失败不能污染旧图。禁止用进程内锁 mock 掩盖数据库竞争。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 历史占位 | 已由 [TEST-018-P4-03a](#TEST-018-P4-03a) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P4 实现后 | 历史占位 | 已由 [TEST-018-P4-03b](#TEST-018-P4-03b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

<a id="TEST-018-P4-03a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 首轮夹具检查 | 2026-10-06T16:41Z | 同一固定点 + 02b 实现 + 03a 测试 | 1 | 5 failed、2 passed，其中挂起模型的夹具等待过早导致一次测试自身超时；修正为外部 POST Promise 握手并始终释放，不作为产品红证据 | invalid-test-setup |
| P4 修正后行为检查 | 2026-10-06T16:43Z | 仅修正本卡测试夹具，产品未改 | 1 | 5 failed、2 passed、34 skipped，4.428 秒；recoverOnStartup 未实现、failed 不允许新尝试；无导入/语法/超时错误 | red |
| P4 从记录原样复跑 | 2026-10-06T16:48:25Z | 冻结 TEST-018 版本 1，未提交 | 1 | 5 failed、2 passed、34 skipped，3.019 秒；双 Worker/删除已绿，恢复与新尝试合同仍缺失 | red |

共享夹具维护：TEST-015 升为版本 3、016 升为版本 2，新增恢复用例及假 fetch 重置，不删除或放宽既有断言。原样 TEST-015 为 37 passed、52 skipped（4.991 秒），TEST-016 为 32 passed、24 skipped（4.75 秒）。这些绿是回归守卫，不冒充新增恢复行为已经完成。

<a id="TEST-018-P4-03b"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样消费 | 2026-10-06T16:49Z | 同一固定点 + 03a 冻结载体，产品未改 | 1 | 5 failed、2 passed，3.115 秒；恢复入口/新尝试缺失，与准备卡一致 | red |
| P4 实现后原样执行 | 2026-10-06T16:51Z | 本卡白名单实现，未提交 | 0 | 7 passed、34 skipped，3.202 秒；双 Worker、重建、未知、同图下载、旧次拒绝、删除回写通过 | green |
| P4 本卡整体回归 | 2026-10-06T16:52Z | 同一实现工作树 | 0 | 原样整体命令最终退出 0；44 套/316 项通过，14.661 秒；结构/无产物编译通过 | green |

TEST-014～017 原命令均退出 0（37+32+4 用例及结构守卫）；TEST-014～019 定义/命令、逐文件与聚合哈希再次核对一致，diff --check 通过。未修改准备卡断言。无真实模型/生产操作，P5/P6 未执行。

## TEST Asset · TEST-019 · 退出超时查询与身份隔离页面事件


<a id="TEST-019"></a>

### 资产定义

- Asset ID：TEST-019
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：3
- 定义哈希：SHA-256 3db93a0599bbc230e0c381bfb8f28abcff05eaf0d6b7f9bffa4b38e755729170（载体原始字节）。
- 覆盖条目：AC-03、AC-05、EX-04、HC-05、HC-08、CC-03。
- Test Seam：Page.onShow/onHide/onUnload、开始事件、api 与 wx.downloadFile，受控时钟和 Promise。
- 测试定义载体：scripts/validate-garment-image-normalization.cjs 的 recovery 用例，固定 TEST-019 名称。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 完整调用命令：node scripts/validate-garment-image-normalization.cjs --case recovery。
- 对应 TASK：TASK-03a、TASK-03b。
- 复用判断：静态 shell 守卫不能证明事件重进与一次开始，new。

### 测试定义

- 状态：red
- 定义：8 个固定 TEST-019 用例，保留原 5 个并新增首次读取中断后旧响应在后台/返回后到达、首次读取失败后返回恢复。连点、开始响应超时、后台/关闭、重建 Page、预览中退出、查询晚到等场景；退出停止客户端轮询，回来先查询、不再 start，ready 候选仍在。失败/未知不清空衣物；未知提示不能说未扣费。身份变化后私有图缓存与旧在途返回失效，外域 URL 不得带 Bearer，下载失败为局部错误。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 历史占位 | 已由 [TEST-019-P4-03a](#TEST-019-P4-03a) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P4 实现后 | 历史占位 | 已由 [TEST-019-P4-03b](#TEST-019-P4-03b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

<a id="TEST-019-P4-03a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 首轮 | 2026-10-06T16:41:11Z | 同一固定点 + 02b 实现 + 03a 测试 | 1 | 2 passed、3 failed；超时未查询、无后台停止/恢复与轮询；真实 Page/API 正常载入 | red |
| P4 从记录原样复跑 | 2026-10-06T16:48:25Z | 冻结 TEST-019 版本 1，未提交 | 1 | 2 passed、3 failed；同一缺失行为，身份缓存/局部失败已绿；无真实网络或模型调用 | red |

共享脚本增量扩展及编号选择，TEST-017 升为版本 2；4 个既有事件断言原样仍绿。03b 必须保持本轮载体与资产定义、命令不变，只追加执行记录。

<a id="TEST-019-P4-03b"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样消费 | 2026-10-06T16:49Z | 03a 冻结脚本 | 1 | 2 passed、3 failed；超时未查/生命周期缺失 | red |
| P4 实现后原样执行 | 2026-10-06T16:51Z | 03b 白名单实现，未提交 | 0 | 5 passed、0 failed；退出停止轮询、返回只查原次、超时先查、晚到忽略与身份/局部错误通过 | green |

## TEST Asset · TEST-020 · 采用原子切图及所有当前出口一致

<a id="TEST-020"></a>

### 资产定义

- Asset ID：TEST-020
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：3
- 定义哈希：SHA-256 f78d37e47f1b03a169ba7d334df64c3086fd6c9a4c6b1922c83e5fdc5b4ea467；按载体列表顺序拼接 UTF-8 路径、NUL、原始字节、NUL 聚合。
- 覆盖条目：AC-04、EX-01、EX-02、EX-03、HC-01、HC-05、HC-06、CC-04。
- Test Seam：真实采用公开入口后再读所有衣物卡片生产者，真实 photo 条件更新；推荐算法可用可控公开端口返回衣物，不测试私有序列化方法。
- 测试定义载体：src/wardrobe/garment-image-normalization.integration.spec.ts、src/wardrobe/garment.service.spec.ts、src/wardrobe/miniapp-wardrobe.controller.spec.ts、src/wardrobe/miniapp-outfit.controller.spec.ts、src/wardrobe/miniapp-daily-outfit.controller.spec.ts，固定 TEST-020 名称前缀。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 对应 TASK：TASK-04a、TASK-04b。
- 复用判断：当前 photo 卡片保护可保留，但无采用与前后状态合同，需要 new 资产。

完整调用命令：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/garment-image-normalization.integration.spec.ts src/wardrobe/garment.service.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/miniapp-daily-outfit.controller.spec.ts -t "TEST-020"
~~~

### 测试定义

- 状态：red
- 定义：14 个固定 TEST-020 用例， ready 未采用、首次采用、重复采用、其他主人、陈旧 attempt、随意 File ID、photo 条件冲突、写入失败等边界。只有 photo 改；原图、旧图字节、标签/所有权、模型次数不变。列表/详情/重复候选/推荐/今日穿搭当前出口全覆盖：新选用图走同一受保护角色 URL，采用前后 display URL 的 v 随 File.id 改变，旧版本请求不能返回新图；旧公开图保留形状。adopted 由实际关系派生，不保留会漂移的第二标志。不能仅验证旧关键词消失。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 历史占位 | 已由 [TEST-020-P4-04a](#TEST-020-P4-04a) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P4 实现后 | 历史占位 | 已由 [TEST-020-P4-04b](#TEST-020-P4-04b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

<a id="TEST-020-P4-04a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 首轮 | 2026-10-06T16:58:35Z | 同一固定点 + 03b 实现 + 04a 测试 | 1 | 13 failed、1 passed、93 skipped，4.76 秒；adopt HTTP 404/Owner 方法缺失、推荐与今日仍为公开私有名；衣橱当前映射已绿；五套正常载入 | red |
| P4 从记录原样复跑 | 2026-10-06T16:59:26Z | 冻结版本 1，未提交 | 1 | 13 failed、1 passed，4.306 秒；相同公开行为缺失，无导入/语法/环境失败 | red |

共享夹具增量维护：015 版本 4、016 版本 3、018 版本 2；017 版本 3、019 版本 2。只新增独立编号用例、Page 加载入口参数，不删弱旧断言。原样 015/016/018 命令仍为 37/32/7 passed；017/019 仍为 4/5 passed，无真实网络。

<a id="TEST-020-P4-04b"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样消费 | 2026-10-06T17:00Z | 同一固定点 + 04a 冻结定义 | 1 | 13 failed、1 passed，4.449 秒；相同采用/映射缺失 | red |
| P4 实现后原样执行 | 2026-10-06T17:03Z | 04b 白名单实现，未提交 | 0 | 14 passed、93 skipped，4.704 秒；采用/重复/权限/冲突/失败和当前图版本合同通过 | green |
| P4 本卡整体回归 | 2026-10-06T17:04Z | 同一实现工作树 | 0 | 原样整体命令最终退出 0；44 套/330 项通过，14.621 秒；结构与无产物编译通过 | green |

014～019 原命令全绿；014～021 的定义、命令、逐文件与聚合哈希核对不变，diff --check 通过。未收费、不操作真实衣物或生产；不是 P5/P6 通过。

## TEST Asset · TEST-021 · 明确采用及统一私有图片解析事件

<a id="TEST-021"></a>

### 资产定义

- Asset ID：TEST-021
- 来源类型：new
- 历史来源：无
- Derived From：无
- 定义版本：2
- 定义哈希：SHA-256 3db93a0599bbc230e0c381bfb8f28abcff05eaf0d6b7f9bffa4b38e755729170（载体原始字节）。
- 覆盖条目：AC-04、HC-01、HC-05、HC-06、CC-04。
- Test Seam：真实详情/推荐 Page 事件和 api 响应的受保护图片解析。
- 测试定义载体：scripts/validate-garment-image-normalization.cjs 的 adopt 用例，固定 TEST-021 名称。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 完整调用命令：node scripts/validate-garment-image-normalization.cjs --case adopt。
- 对应 TASK：TASK-04a、TASK-04b。
- 复用判断：已有模板检查没有采用事件、共享 URL 解析及既有推荐缓存合同，new。

### 测试定义

- 状态：red
- 定义：5 个固定 TEST-021 用例，。只有明确点击采用才请求 adopt，成功更新展示/提示，失败保留旧图；预览、重进和重复采用不 start。同一私有 URL 合并下载，按身份及完整带 v 的 URL 隔离；同一衣物 display 路径换 v 后必须下载并显示新图，不能复用旧临时文件。三种图片字段及 list/item/duplicateCandidates/recommendations/today/detail 的实际嵌套形状全部解析。所有仍绑定 photoUrl 的当前模板可使用临时路径；推荐页 onShow 更新已有卡片照片，不调用 recommendOutfit、不改选择/理由。旧公开 URL 原样通过，不把路由映射散落到页面。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 历史占位 | 已由 [TEST-021-P4-04a](#TEST-021-P4-04a) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P4 实现后 | 历史占位 | 已由 [TEST-021-P4-04b](#TEST-021-P4-04b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

<a id="TEST-021-P4-04a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 首轮 | 2026-10-06T16:58:35Z | 同一固定点 + 03b 实现 + 04a 测试 | 1 | 0 passed、5 failed；采用事件/API 图片解析/返回推荐刷新/按钮未实现，真实模块正常载入 | red |
| P4 从记录原样复跑 | 2026-10-06T16:59:26Z | 冻结版本 1，未提交 | 1 | 0 passed、5 failed；相同公开缺失，无真实网络、模型或身份信息 | red |

<a id="TEST-021-P4-04b"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样消费 | 2026-10-06T17:00Z | 04a 冻结脚本 | 1 | 0 passed、5 failed；明确采用/统一解析/现有推荐刷新缺失 | red |
| P4 实现后原样执行 | 2026-10-06T17:03Z | 04b 白名单实现，未提交 | 0 | 5 passed、0 failed；明确采用、失败保图、六种真实 API 形状、版本下载与仅刷新现有推荐通过 | green |

## TEST Asset · TEST-022 · 新旧备份保留图片且不重放生成

<a id="TEST-022"></a>

### 资产定义

- Asset ID：TEST-022
- 来源类型：adapt
- 历史来源：docs/archive/2026-08-22-废除衣物库存状态/test.md 的 TEST-004；当前载体 src/wardrobe/miniapp-wardrobe.controller.spec.ts。
- Derived From：上述归档路径的 TEST-004。
- 定义版本：1
- 定义哈希：SHA-256 75fa3da6c6aee8b58ee4351ab7759dfe4c287bc161c70f4bba035e44a7135a24（载体原始字节）。
- 覆盖条目：HC-02、HC-05、HC-06、HC-07、EX-03、CC-05。
- Test Seam：MiniappWardrobeController.exportBackup/importBackup → Transfer 与数据 Owner。
- 测试定义载体：src/wardrobe/miniapp-wardrobe.controller.spec.ts，固定 TEST-022 名称前缀及既有 backup 用例。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 对应 TASK：TASK-05a、TASK-05b。
- 复用判断：新增版本 3 与原图/候选/固定输入图引用映射改变语义，分配新 ID；旧 status 不读写及旧资料完整保护仍保留，不修改历史资产。

完整调用命令：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/miniapp-wardrobe.controller.spec.ts -t "TEST-022|backup"
~~~

### 测试定义

- 状态：red
- 定义：11 个新用例与 2 个既有 backup，扩展现有备份用例。版本 1/2 没原图仍为 null；版本 3 原字节/当前图/候选/固定输入图 sourcePhoto 循环保留，新关系指向目标文件且保持私有。必须覆盖采用后当前图等于候选、sourcePhoto 独立的情形，输入字节及 sourcePhotoRef 仍完整；相同 File 去重映射，不能再抠图或生成。处理中快照恢复为未知，不恢复自动派发，供应商凭证/URL 不入用户备份；包中声明的任一图片引用缺失即拒绝，合法的无原图旧记录保持 null，不拿展示图填原图。继续保持旧资料、统计和库存状态退役保护。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 历史占位 | 已由 [TEST-022-P4-05a](#TEST-022-P4-05a) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P4 实现后 | 历史占位 | 已由 [TEST-022-P4-05b](#TEST-022-P4-05b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

<a id="TEST-022-P4-05a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 首轮 | 2026-10-06T17:10Z | 同一固定点 + 04b 实现 + 05a 测试 | 1 | 11 failed、2 passed、15 skipped，2.003 秒；仍导出版本 2 丢新图片，旧包导入仍走抠图入口；真实 Owner/内存库正常 | red |
| P4 从记录原样复跑 | 2026-10-06T17:12:23Z | 冻结版本 1，未提交 | 1 | 11 failed、2 passed、15 skipped，1.955 秒；相同保图/零抠图合同缺失，无载入/环境失败 | red |

只新增独立备份用例，不修改历史退役 status/资料断言；新旧共用载体令 015 升为版本 5、020 为版本 2。原样 015 为 37 passed、020 为 14 passed，既有保护不变。

<a id="TEST-022-P4-05b"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样消费 | 2026-10-06T17:13Z | 同一固定点 + 05a 冻结定义 | 1 | 11 failed、2 passed，1.926 秒；相同图片保留/零抠图行为缺失 | red |
| P4 实现后原样执行 | 2026-10-06T17:17Z | 05b 白名单实现，未提交 | 0 | 13 passed、15 skipped，2.235 秒；版本 3 四类图片循环、独立输入、静态未知、全包缺引用、版本 1/2 与原资料通过 | green |
| P4 收尾原样十组及整体复跑 | 2026-10-06T17:27:38Z～17:28:42Z | 最终实现含普通换图旧字节保护；HEAD 未变 | 0 | TEST-014～023 逐条原命令退出 0，继而 44 套/346 项、15.336 秒；结构及无产物编译最终退出 0 | green |

最终施工复跑清单（不是 P5）：014 结构通过；015/016/018/020/022/023 分别 37/32/7/14/13/8 passed；017/019/021 页面事件分别 4/5/5 passed。执行顺序与 manifest 相同，每条失败立即退出，然后执行下方 P5 Current 中同一完整回归命令组。供应商/存储为假端口，未收费或写真实用户数据。

收尾补充检查：2026-10-06T17:27:11Z，用真实 GarmentService.update 和可观察假文件端口验证三种换图；私有图及带原图的旧抠图零删除调用，历史公开无原图仍为既有两次调用，三者均保存新图并保留原图引用，退出 0。只作为 05b 补充施工凭证，不增改已冻结 TEST 定义。工作目录仍为 E:/orca/Libre-Closet/youhua，完整命令如下（Node 显式 UTF-8 解码 TypeScript）：

~~~powershell
@'
require('reflect-metadata');
require('ts-node').register({transpileOnly:true});
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {GarmentService}=require('./src/wardrobe/garment.service');
const {Garment}=require('./src/dal/entity/garment.entity');
const {File}=require('./src/dal/entity/file.entity');
(async()=>{
  for(const scenario of [
    {name:'私有旧图',old:'private-candidate.png',original:false,expected:[]},
    {name:'新衣物的旧抠图',old:'cutout.webp',original:true,expected:[]},
    {name:'普通历史公开图',old:'legacy.webp',original:false,expected:['legacy.webp','legacy.nobg.webp']}
  ]){
    const oldPhoto=Object.assign(new File(),{id:11,fileName:scenario.old});
    const original= scenario.original ? Object.assign(new File(),{id:10,fileName:'private-original.png'}):null;
    const garment=Object.assign(new Garment(),{id:7,category:'tops',photo:oldPhoto,originalPhoto:original,owner:{id:42}});
    const fresh=Object.assign(new File(),{id:12,fileName:'new.webp'});
    const removed=[];
    let flushCount=0;
    const repo={findOne:async()=>garment,getEntityManager:()=>({flush:async()=>{flushCount++;}})};
    const files={storeImageFromFileUpload:async()=>fresh,delete:async name=>{removed.push(name);},nobgFileName:name=>name.replace('.webp','.nobg.webp')};
    const svc=new GarmentService(repo,{}, {},files);
    const result=await svc.update(7,{photo:{file:Readable.from('test'),mimetype:'image/png',filename:'new.png'}},42);
    assert.equal(result.photo,fresh);
    assert.equal(result.originalPhoto,original);
    assert.equal(flushCount,1);
    assert.deepEqual(removed,scenario.expected);
    console.log(scenario.name+'：换图成功，删除调用 '+removed.length+' 次，符合预期');
  }
})().catch(err=>{console.error(err);process.exitCode=1;});
'@ | npx --yes --package=node@22.23.3 -- node -
~~~

十项资产定义、完整命令、逐文件与聚合哈希在实现前后均一致；冻结 TEST-014 未改。分支 feature/garment-image-normalization，HEAD 与施工固定点一致；白名单及 diff --check 通过，SPEC/PLAN 和无关文件未改。P4 已完成，P5/P6 仍未执行。

## TEST Asset · TEST-023 · 衣橱图片复制独立且源只读

<a id="TEST-023"></a>

### 资产定义

- Asset ID：TEST-023
- 来源类型：adapt
- 历史来源：docs/archive/2026-08-20-衣橱复制到验收沙盒/test.md 的 TEST-002；当前 WardrobeCopyService 载体。
- Derived From：上述归档路径的 TEST-002。
- 定义版本：1
- 定义哈希：SHA-256 ce1bc4d2d9e2b8123df74d4224567d2db16836708a388509bf1f21df101a103e；按载体列表顺序拼接 UTF-8 路径、NUL、原始字节、NUL 聚合。
- 覆盖条目：HC-02、HC-05、HC-06、HC-07、EX-03、CC-05。
- Test Seam：WardrobeCopyService.copy 与 FileService.copyStoredFile，再由目标 Owner 读取新图片。
- 测试定义载体：src/wardrobe/wardrobe-copy.service.spec.ts、src/file/local-file/local-file.service.spec.ts、src/file/s3-file/s3-file.service.spec.ts；新断言固定 TEST-023 前缀，既有复制保护继续执行。
- 工作目录：E:/orca/Libre-Closet/youhua。
- 对应 TASK：TASK-05a、TASK-05b。
- 复用判断：新增原图/展示/候选及独立固定输入图、任务静态快照改变复制语义，adapt 分配新 ID；源不变/全量资料/未标沙盒拒绝保护不删弱。

完整调用命令：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/wardrobe-copy.service.spec.ts src/file/local-file/local-file.service.spec.ts src/file/s3-file/s3-file.service.spec.ts -t "TEST-023|wardrobe copy"
~~~

### 测试定义

- 状态：red
- 定义：5 个新用例与 3 个既有 wardrobe copy，扩展现有复制测试；原图、选用图、候选和固定输入图 sourcePhoto 分别由目标主人拥有，字节完整、私有标记保留，重复源文件通过映射对应，源内容与关系不变。采用后独立的输入图仍复制且 sourcePhotoRef 映射到目标文件，不能引用源 File。通过目标公开读图路径证明独立，源主人普通入口看不到目标私有图。无原图源继续 null；已生成候选可静态恢复，处理中快照不重放。保留完整衣物、搭配、今日穿搭、反馈、件数确认及白名单保护。

### 本轮执行记录

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 结果摘要 | 结论 |
|---|---|---|---:|---|---|
| P4 基线 | 历史占位 | 已由 [TEST-023-P4-05a](#TEST-023-P4-05a) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P4 实现后 | 历史占位 | 已由 [TEST-023-P4-05b](#TEST-023-P4-05b) 的实际记录替代 | 不适用 | 此行不计执行；时间、命令、退出码和输出以链接记录为准 | superseded |
| P5 整体回归 | 历史占位 | 已由 [返修后 P5 Current](#P5-CURRENT-P4-RETURN-20261007) 的本资产实际执行替代 | 不适用 | 此行不计执行，当前命令/退出码/输出见文末全量 manifest | superseded |

<a id="TEST-023-P4-05a"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 首轮检查 | 2026-10-06T17:10Z | 同一固定点 + 04b 实现 + 05a 测试 | 1 | 私有复制名/静态状态缺失已产生行为红；新增非空守卫只判 undefined，null 穿透产生 TypeError，冻结前加强为 toBeTruthy，不作为该用例有效红 | invalid-test-setup |
| P4 从记录原样复跑 | 2026-10-06T17:12:23Z | 冻结版本 1，未提交 | 1 | 4 failed、4 passed、8 skipped，2.537 秒；目标原图为 null/状态 idle，Local/S3 复制失去私有标记；无 TypeError/导入/环境失败 | red |

5 个新用例中合法无原图/沙盒限制已绿，3 个既有完整复制用例保持绿；不强造红灯。外部字节存储与 S3 端口均为假，实际目标字节经 GarmentService.readOwnedPhoto 及整理 Owner 可读/他人拒绝；真实桶权限留待人工验收。

<a id="TEST-023-P4-05b"></a>

| 阶段 | 时间 | 被测版本 / 工作树 | 退出码 | 最短相关输出 | 结论 |
|---|---|---|---:|---|---|
| P4 实现前原样消费 | 2026-10-06T17:13Z | 同一固定点 + 05a 冻结定义 | 1 | 4 failed、4 passed，2.441 秒；缺原图/静态状态/私有复制标记 | red |
| P4 实现后原样执行 | 2026-10-06T17:17Z | 05b 白名单实现，未提交 | 0 | 8 passed、8 skipped，2.609 秒；目标独立可读/源只读、已采用输入图、未知不派发、旧无原图及 Local/S3 原字节私有复制通过 | green |
| P4 收尾原样复跑 | 2026-10-06T17:27:38Z～17:28:42Z | 最终工作树，定义版本 1 未变 | 0 | 本资产与其余九组及整套回归全绿，详见 TEST-022-P4-05b | green |

## P3 已执行基线

以下是真实改前结果，不是新资产红绿证据，也不是 P5 通过。

| 检查 | 工作目录 | 完整命令 | 时间 | 退出码 | 摘要 |
|---|---|---|---|---:|---|
| 既有 Jest 全量 | E:/orca/Libre-Closet/youhua | 下方两行 PowerShell | 2026-10-06 | 0 | 41 套件、240 项通过，40.791 秒 |
| 小程序静态 | 同上 | npm run test:miniapp | 2026-10-06 | 0 | 原生静态检查通过 |
| 无产物编译 | 同上 | npx --yes --package=node@22.23.3 -- node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.build.json | 2026-10-06 | 0 | TypeScript 编译检查通过 |

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand
~~~


### 2026-10-07 基线复现完成（用户已授权，非当时原始日志）

- 固定版本：本文件施工固定点 d479aa7fa7b75f64afc6f092c029f4bc199311ed。用 git archive 导出到独立目录，不切换当前功能分支；package.json/package-lock.json JSON 内容与当前一致，仅连接现有 node_modules，不安装或升级依赖。
- 实际 cwd：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/baseline-source。
- 证据目录：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence；基线逐条测试名称结果载体：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/baseline.jest.json（已实际生成，含 testResults/assertionResults 的文件、完整名称和状态）。
- 原有 Jest/小程序结构/无产物编译三项命令均按本文件记录执行；名称采集仅增加 --json/--outputFile 报告参数，不改变测试选择、测试定义或断言。原始 P3 汇总与失败预检历史保留。
- 执行结果：2026-10-06T18:33Z～18:34Z，原命令组及名称采集均退出 0；两次 Jest 均为 41 套/240 passed、0 failed、0 skipped，结构与无产物编译通过。全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/baseline-original-and-name-capture.log，失败输出无。基线的失败名称集合为空；新增 TDD 红灯不是这份既有基线的失败项。
- 隔离版本核对：186 份 src/配置文件与固定提交内容一致；其中部分由 Git Windows 换行转换，仅 CRLF/LF 不同，无代码内容差异。首次 tar 中文文件名解压失败，改用 ZIP 的新独立目录成功；失败临时目录未删除，不用于结果。当前功能分支与代码/测试定义未改。

原命令完整复现：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run test:miniapp
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npx --yes --package=node@22.23.3 -- node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.build.json
~~~

基线名称级结果采集完整命令：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --json --outputFile="E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/baseline.jest.json"
exit $LASTEXITCODE
~~~


## P5 INITIAL 历史结果（返修前）

| 检查 | 工作目录 | 完整命令 | 时间 | 退出码 | 失败输出 / 未执行原因 | 结论 |
|---|---|---|---|---:|---|---|
| 证据预检 | E:/orca/Libre-Closet/youhua | 下方补证据后的预检完整命令；evidence-precheck.json 为结果载体 | 2026-10-06T18:36:17Z | 0 | 无；10 资产定义/命令/哈希与记录齐全，历史占位已解释，名称级基线存在 | PASS |
| Manifest 全量执行 | 同上 | 下方十项逐条完整命令，均来自本轮 manifest；仅增加退出码透传 | 2026-10-06T18:38:14Z～18:39:25Z | 全部 0 | 无；结构、六组 Jest 和三组 Page 事件各自执行，筛选排除已逐名称解释 | PASS |
| 整体回归 | 同上 | 下方原完整命令组 | 2026-10-06T18:39:26Z～18:40:00Z | 0 | 无；44 套/346 passed、0 failed、0 skipped，23.132 秒；结构与无产物编译通过 | PASS |
| 名称级结果采集 | 同上 | 下方当前名称采集完整命令，仅增加报告参数 | 2026-10-06T18:40:01Z～18:40:33Z | 0 | 无；同一工作树 44 套/346 passed，完整名称结果 current.jest.json | PASS |
| 三账对照 | 同上 | 下方 compare-three-ledgers.cjs 完整命令；逐文件与完整测试名称匹配 | 2026-10-06T18:41:43Z | 0 | 无；240 原通过仍通过，原失败集合为空且不变，106 新后端与 14 页面事件全通过 | PASS |

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run test:miniapp
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npx --yes --package=node@22.23.3 -- node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.build.json
~~~

### 首次预检历史记录：EVIDENCE_GAP（已获准补证据，不覆盖原结果）

<a id="P5-EVIDENCE-GAP-20261007"></a>

唯一清单入口是当前本文件“本轮 TEST Manifest”，共 10 个 Asset ID；未从聊天、终端历史或归档重拼清单。十项定义载体存在、实际 SHA-256 与定义一致，cwd、完整原命令和 P4 实际执行结果均可取得。分支 feature/garment-image-normalization，HEAD=d479aa7fa7b75f64afc6f092c029f4bc199311ed，与本文件施工固定点一致。

预检缺口如下；这些是证据不足，不是本轮产品测试失败：

1. TEST-016～023 执行记录仍各有 2 条未解释的 planned 占位，共 16 条；后方虽有 P4 红绿记录，但未明确标注占位已被替代，不能自行清除或当作预检满足。TEST-014/015 另有历史占位，已明确说明 latest 结果，未计入这 16 条。
2. “P3 已执行基线”只有 41 套/240 项通过的汇总，没有逐条测试名称、状态及可原样取得的名称级结果载体。无法仅凭数量证明“基线通过的现在仍同名通过”及“基线失败仍为同名集合”；不能用本轮 TDD 红灯充当既有失败基线。

三账均未进入对照，不写成立或通过；筛选跳过项也未进入本次执行复核，不将历史 skipped 汇总默认为已逐条解释。Manifest 全量与整体回归均停止在预检之前。仅更新本文件 P5 Current 记录；不修产品代码/测试定义，不评审、不提交、不推送、不进入 P6。

本次预检完整命令（cwd=E:/orca/Libre-Closet/youhua；读取文本显式 UTF-8；命令执行器返回 1，Node 缺口分支设 exitCode=2）：

~~~powershell
@'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=fs.readFileSync('docs/test.md','utf8').replace(/\r\n/g,'\n');
const rows=source.slice(source.indexOf('## 本轮 TEST Manifest'),source.indexOf('## TEST Asset')).split('\n').filter(l=>/^\| TEST-\d+ \|/.test(l));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const gaps=[];
for(const row of rows){
  const id=row.split('|')[1].trim();
  const begin=source.indexOf('## TEST Asset · '+id+' ·'),end=source.indexOf('\n## ',begin+1);
  const section=source.slice(begin,end<0?source.length:end);
  const definition=section.slice(0,section.indexOf('### 本轮执行记录'));
  const carrierLine=definition.match(/^- 测试定义载体：(.+)$/m)?.[1]||'';
  const files=[...new Set(carrierLine.match(/(?:scripts|src)\/[a-zA-Z0-9_./-]+\.(?:cjs|ts)/g)||[])];
  const cwd=definition.match(/^- 工作目录：(.+)。$/m)?.[1];
  const command=definition.match(/^- 完整调用命令：(.+)。$/m)?.[1]||definition.match(/完整调用命令：\n\n~~~powershell\n([\s\S]*?)\n~~~/)?.[1];
  const expected=definition.match(/^- 定义哈希：SHA-256 ([a-f0-9]{64})/m)?.[1];
  if(!files.length||files.some(f=>!fs.existsSync(f)))gaps.push(id+' 定义载体缺失');
  else{
    const bytes=files.length===1?fs.readFileSync(files[0]):Buffer.concat(files.flatMap(f=>[Buffer.from(f,'utf8'),Buffer.from([0]),fs.readFileSync(f),Buffer.from([0])]));
    if(sha(bytes)!==expected)gaps.push(id+' 定义哈希不匹配');
  }
  if(!cwd||!fs.existsSync(cwd)||path.resolve(cwd)!==path.resolve(process.cwd())||!command)gaps.push(id+' cwd/完整命令缺失或不匹配');
  if(!section.split('\n').some(l=>/^\| P[345] /.test(l)&&/\| (?:green|red|reused-green|baseline-green) \|$/.test(l)))gaps.push(id+' 无有效执行结果');
  const planned=section.split('\n').filter(l=>/\| planned \|$/.test(l));
  if(planned.length&&!section.includes('本卡 latest 有效 P4 结果为'))gaps.push(id+' 存在 '+planned.length+' 条未解释的 planned 占位');
  console.log(id+'：已取得载体、cwd、原命令、实际执行记录；哈希已核对');
}
const baseline=source.slice(source.indexOf('## P3 已执行基线'),source.indexOf('## P5 Current 结果'));
if(baseline.includes('41 套件、240 项通过')&&!baseline.includes('逐条测试名称')&&!baseline.includes('testResults'))gaps.push('P3 基线只有汇总数量，没有通过/失败的逐条测试名称及可取得的结果载体');
if(gaps.length){
  for(const gap of gaps)console.error('EVIDENCE_GAP: '+gap);
  process.exitCode=2;
}else console.log('证据预检通过');
'@ | node -
~~~

相关失败输出（逐条原样）：

~~~text
EVIDENCE_GAP: TEST-016 存在 2 条未解释的 planned 占位
EVIDENCE_GAP: TEST-017 存在 2 条未解释的 planned 占位
EVIDENCE_GAP: TEST-018 存在 2 条未解释的 planned 占位
EVIDENCE_GAP: TEST-019 存在 2 条未解释的 planned 占位
EVIDENCE_GAP: TEST-020 存在 2 条未解释的 planned 占位
EVIDENCE_GAP: TEST-021 存在 2 条未解释的 planned 占位
EVIDENCE_GAP: TEST-022 存在 2 条未解释的 planned 占位
EVIDENCE_GAP: TEST-023 存在 2 条未解释的 planned 占位
EVIDENCE_GAP: P3 基线只有汇总数量，没有通过/失败的逐条测试名称及可取得的结果载体
~~~


### 获准补证据后的 P5 执行（已完成，仅整体回归）

- 用户确认仅补证据、隔离基线复现和整体回归；其它禁令不变。上述首次 EVIDENCE_GAP 是历史真实结果，未删除或冒充通过；18 条历史占位已标 superseded 并指向对应实际红/绿记录。
- 补证据后证据预检已退出 0：十个资产的原定义、完整命令、逐文件/聚合哈希一致，cwd 和实际结果可取得；无 planned 占位、缺锚点或显式 skip/todo。名称级基线为 240 passed、0 failed、0 skipped。
- 筛选跳过说明：六组 Jest 资产的原命令均有 -t，未匹配名称的测试只在该组不运行，不是人工跳过；本轮还必须整体执行全部测试，并以完整 JSON 的名称/状态逐条确认最终没有遗漏或跳过。TEST-014 结构守卫及三组 Page 事件脚本都独立原样执行，不以 Jest 代替。
- 预检结果载体：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/evidence-precheck.json；预检脚本载体：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/evidence-precheck.cjs。cwd=E:/orca/Libre-Closet/youhua，完整命令：

~~~powershell
node "E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/evidence-precheck.cjs"
exit $LASTEXITCODE
~~~

- Manifest 的十组测试调用保留原样；每个执行包装仅追加 exit $LASTEXITCODE 透传原退出码。每项完整输出、时间与命令分别保存到证据目录，收尾逐项写入本节。
- 当前名称级结果采集只添加报告参数，测试选择与断言不变；已在原整体命令通过后实际执行。结果载体：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/current.jest.json。cwd=E:/orca/Libre-Closet/youhua，完整命令如下：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --json --outputFile="E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/current.jest.json"
exit $LASTEXITCODE
~~~


### P5 本次逐项执行凭证

统一 cwd 为 E:/orca/Libre-Closet/youhua，以下仍单独登记；全量输出保存在证据目录。失败输出均为“无”，没有把历史失败、告警或筛选排除算作本轮失败。十组测试调用逐字来自 manifest 的资产定义。

#### P5 · TEST-014

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:38:14Z～2026-10-06T18:38:16Z；退出码：0；结果：结构守卫通过；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-014.log。

~~~powershell
npm run test:miniapp
exit $LASTEXITCODE
~~~

#### P5 · TEST-015

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:38:18Z～2026-10-06T18:38:29Z；退出码：0；结果：37 passed；76 按 -t 排除；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-015.log。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/garment-image-normalization.integration.spec.ts src/dal/migrations/garment-image-normalization.migration.spec.ts src/file/file-service.abstract.spec.ts src/file/local-file/local-file.service.spec.ts src/file/s3-file/s3-file.service.spec.ts src/file/controller/file.controller.spec.ts src/wardrobe/garment.service.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts -t "TEST-015"
exit $LASTEXITCODE
~~~

#### P5 · TEST-016

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:38:30Z～2026-10-06T18:38:39Z；退出码：0；结果：32 passed；34 按 -t 排除；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-016.log。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/ai/garment-image.service.spec.ts src/wardrobe/garment-image-normalization.integration.spec.ts -t "TEST-016"
exit $LASTEXITCODE
~~~

#### P5 · TEST-017

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:38:40Z～2026-10-06T18:38:42Z；退出码：0；结果：4 passed、0 failed；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-017.log。

~~~powershell
node scripts/validate-garment-image-normalization.cjs --case generate-preview
exit $LASTEXITCODE
~~~

#### P5 · TEST-018

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:38:44Z～2026-10-06T18:38:53Z；退出码：0；结果：7 passed；44 按 -t 排除；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-018.log。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/garment-image-normalization.integration.spec.ts -t "TEST-018"
exit $LASTEXITCODE
~~~

#### P5 · TEST-019

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:38:54Z～2026-10-06T18:38:56Z；退出码：0；结果：5 passed、0 failed；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-019.log。

~~~powershell
node scripts/validate-garment-image-normalization.cjs --case recovery
exit $LASTEXITCODE
~~~

#### P5 · TEST-020

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:38:57Z～2026-10-06T18:39:08Z；退出码：0；结果：14 passed；104 按 -t 排除；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-020.log。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/garment-image-normalization.integration.spec.ts src/wardrobe/garment.service.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/miniapp-daily-outfit.controller.spec.ts -t "TEST-020"
exit $LASTEXITCODE
~~~

#### P5 · TEST-021

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:39:10Z～2026-10-06T18:39:11Z；退出码：0；结果：5 passed、0 failed；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-021.log。

~~~powershell
node scripts/validate-garment-image-normalization.cjs --case adopt
exit $LASTEXITCODE
~~~

#### P5 · TEST-022

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:39:12Z～2026-10-06T18:39:18Z；退出码：0；结果：13 passed；15 按 -t 排除；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-022.log。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/miniapp-wardrobe.controller.spec.ts -t "TEST-022|backup"
exit $LASTEXITCODE
~~~

#### P5 · TEST-023

- cwd：E:/orca/Libre-Closet/youhua。
- 时间：2026-10-06T18:39:19Z～2026-10-06T18:39:25Z；退出码：0；结果：8 passed；8 按 -t 排除；失败输出：无。
- 全量输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/TEST-023.log。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/wardrobe-copy.service.spec.ts src/file/local-file/local-file.service.spec.ts src/file/s3-file/s3-file.service.spec.ts -t "TEST-023|wardrobe copy"
exit $LASTEXITCODE
~~~

### P5 三账逐名称对照

对照键为相对文件路径 + 完整测试名称，检测重复，不按数量猜同名；旧名称消失、改名、失败或真正跳过都会报差异。

| 账 | 名称级结果 | 差异 | 结论 |
|---|---|---|---|
| 基线通过的现在仍通过 | 240 个原有名称逐一存在且 passed | 0 | PASS |
| 基线失败的现在仍同批同名失败 | 基线失败集合 []，当前原有失败集合 [] | 无集合变化 | PASS |
| 本轮新增测试全部通过 | 106 个新后端名称均匹配本轮资产/载体，14 个 Page 事件名称全部通过 | 0 failed、0 真正 skipped、0 未登记新名称 | PASS |

- 基线名称结果：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/baseline.jest.json；当前名称结果：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/current.jest.json；完整三账及每组未选中名称：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/three-ledgers.json。
- 完整命令/时间/退出码/原始输出索引：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/execution-metadata.json；原整体回归输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/whole-regression.log；名称采集输出：E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/current-name-capture.log。
- 定向筛选说明：015/016/018/020/022/023 各排除 76/34/44/104/15/8 个不匹配 -t 的名称，JSON 已逐项列明；这些名称在整套执行中均 passed。020 包含的 garment.service.spec.ts 没有 TEST-020 名称，因此该套定向未运行，其全部原有测试已在整体回归执行。最终完整执行 0 skipped，页面脚本 14 项不混入 Jest 数量。
- 三账对照 cwd=E:/orca/Libre-Closet/youhua；完整命令如下，退出 0，失败输出无：

~~~powershell
node "E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/compare-three-ledgers.cjs" "E:/Caches/Temp/libre-closet-p5-0d05e00687684b089af26b1840db8a90/evidence/execution-metadata.json"
exit $LASTEXITCODE
~~~

### P5 收尾范围核对

本次获准补证据至结束，工作区仅 docs/test.md 变化；产品代码、TEST 载体/定义/原命令、SPEC/PLAN/TASK 均未变。分支 feature/garment-image-normalization、HEAD 和施工固定点保持一致。隔离基线、完整结果和诊断临时目录全部保留，未删除任何文件。不收费、不操作真人衣橱，不调用 kun-review/code-review，不提交、不推送、不进入 P6。


- 适用的其它检查：仅冻结定义/载体、固定点和文件范围核对及 git diff --check；未进行 Owner/依赖方向代码评审。
- P5 INITIAL 历史门禁：ready（仅适用于返修前的工作树；本次返修的有效门禁与结果以文首及末尾 P5 Current 为准，不沿用历史绿灯）。
- P6：计划第 6 章六条真实操作路径全部待用户验收。真实模型质量与费用、微信手机退出恢复、真实 S3 桶权限均不由上述假端口绿灯替代；未获得授权前不执行付费联调、真人数据写入或发布。


## P4 定向返修 · STD-B01/STD-B02（2026-10-07）

<a id="P4-RETURN-20261007"></a>

用户授权：先核实是否真 Bug，确认后按第一性原理返回修复；沿用已有功能分支，不提交、不推送、不部署、不进入 P6，不自动进行 CLOSURE。施工固定点不改。

### 核实与红绿证据

只读反馈环实际载入真实 Page 和真实 Worker 启动代码，两次稳定复现。详情返回后读取次数=1、loading=true、normalization=null；关闭生成后 recoveryCalls=0、resultDownloads=0。只改变 loadedOnce/配置门条件时同一数据恢复，排除 API/数据库/下载异常作为该失败根因。

随后在现有 TEST 载体先补六个场景，再修两个产品文件。修前命令及失败输出保存在 E:/Caches/Temp/libre-closet-p4-return-20261007-7474e104/red-evidence.md；是行为红灯，不是编译或夹具失败：

| 资产 | cwd | 完整命令 | 退出码 | 失败输出 | 结果 |
|---|---|---|---:|---|---|
| TEST-019 修前 | E:/orca/Libre-Closet/youhua | 本资产原命令，见下方同名完整命令块（仅无 exit 透传行） | 1 | 5 passed、3 failed；首次读取中断/失败后回来仍只读取 1 次，期望 2 次 | red |
| TEST-018 修前 | E:/orca/Libre-Closet/youhua | 本资产原命令，见下方同名完整命令块（仅无 exit 透传行） | 1 | 8 passed、2 failed、44 名称筛选排除；期望 uncertain 实际 processing，期望 ready 实际 uncertain | red |
| TEST-019 修后 | E:/orca/Libre-Closet/youhua | 同一资产原命令 | 0 | 无；8 passed，新增 3 个首次加载生命周期场景全通过 | green |
| TEST-018 修后 | E:/orca/Libre-Closet/youhua | 同一资产原命令 | 0 | 无；10 passed，新增 3 个关闭开关场景全通过；44 项由 -t 排除，完整回归均同名通过 | green |

原始只读反馈环修后也通过：详情读取=2、loading=false、normalization=ready、生成 POST=0；Worker recoveryCalls=1、resultDownloads=1、status=ready、生成 POST=0。

### 第一性原理与最小返修范围

- 页面恢复由可见性决定，不由“首次请求是否成功”决定。onLoad 负责首次读取；onHide 记录需要恢复并使旧响应失效；onShow 仅在实际恢复时重新 GET，初次 onShow 不重复读取。原有旧响应保护不变。
- 开关控制新的收费生成，不控制已有任务/结果。启动始终恢复已派发状态；已有 resultUrl 只下载；isConfigured 门移到领取 queued 之前，关闭时保留 queued，开启后才首次派发。
- 测试 startup 改为真实 onApplicationBootstrap，而非绕过生产启动门限的 recoverOnStartup。只取消隔离测试应用的后台计时器，防止它跨用例处理下一份数据库夹具；真实启动逻辑仍由受测 Worker 亲自执行。
- 产品文件仅 miniprogram/pages/garment-detail/index.js、src/wardrobe/garment-image-normalization.worker.ts；测试仅 scripts/validate-garment-image-normalization.cjs、src/wardrobe/garment-image-normalization.integration.spec.ts；文档仅本文件与 docs/task.md。不改 SPEC/PLAN、五类文本、模型参数、图片/权限/备份/推荐规则。
- 共享载体维护：TEST-015 5→6、016 3→4、017 3→4、018 2→3、019 2→3、020 2→3、021 1→2。014/022/023 不变；当前定义哈希见各资产文首，执行时字节哈希见 definitions-at-execution.json。既有断言未删除或放宽。

### 评审状态

INITIAL 冻结集仍为 STD-B01（同根 SPEC-B01）、STD-B02（同根 SPEC-B02）；状态 OPEN、未复核。P4 已实现并通过验证，不在这里代替独立 Agent 判 CLOSED。未运行 kun-review/code-review，Repair budget 仍 2/2；下轮若获准进入 CLOSURE-1，再按协议扣配额。

返修起点完整快照：E:/Caches/Temp/libre-closet-p4-return-20261007-7474e104/repair-start.json，SHA-256 59463243cb3b9561aeeedf80345fe90876dbdc32a602a910e0f8fc9e3d897117。其中保留 fixed point、HEAD、Git 状态及 54 份文件哈希，不用当前 HEAD 猜测未提交返修起点。

## P5 Current 结果

<a id="P5-CURRENT-P4-RETURN-20261007"></a>

当前为 P4 返修后的评审入场证据，不是 CLOSURE/P6 通过。唯一 TEST 清单仍是本文件本轮 manifest 的十项；旧 INITIAL 汇总与历史 not-run/planned 占位不计当前执行。

| 检查 | cwd | 完整命令 | 时间 | 退出码 | 失败输出 | 结论 |
|---|---|---|---|---:|---|---|
| 返修证据核对 | E:/orca/Libre-Closet/youhua | 下方 verify-return.cjs 完整命令 | 2026-10-07T04:20:16Z | 0 | 无；10 项定义、载体、版本、执行时哈希、cwd、原命令及实际结果匹配 | PASS |
| Manifest 全量执行 | E:/orca/Libre-Closet/youhua | 下方十个资产逐项完整命令；来自各资产定义，仅增加退出码透传 | 2026-10-07T04:15:38Z～04:16:11Z | 全部 0 | 无；名称筛选排除逐条记录于 verification.json，并在完整回归同名通过 | PASS |
| 整体 Jest | E:/orca/Libre-Closet/youhua | 下方整体 Jest 完整命令；原命令仅增加 JSON 报告参数 | 2026-10-07T04:12:58Z | 0 | 无；44 套/349 passed、0 failed、0 skipped，16.435 秒 | PASS |
| 小程序结构 | E:/orca/Libre-Closet/youhua | 下方结构完整命令 | 2026-10-07 | 0 | 无；Native mini-program validation passed | PASS |
| 无产物编译 | E:/orca/Libre-Closet/youhua | 下方编译完整命令 | 2026-10-07 | 0 | 无 | PASS |
| 名称级三账 | E:/orca/Libre-Closet/youhua | 下方 verify-return.cjs 完整命令 | 2026-10-07T04:20:16Z | 0 | 无；原 240 项及 INITIAL 前 346 项均仍同名通过；原失败集合均为空且不变；当前 109 个新增后端/17 个页面事件均通过 | PASS |
| 修改文件格式 | E:/orca/Libre-Closet/youhua | 下方格式完整命令 | 2026-10-07 | 0 | 无；All matched files use Prettier code style | PASS |

名称匹配采用仓库相对载体路径 + 完整测试名称。相对 INITIAL 前新增 3 个后端与 3 个页面场景，全部通过；原 14 个页面事件仍同名通过。六组 Jest -t 排除数量分别为 79/37/44/107/15/8；TEST-020 的一份套件没有匹配名称而被筛选排除，其全部用例已在完整回归通过，不是未知跳过。所有逐条排除名称及理由存于 verification.json。

证据脚本首轮误用隔离基线绝对目录前缀，退出 2；verification-first.json 保留该诊断，校正为相对载体路径后同一数据对照退出 0。首轮是证据比较脚本错误，不作为产品红灯或当前三账失败。

### 全量 manifest 的逐项结果

| Asset ID | cwd | UTC 开始/结束 | 退出码 | 输出摘要 | 失败输出 | 结论 |
|---|---|---|---:|---|---|---|
| TEST-014 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:15:38 UTC～2026-10-07 04:15:46 UTC | 0 | Native mini-program validation passed | 无 | PASS |
| TEST-015 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:15:39 UTC～2026-10-07 04:15:53 UTC | 0 | Tests:       79 skipped, 37 passed, 116 total | 无 | PASS |
| TEST-016 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:15:39 UTC～2026-10-07 04:15:47 UTC | 0 | Tests:       37 skipped, 32 passed, 69 total | 无 | PASS |
| TEST-017 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:15:47 UTC～2026-10-07 04:15:54 UTC | 0 | TEST-017：4 passed，0 failed；无真实网络或模型调用 | 无 | PASS |
| TEST-018 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:15:47 UTC～2026-10-07 04:15:54 UTC | 0 | Tests:       44 skipped, 10 passed, 54 total | 无 | PASS |
| TEST-019 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:15:55 UTC～2026-10-07 04:16:04 UTC | 0 | TEST-019：8 passed，0 failed；无真实网络或模型调用 | 无 | PASS |
| TEST-020 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:15:55 UTC～2026-10-07 04:16:04 UTC | 0 | Tests:       107 skipped, 14 passed, 121 total | 无 | PASS |
| TEST-021 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:15:56 UTC～2026-10-07 04:16:03 UTC | 0 | TEST-021：5 passed，0 failed；无真实网络或模型调用 | 无 | PASS |
| TEST-022 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:16:05 UTC～2026-10-07 04:16:11 UTC | 0 | Tests:       15 skipped, 13 passed, 28 total | 无 | PASS |
| TEST-023 | E:/orca/Libre-Closet/youhua | 2026-10-07 04:16:05 UTC～2026-10-07 04:16:11 UTC | 0 | Tests:       8 skipped, 8 passed, 16 total | 无 | PASS |

### TEST-014 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
npm run test:miniapp
exit $LASTEXITCODE
~~~

### TEST-015 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/garment-image-normalization.integration.spec.ts src/dal/migrations/garment-image-normalization.migration.spec.ts src/file/file-service.abstract.spec.ts src/file/local-file/local-file.service.spec.ts src/file/s3-file/s3-file.service.spec.ts src/file/controller/file.controller.spec.ts src/wardrobe/garment.service.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts -t "TEST-015"
exit $LASTEXITCODE
~~~

### TEST-016 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/ai/garment-image.service.spec.ts src/wardrobe/garment-image-normalization.integration.spec.ts -t "TEST-016"
exit $LASTEXITCODE
~~~

### TEST-017 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
node scripts/validate-garment-image-normalization.cjs --case generate-preview
exit $LASTEXITCODE
~~~

### TEST-018 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/garment-image-normalization.integration.spec.ts -t "TEST-018"
exit $LASTEXITCODE
~~~

### TEST-019 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
node scripts/validate-garment-image-normalization.cjs --case recovery
exit $LASTEXITCODE
~~~

### TEST-020 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/garment-image-normalization.integration.spec.ts src/wardrobe/garment.service.spec.ts src/wardrobe/miniapp-wardrobe.controller.spec.ts src/wardrobe/miniapp-outfit.controller.spec.ts src/wardrobe/miniapp-daily-outfit.controller.spec.ts -t "TEST-020"
exit $LASTEXITCODE
~~~

### TEST-021 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
node scripts/validate-garment-image-normalization.cjs --case adopt
exit $LASTEXITCODE
~~~

### TEST-022 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/miniapp-wardrobe.controller.spec.ts -t "TEST-022|backup"
exit $LASTEXITCODE
~~~

### TEST-023 当前完整命令

cwd：E:/orca/Libre-Closet/youhua。

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/wardrobe/wardrobe-copy.service.spec.ts src/file/local-file/local-file.service.spec.ts src/file/s3-file/s3-file.service.spec.ts -t "TEST-023|wardrobe copy"
exit $LASTEXITCODE
~~~

### 整体 Jest 完整命令

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand --json --outputFile="E:/Caches/Temp/libre-closet-p4-return-20261007-7474e104/current.jest.json"
exit $LASTEXITCODE
~~~

### 小程序结构完整命令

~~~powershell
npm run test:miniapp
exit $LASTEXITCODE
~~~

### 无产物编译完整命令

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.build.json
exit $LASTEXITCODE
~~~

### 修改文件格式完整命令

~~~powershell
node node_modules/prettier/bin/prettier.cjs --check miniprogram/pages/garment-detail/index.js src/wardrobe/garment-image-normalization.worker.ts src/wardrobe/garment-image-normalization.integration.spec.ts scripts/validate-garment-image-normalization.cjs
~~~

### 证据核对与三账完整命令

~~~powershell
node "E:/Caches/Temp/libre-closet-p4-return-20261007-7474e104/verify-return.cjs" "E:/Caches/Temp/libre-closet-p4-return-20261007-7474e104/execution-metadata.json"
exit $LASTEXITCODE
~~~

### 证据载体与门禁

- E:/Caches/Temp/libre-closet-p4-return-20261007-7474e104/execution-metadata.json：各资产完整命令、cwd、退出码、完整输出与其它检查。
- E:/Caches/Temp/libre-closet-p4-return-20261007-7474e104/current.jest.json：当前完整测试名称结果，SHA-256 a646ce694365e0188c73511d0816f89b71f65feec84d9f7e2824c082497df1a6。
- E:/Caches/Temp/libre-closet-p4-return-20261007-7474e104/verification.json：当前定义核对、原基线/INITIAL 前三账、页面名称与逐条筛选排除，SHA-256 59614dcb0abc44dbd6be31cce78b052e473ffeeb93e917f004b723f28bd06cb8。
- E:/Caches/Temp/libre-closet-p4-return-20261007-7474e104/red-evidence.md：修前实际行为红灯；所有临时诊断和证据保留，不删除、不提交。
- 当前 P5 评审门禁：ready，仅表示返修后的测试证据完整，等待用户决定是否进入 CLOSURE；不是冻结项关闭或 P6 通过。
- 未提交、推送、部署、收费模型调用、真实微信手机/S3 桶验收或真人衣橱写入。

## P5 CLOSURE-1 结果（既有评审报告补登记）

<a id="P5-CLOSURE-1-RECOVERED-20261008"></a>

### 原始来源与范围

- 取证来源：本轮现有团队的 collaboration.list_agents({}) 返回已完成 Agent 的原始最终报告。Standards 为 /root/review_a，Spec 为 /root/review_b；这是读取已结束的两个独立实例，不是创建、委派或重开评审。
- 本次取回时间：2026-10-08 07:22:10 UTC。原报告未给出精确执行时间，不把取回时间伪写成评审执行时间。
- cwd / 项目：E:/orca/Libre-Closet/youhua；模式 WORKTREE；fixed point / merge-base / 评审时 HEAD 均为 d479aa7fa7b75f64afc6f092c029f4bc199311ed。
- 原报告 Round=CLOSURE-1、Repair budget=1/2、Coverage=FULL（沿用 INITIAL 双轴覆盖）。定向关闭冻结项，不重建或重扫原 54 文件 Diff Ledger。
- Spec source：docs/spec.md、已认可的 docs/plan.md、docs/task.md；Standards source：会话 AGENTS、README.md、docs/backend-architecture-source-of-truth.md。P5 TEST gate=PASS，证据为本文件 manifest 与返修后 P5 Current。

### 双轴完整性与冻结项结论

| 原实例 / 审查轴 | 原报告结论 | 冻结项覆盖 | 实际返修范围覆盖 | 独立性 | 原报告新增阻断 |
|---|---|---|---|---|---|
| /root/review_a · Standards | PASS | 2/2 | 6/6 | 本人亲自完成，未委派；不代判另一轴 | 无 |
| /root/review_b · Spec | PASS | 2/2 | 6/6 | 本人亲自完成，未委派或索取另一轴结论 | 无 |

| 冻结 ID / 别名 | Standards 原结论 | Spec 原结论 | 原报告的关闭依据摘要 |
|---|---|---|---|
| STD-B01 / SPEC-B01 | CLOSED | CLOSED | 详情恢复改由真实隐藏/返回决定，不再依赖首次读取成功；旧响应失效保护保留，初次 onShow 不重复读取。三个新增真实 Page 场景检查恢复、晚到失效与零生成；TEST-019 8/8。 |
| STD-B02 / SPEC-B02 | CLOSED | CLOSED | 启动始终恢复已派发状态和已有结果下载；生成配置只限制领取新 queued，恢复不重发生成 POST。三个新增真实启动钩子场景检查状态、已有 URL 下载与 queued 保留；TEST-018 10/10。 |

原报告六处返修范围：miniprogram/pages/garment-detail/index.js、src/wardrobe/garment-image-normalization.worker.ts、scripts/validate-garment-image-normalization.cjs、src/wardrobe/garment-image-normalization.integration.spec.ts、docs/task.md、docs/test.md。两个实例都声明结束时范围和内容核对一致；integration 三段返修反验精确匹配返修前 SHA-256 52730c7447099d755a3dd7f35809757ed313d36fa443b60e4791730822038d38。

原文摘录（来自各自报告，不由主 Agent 补写）：

> Standards：Status: PASS（Standards 轴）；Round: CLOSURE-1；STD-B01（别名 SPEC-B01）：CLOSED。STD-B02（别名 SPEC-B02）：CLOSED。

> Standards：亲自完成冻结项 2/2、六文件实际返修范围 6/6，未委派。

> Spec：Status: PASS（本轴）；Round: CLOSURE-1；STD-B01（别名 SPEC-B01）：CLOSED；STD-B02（别名 SPEC-B02）：CLOSED。

> Spec：本人完成冻结项 2/2、六处实际返修范围 6/6；没有委派、调用其他 Agent 或索取另一轴结论。

### 当前登记与历史纠正

- 已有 CLOSURE-1 双轴 PASS、两项 CLOSED，结合返修后 P5 回归记录，P5 关闭结果登记为 PASS。原 OBS-01 依两份报告继续保留且不阻断；不猜测其未载明细节。
- 文首、P4 卡和旧 P5 Current 曾写“等待复核 / OPEN”，保留其当时的历史阶段；当前状态以本节取回的最终报告为准。
- 上一次文档同步称“评审关闭凭据未核实”是主 Agent 漏查已完成实例的报告，现撤回该凭据缺口，不要求用户找报告，不重开 INITIAL/CLOSURE，不扣新配额。
- 本节只登记既有返修版本的评审；不宣称随后文档收尾也经过新代码评审，不扩大为整轮 P6 或正式发布通过。没有重新执行测试、产品操作或评审。

## P6 Current 结果（2026-10-08 手机补测）

<a id="P6-CURRENT-PHONE-20261008"></a>

以上 P4/P5 记录保留其执行时点的事实，不覆盖本节后续验收。当前只补记手机补测三个场景；原场景编号和用户结论不改，不把后台响应、自动化绿灯或一张候选当作手机验收通过。

### 验收依据、环境与范围

- 依据：docs/spec.md 第 3 节验收标准第 3、5 项；第 5 节硬约束第 1、2、5、8 项。PLAN 第 6 章人工验收第 3 条允许受控假模型验证晚到等分支，90 秒仅为本次夹具延迟，不是新增性能标准。
- 设备与账号：用户亲手操作鸿蒙手机上的微信；体验版 1.0.9，平台账号名称“G的智能试衣间”，AppID wxfd7f6fa52c4ed844。版本管理曾核对显示“体验版”，没有提交审核或正式发布。
- 隔离后台：https://aimatchwear.asia/_p6/image-20261008；服务端独立目录 /root/libre-closet-p6-phone9-20261008；仅开放测试衣物 21、22。
- 测试数据：21 为“手机验收① 切后台（免费测试夹具）”；22 为“手机验收② 关闭重开（免费测试夹具）”。每件最多首次派发一次，受控候选延迟 90 秒，共两次免费模拟调用，不采用、不编辑、不删除。
- 用户反馈原文：“全部都pass，没问题”。用户未提供逐项截图或录屏；手机可见行为的证据是用户亲测确认，不虚填观测细节或视频证据。
- 本节只覆盖 P6-06、P6-07A、P6-07B；A/B 保留原父场景 P6-07。先前五类效果反馈、模拟器补测和费用凭证保持原样，不借这次确认扩大结论。

### 原场景对账

| 场景 | 对应依据 | 预期结果 | 用户执行的剧本步骤 | 实际结果 | 证据 | 用户结论 |
|---|---|---|---|---|---|---|
| P6-06 真人快速连点 | SPEC 验收标准 5、硬约束 5 | 处理中连点不重复生成；当前展示不变 | 21 号确认当前图/原图，首次快速点 AI 整理三次，随后接 P6-07A，不再次开始 | 用户统一反馈“全部都pass，没问题”；后台该衣物仅一次成功模拟派发、一次候选下载 | 用户亲测确认；下方本轮服务端次数账本 | PASS |
| P6-07A 处理中切后台再返回（父场景 P6-07） | SPEC 验收标准 3、硬约束 1/2/5/8 | 原次进度或候选保留；不采用则当前图与原图保持；返回不重生 | 接续 21 号原次整理，切手机桌面，约 30 秒后返回；等待原次结果，对比并查看原图，离开详情再进入，不点采用 | 用户统一反馈“全部都pass，没问题”；后台 21 号仍只一次派发，原次模拟结果成功 | 用户亲测确认；21 号 attemptKey muz6o2iu_etyz3bc0h6i | PASS |
| P6-07B 处理中关闭微信再扫码重开（父场景 P6-07） | SPEC 验收标准 3、硬约束 1/2/5/8 | 重开可继续原次状态或结果；不要求重新生成；不自动采用或丢原图 | 22 号首次开始一次；关闭小程序并在最近任务中关闭微信，不清缓存/退出登录；约 30 秒后重扫同一体验版二维码，等待原次候选，查看原图并重进详情，不点采用 | 用户统一反馈“全部都pass，没问题”；后台该衣物仅一次成功模拟派发、一次候选下载 | 用户亲测确认；22 号 attemptKey muz6kyu8_pratm2da4mh | PASS |

手机动作按已交给用户的剧本及其统一 PASS 反馈登记；不额外声称 Agent 亲眼看到每个手机步骤。服务端账本只补证派发次数和模拟结果，不代替上述人工结论。

### 服务端只读核对凭证

- 核对时间：2026-10-08 07:11:19 UTC（北京时间 15:11:19）。
- cwd：E:/orca/Libre-Closet/youhua。
- 完整命令：

~~~powershell
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10 ai-wardrobe "cat /root/libre-closet-p6-phone9-20261008/package/data/phone-provider-events.json"
~~~

- 退出码：0；失败输出：无。
- 输出核对：21、22 各一次尝试且均 controlled-success，各一次候选下载；blocked 为空；realPaidCalls=0。仅证明本次受控后台没有额外派发或真实付费模型调用。
- 原始输出（没有凭证值）：

~~~json
{
  "controlledStub": true,
  "realPaidCalls": 0,
  "attempts": [
    {
      "garmentId": 22,
      "attemptKey": "muz6kyu8_pratm2da4mh",
      "startedAt": "2026-10-08T06:54:13.055Z",
      "state": "controlled-success",
      "realPaidCall": false,
      "finishedAt": "2026-10-08T06:55:43.055Z"
    },
    {
      "garmentId": 21,
      "attemptKey": "muz6o2iu_etyz3bc0h6i",
      "startedAt": "2026-10-08T06:56:39.064Z",
      "state": "controlled-success",
      "realPaidCall": false,
      "finishedAt": "2026-10-08T06:58:09.066Z"
    }
  ],
  "downloads": [
    {
      "garmentId": 22,
      "at": "2026-10-08T06:55:43.061Z",
      "sha256": "4a60f598946324b67cf8ae921ad8b8adc712012c95a369292d424e03f31b0cb6"
    },
    {
      "garmentId": 21,
      "at": "2026-10-08T06:58:09.071Z",
      "sha256": "4dc7982df492be200c54a0fda736e570f7b2baa1a9d109eecea50d10011739ec"
    }
  ],
  "blocked": []
}
~~~

### 已有证据入口、未覆盖与收尾门禁

- 本轮原始验收根目录：E:/Caches/Temp/libre-closet-p6-20261007-170937-63282e54；此前最新只读补测是 evidence/p6-supplement7-results.json 和 evidence/p6-supplement7-report-standalone.html。本节仅替代其中 P6-06 真人触摸、P6-07 真机生命周期两个待验手机子项，不回写原证据。
- 五类真实模型整体效果：evidence/p6-supplement5-user-feedback.md 已保留用户原文“我觉得整体效果是能够接受的”；不扩大为所有衣物或每个细节都完全还原。
- 仍保留 SPEC GAP：首次整理状态 GET 失败时的可见提示，原 SPEC 未单独定义，不因本次正常路径 PASS 擅自关闭，也不判为新的产品 FAIL。
- 本次未补验真实 S3 桶权限、首次微信登录全部分支、正式生产数据/配置；不以免费夹具证明真实模型质量、供应商异常或账单。先前受控异常证据按原范围保留，是否足够整轮收口仍须单独判定。
- P5 回归与既有双轴 CLOSURE-1 均通过；两项冻结阻断已经 CLOSED。完整取证登记见 #P5-CLOSURE-1-RECOVERED-20261008；此前“缺评审关闭凭据”的说法已纠正，不再当作当前阻塞。
- 剩下的门禁是整轮 P6 用户收口，不是补跑评审。四份 SPEC/PLAN/TASK/TEST 保留活跃路径，不移动、不冻结；不生成一轮一份的 cleanup 报告，不写未获确认的场面提醒，不记录 passed 的整轮里程碑。
- 本次只有文档同步与只读核对；不修改产品代码/TEST 载体/提示词，不操作产品，不新增收费调用，不删文件、暂存、提交、推送或发布。正式提交仍由用户另行授权，完整功能提交使用中文 Commit Message。

### 既有验收证据收口清单（不代填用户结论）

以下均为已有执行，不在文档收尾中重跑。证据文件位于前述 evidence 根目录。模拟器/受控端口的观察与用户亲测结论分开记；空白的原用户结论不自动改为 PASS。

| 原场景 | 预期 / 依据摘要 | 已有实际结果与证据载体 | 当前登记 |
|---|---|---|---|
| P6-01 | 新增保留原图；保存不自动整理（SPEC 3.1） | p6-observation-summary.json：真实上传/识别/抠图、保存无任务、原图原生预览可见 | 模拟器已观察符合；原用户结论留空 |
| P6-02 | 五类固定提示词生成单候选（SPEC 3.2） | p6-supplement5-results.json、p6-supplement5-user-feedback.md：五类实图对照；用户原文“我觉得整体效果是能够接受的” | 五类整体效果用户已认可；不承诺全部细节还原 |
| P6-03 | 不支持类别不套错提示词（SPEC 2 不做、3.2） | p6-supplement2-results.json：六类已确认分类夹具显示不支持、无生成按钮/新增调用 | 模拟器已观察符合；原用户结论留空 |
| P6-04 | 不采用保持旧图/资料（SPEC 3.3、4.1） | p6-supplement2-results.json：暂不采用后既有搭配仍旧图，重进同一候选/次标识 | 模拟器已观察符合；原用户结论留空 |
| P6-05 | 明确采用后各入口同图，原图/资料不变（SPEC 3.4） | p6-supplement2-results.json：已保存搭配/详情/衣橱更新；p6-supplement3-results.json：三张未保存推荐卡只刷新目标照片 | 模拟器已观察符合；原用户结论留空 |
| P6-06 | 连点不重复生成（SPEC 3.5、4.4） | 既有补测3/6及本节鸿蒙手机21号账本；用户亲测确认 PASS | 用户 PASS；不重复记付费调用 |
| P6-07 / P6-07A/B | 原次退出/后台/关闭恢复，不重生（SPEC 3.3、5.8） | 既有补测4/6恢复与晚到；本节鸿蒙21/22号切后台、关闭重开 | 手机正常生命周期用户 PASS；首次状态 GET 提示仍为独立 SPEC GAP |
| P6-08 | 重进保留待采用候选（SPEC 3.3、5.8） | p6-supplement2-results.json、p6-supplement7-results.json：同次候选保留，五类均未自动采用 | 模拟器已观察符合；不替写原用户结论 |
| P6-09 | 未知显示结果待确认，不承诺未扣费、不自动重试（SPEC 3.5） | p6-supplement6-results.json：受控假供应商超时，原次 uncertain 与可能费用提示，派发一次 | 已按 PLAN 受控异常观察；非真实供应商故障，用户收口待确认 |
| P6-10 | 明确失败保图，不自动重试（SPEC 3.5、5.5） | p6-supplement6-results.json：受控假供应商 HTTP400，失败提示、原图/资料不变、派发一次 | 已按 PLAN 受控异常观察；非真实供应商故障，用户收口待确认 |
| P6-11 | 采用失败不丢衣物/原图/旧图（SPEC 4.2） | p6-supplement2-results.json：隔离后端无监听时真实点击采用失败，行/任务/图片字节不变，恢复后可采用 | 连接失败子项已观察；不扩大为所有采用异常 |
| P6-12 | 两个主人不能互读/采用（SPEC 4.3） | p6-12-account-isolation-http-verified.json、p6-supplement-results.json：21条真实隔离账号请求及模拟器界面，越权拒绝、自己的可读 | 本地账号/存储已观察符合；非双手机微信/S3证明 |
| P6-13 | 历史无独立原图不能冒充原图/自动改写（SPEC 5.7） | p6-supplement-results.json：旧图仍显示、无原图入口、提示缺原图不能整理、原行不变 | 模拟器历史夹具已观察符合；原用户结论留空 |

补测前，PLAN 第6章人工验收第6条（备份导出/导入与管理员复制保图）尚缺完整真实操作凭据；夹具导入和 TEST-022/023 不替代真验。用户随后明确“可以继续”，已实际执行下方 P6-14/15 隔离补测；不挪用 P6-13，不代填用户结论，也不因此宣布整轮通过。

正式四文件归档仍等待 P6 收口范围及未验项的用户决定。SPEC GAP 保持原记录，不在收尾时创造新标准、改用户结论或现场修代码。

## P6 Current 免费备份与复制补测（2026-10-08）

<a id="P6-CURRENT-TRANSFER-20261008"></a>

- 授权：用户“可以继续”；仅隔离沙盒补验备份恢复/管理员复制保图，不改产品、不付费、不碰真实衣橱、不提交推送发布。P5 原结论、各 P6 原编号及手机用户 PASS 保持不变。
- 依据：已确认 PLAN 第6章人工第6条；SPEC 3.3/3.4、4.3、5.2/5.6/5.7/5.8。目标是四种图片字节与引用保留、采用关系不变、源不变/目标独立、无自动抠图或生成；不新增 MIME、文件分享或性能标准。
- 环境：仓库外根目录 E:/Caches/Temp/libre-closet-p6-20261007-170937-63282e54；独立数据 data-transfer10-20261008，后台仅 127.0.0.1:3324（PID 68672），旧格式只读夹具端口3325（PID 55332）；客户端 transfer10-miniapp、独立会话键 p6_transfer10_access_token。旧3316后台仍在运行，第一次端口保护退出1，没有替换进程；旧环境、手机1.0.9和真实用户数据不写入。
- 测试账号：源A=1，恢复目标=3，复制目标=4，均为独立库中的验收沙盒；两目标初始为空。只做首次复制、overwrite=false，不覆盖、清空或删除。253份源文件核对通过（仅旧副本两处既有隔离变换）；新客户端56份文件只改 API 地址/会话键，不改业务。
- 证据根目录为上述根目录的 evidence；权威结果 p6-transfer10-results-final.json；[自包含截图报告](E:/Caches/Temp/libre-closet-p6-20261007-170937-63282e54/evidence/p6-transfer10-report-final-standalone.html)。报告无外部资源，可离线查看。

| 场景 | 已确认预期 | 实际观察与证据 | 用户结论 |
|---|---|---|---|
| P6-14 备份导出/恢复与旧包 | 原图/选用图/候选/固定输入字节与引用保留，源不变、目标独立；旧包不虚构原图，不抠图/生成 | 实际源页面导出V3：19件、45图、8431369字节，ZIP SHA-256=e6598bc877b83f69872e86720435480e5c120bbc14013c193b936418cea7c8f7；实际同包上传/导入恢复19件、跳过0。V1/V2夹具由真实导出的历史照片字节构造，各另导入1件（59/60），无原图/新任务。恢复端9页已实际查看；export-inspection、import-flow、legacy-results、verification-restore、visible-rechecked（文件前缀均p6-transfer10-） | PASS（用户“认可”代理验收及边界；非亲手执行） |
| P6-15 管理员复制保图 | 同上，已采用/未采用关系不变；目标独立，源只读，不重生 | 实际管理页预览源1/空目标4，真实首次复制19件、2搭配、2今日穿搭，槽位2/2、今日穿搭2/2对上。四种图片逐角色哈希/独立引用通过；复制端7页实际查看；copy-flow、verification-copy、visible-rechecked | PASS（用户“认可”代理验收及边界；非亲手执行） |

### 完整命令与结果

以下命令 cwd 均为 E:/Caches/Temp/libre-closet-p6-20261007-170937-63282e54/snapshot；UTF-8 读取在脚本内显式指定。每条结束后用 `exit $LASTEXITCODE` 保留退出码。171条页面操作的逐条 cwd、完整命令、退出码、工具输出在 p6-transfer10-ui-*.json，并索引于 results-final；顶层已有原执行返回见 execution-receipts。

| 完整 PowerShell 命令 | 退出码 | 实际结果 |
|---|---:|---|
| `& 'E:\Caches\Temp\libre-closet-p6-20261007-170937-63282e54\tools\node22-registry\package\bin\node.exe' .\p6-transfer10-export.cjs` | 0 | 页面真实下载包，45图字节与源一致 |
| `& 'E:\Caches\Temp\libre-closet-p6-20261007-170937-63282e54\tools\node22-registry\package\bin\node.exe' .\p6-transfer10-import.cjs` | 0 | 页面真实上传/导入19件；仅文件选择回调受控 |
| `& 'E:\Caches\Temp\libre-closet-p6-20261007-170937-63282e54\tools\node22-registry\package\bin\node.exe' .\p6-transfer10-copy.cjs preview` | 0 | 实际预览源1→空目标4，不覆盖 |
| `& 'E:\Caches\Temp\libre-closet-p6-20261007-170937-63282e54\tools\node22-registry\package\bin\node.exe' .\p6-transfer10-copy.cjs confirm` | 0 | 确认回调受控，真实复制到空目标4 |
| `& 'E:\Caches\Temp\libre-closet-p6-20261007-170937-63282e54\tools\node22-registry\package\bin\node.exe' .\p6-transfer10-legacy.cjs` | 最终0 | V1/V2各真实导入1件；此前工具500/回调超时退出1保留，不重复导入 |
| `& 'E:\Caches\Temp\libre-closet-p6-20261007-170937-63282e54\tools\node22-registry\package\bin\node.exe' .\p6-transfer10-http.cjs` | 最终0 | 使用产品真实返回的完整图片地址；92次读回可解码且字节一致，6次私有跨主人请求被拒绝 |
| `& 'E:\Caches\Temp\libre-closet-p6-20261007-170937-63282e54\tools\node22-registry\package\bin\node.exe' .\p6-transfer10-visible-recheck.cjs resume` | 0 | 一次刷新后16页重取无遮挡截图并逐页查看，不重复导入/复制/生成 |
| `& 'E:\Caches\Temp\libre-closet-p6-20261007-170937-63282e54\tools\node22-registry\package\bin\node.exe' .\p6-transfer10-verify.cjs final` | 0 | 四种图片字节、引用/别名关系、采用状态均保留；源/旧库/旧账本/产品工作树不变 |

### 失败输出、覆盖边界与收口

- 原工具失败保留：`base64 is not defined`、`MCP request failed with status 500`、`timeout waiting for automator response`、`APP-SERVICE-SDK:setStorageSync:fail too early`，对应 ui-export-bytes-read、ui-legacy-v1-wx-file、ui-legacy-v1-download-file、ui-recheck-account-restore。工具进程退出码为0但 JSON ok=false，外层脚本按失败退出1；不以退出0冒充成功。500未写入；旧包下载虽回调超时，真实下载记录和哈希证明已完成，复用原次文件而不重复导入；刷新后等SDK就绪才继续。
- 读回脚本初版退出1：漏带版本参数的地址404（http-readback-failure.json）；之后误加原规格未定义的 MIME 断言，旧公开图 Content-Type=null 但200且源/结果哈希相同（http-readback-failure-1791447540759.json）。改为从产品实际返回的完整地址读取并按原合同核对图片可解码/字节；不改产品、SPEC或 P5 TEST。另一次诊断文件重名触发 EEXIST 退出1，旧证据未覆盖。
- 文件选择和管理员确认使用受控回调；真实导出、下载、上传、导入、预览和复制均执行，未伪造业务响应。复制结果层曾被尚未关闭的原生确认框遮挡，原图预览也遮挡了部分旧截图；旧文件保留，重拍详情作为可见证据，不声称已验证真实鼠标确认或无遮挡复制结果弹框。未验手机文件选择/分享及真实 S3；这不是产品 FAIL。用户现已认可本次代理验收及已说明边界，但未实测项仍是 LIMIT，不能写成已经执行。
- 最终安全记录 final-safety、verification-final：源及已有行/图片、旧20件衣物/8任务/46文件、既有收费账本和产品源码不变；抠图0、生成0、真实付费0、出站保护无拦截。原SPEC GAP保留。Agent观察符合已定义保图标准；原外部结果在执行时保留空白用户结论和 wholeP6Accepted=false，本次用户反馈另登记如下，不回写原执行证据。

### 用户确认（2026-10-08）

- 用户原话：“认可”。对应上一轮明确询问“你认可这两项结果和上述边界吗？”，登记 P6-14、P6-15 用户 PASS，范围仅为两项代理补测结果及已说明的覆盖边界。
- 实际执行者仍是 Agent；不改写为用户亲手操作，不补造截图、手机文件分享或真实鼠标确认的证据。原截图报告和 results-final.json 保留确认前状态，本节为最新用户结论的权威落点。
- 本次不运行产品、不新增模型调用，只同步 docs/test.md、PROJECT_STATE.md、HANDOFF.md；原 P5 PASS/CLOSED、手机三项用户 PASS 和其余场景原结论保持不变。
- 整轮 P6 尚未取得用户明确收口结论；此前受控异常、其他模拟器观察及原首次状态 GET 提示 SPEC GAP 仍须按原范围处理，真实 S3 等未验项不因此变成已验。按 kun-cleanup-gate 保留四份活跃文档，不归档或记录 passed 的整轮里程碑，不提交、推送、发布或清理环境。

## P6 Current 整轮用户确认（2026-10-08）

<a id="P6-CURRENT-CLOSED-20261008"></a>

- 用户原话：“确认”。对应明确询问：是否接受现有验收范围，保留模拟异常、真实云存储和手机文件分享等覆盖限制及原规格缺口，结束 P6 并归档四份文档。整轮 P6 用户结论：PASS（约定范围）；wholeP6Accepted=true。
- 已接受的证据范围：本文件现有 P6-01～15 及原 A/B 子场景、五类真实模型效果认可、鸿蒙微信亲测三项、备份/复制代理验收；受控异常仍是模拟故障，其他模拟器观察不改写为用户亲手执行，原逐场景结论不批量填改。
- 未验范围继续保留：真实 S3 桶权限、首次微信登录全部分支、手机文件选择/分享、真实鼠标确认和正式生产数据/配置。首次整理状态 GET 失败的可见提示仍为 SPEC GAP，未定义新标准、未修复或虚称已关闭。
- P5 回归、证据预检、十项 manifest 全量执行与名称级三账均已 PASS；既有 CLOSURE-1 两独立轴 PASS、两项 CLOSED，沿用原报告，不重评或扣新配额。归档前只读复核当前载体/版本/哈希/原命令/执行结果与三账，十项一致、退出0；没有改写原 verification.json 或重跑产品测试。
- 本次只做文档收口和四文件逐个事务归档；测试源码、原收费/手机/截图证据继续原地保留。文内 cwd、完整命令及 docs/ 路径记录的是执行时位置，四份轮次 Markdown 归档后同目录保存；不新增 TEST、不回写已冻结历史、不提交、推送、发布或清理临时环境。
