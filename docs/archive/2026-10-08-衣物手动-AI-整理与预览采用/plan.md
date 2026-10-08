# 衣物手动 AI 整理与预览采用 PLAN

- 阶段：P3
- 状态：施工完成；P5 已通过，用户于 2026-10-08 确认按已说明范围关闭 P6
- 最后更新：2026-10-08
- 上游：docs/spec.md；用户已确认两项恢复与收费边界，并于 2026-10-06 明确“进入 PLAN”。

## 1 目标与非目标

### 上游条目索引

| 编号 | 类型 | 上游位置 | 条目 |
|---|---|---|---|
| MVP-01 | MVP 做 | SPEC 第 2 章第 1 项 | 新上传保留原图，现有抠图作为默认展示，不自动整理 |
| MVP-02 | MVP 做 | SPEC 第 2 章第 2 项 | 保存后手动触发，复用确认分类和五类固定提示词 |
| MVP-03 | MVP 做 | SPEC 第 2 章第 3 项 | 当前图、新图与原图可核对，生成成功先不替换 |
| MVP-04 | MVP 做 | SPEC 第 2 章第 4 项 | 明确采用后统一展示，保留原图 |
| MVP-05 | MVP 做 | SPEC 第 2 章第 5 项 | 退出恢复、防重复生成、失败保留、不自动收费重试 |
| AC-01 | 验收标准 | SPEC 第 3 章第 1 项 | 上传保存可用、原图可查看、未点击不生成 |
| AC-02 | 验收标准 | SPEC 第 3 章第 2 项 | 五类固定提示词、一张候选、不再分类、不支持时提示 |
| AC-03 | 验收标准 | SPEC 第 3 章第 3 项 | 退出重进保留原次状态与候选，不采用不改变展示 |
| AC-04 | 验收标准 | SPEC 第 3 章第 4 项 | 采用后衣橱与搭配图片一致，资料与原图不变 |
| AC-05 | 验收标准 | SPEC 第 3 章第 5 项 | 连点只生成一次，超时区分未知与失败、不自动重试 |
| EX-01 | 严重异常 | SPEC 第 4 章第 1 项 | 不满意不采用，误采用也不覆盖上传原图 |
| EX-02 | 严重异常 | SPEC 第 4 章第 2 项 | 采用失败不丢衣物、原图或先前图片 |
| EX-03 | 严重异常 | SPEC 第 4 章第 3 项 | 两个衣橱主人的图片与整理结果隔离 |
| EX-04 | 严重异常 | SPEC 第 4 章第 4 项 | 连点、返回及超时不额外生成，不虚称未扣费 |

### 继承自上游的硬约束

以下原文逐条继承，后文工程决定不是新增产品要求。

| 编号 | 上游原文 |
|---|---|
| HC-01 | “开始整理”和“采用整理图”是两个独立的用户决定；生成成功不等于用户采用。 |
| HC-02 | “上传原图”指本次上传中、抠图和生成之前收到的图片；可能已经过现有上传压缩，不承诺保留手机相册原文件的全部画质。生成结果不能覆盖它。 |
| HC-03 | 五类固定提示词沿用本轮已确认版本。现有“下装”根据已确认的细分类区分裤子与半身裙，不把五类提示词改造成一套新的衣物分类体系。 |
| HC-04 | 沿用现有分类识别与阿里云抠图；整理生成使用本轮选定的千问图像 3.0 Pro，不同时接入其他生成模型。 |
| HC-05 | 每次用户明确发起的整理只生成一张候选图，不走 A、B 两轮生成。同一件衣物处理中或结果待确认时不重复发起；明确失败和结果未知都不自动收费重试。查看进度、预览和采用只使用原次处理，不发起生成。 |
| HC-06 | 不改变已有衣物的分类、标签、所有权和搭配选择规则；整理失败或不采用，不能阻断正常的衣橱使用。 |
| HC-07 | 本轮先覆盖新增衣物，不自动改写历史衣物；历史记录若未独立保存上传原图，不能宣称已有抠图就是上传原图，也不承诺补回原图。 |
| HC-08 | 页面离开、微信挂起或关闭小程序不等于取消已发起的整理，也不等于采用。处理状态与已生成的待采用图必须保留，用户回来后继续查看；展示更新仍以用户明确采用为准。 |

### 目标

1. 新衣物可核对真实原图；在详情手动生成一张固定类别的整理候选。
2. 整理状态和候选留在后端，离开后可继续，避免重复触发收费生成。
3. 明确采用只改变展示图片，所有当前小程序图片入口保持一致，兼容现有数据使用路径。

### 非目标

- 不做自动生成、批量历史整理、真人试穿、逐件提示词、多模型切换或多候选管理。
- 不做鞋包配饰等未验证类别；不新增分类识别调用，不改变搭配推荐算法。
- 不建 Redis、消息队列、微服务、计费中心或通用任务平台。
- 不开发网页整理入口；不修复与本轮无关的历史状态工作流。
- 不提交、不合并、不部署、不上传体验版；真实收费联调须另行确认数量与账号。

## 2 现状调查

- 上传压缩、识别和人工确认已存在，编辑只提交资料；原生详情目前只有展示、编辑、删除和围绕搭配，没有整理入口。出处：miniprogram/pages/garment-form/index.js（compressPhoto、analyzePhoto、submit）、miniprogram/pages/garment-detail/index.js 与 index.wxml。
- 衣物实体只有 photo；create 只调用 storeImageFromFileUpload，未独立保存原图。findAll/findOne 按 owner 隔离并读取 photo。出处：src/dal/entity/garment.entity.ts、src/wardrobe/garment.service.ts。
- 文件层已有阿里云白底抠图、失败时本地兜底，以及不抠图的 storeOriginalImageFromFileUpload；后者仍会转换和缩放，不等于逐字节保留上传内容。Local/S3 都会消费上传流，不能把同一条流串行交给两次保存。出处：src/file/file-service.abstract.ts、src/file/local-file/local-file.service.ts、src/file/s3-file/s3-file.service.ts。
- 文件读取 /file/:fileName、nobg 和 watermark 当前有公开读取路径。因此仅在整理 JSON 中检查 owner，不能证明新增原图和候选私密。须同时阻断这些公开路径对新增私有文件的访问，不能把随机文件名当作鉴权。出处：src/file/controller/file.controller.ts、两种文件适配器的 getByShareableId。
- 列表、重复候选、推荐、今日穿搭分别拼接 garment.photo 的 URL；小程序 API 统一携带 Bearer，图片标签本身没有经过该请求封装。出处：src/wardrobe/miniapp-wardrobe.controller.ts、miniapp-outfit.controller.ts、miniapp-daily-outfit.controller.ts、miniprogram/utils/api.js。
- 分类为 tops、bottoms、outerwear、dresses 等八类；结构化品类已有半身裙、裤装、短裤，不能把所有 bottoms 都判为裤子。出处：src/wardrobe/garment-category.enum.ts、garment-tag-taxonomy.ts、recommendation/outfit-tag-profile.ts。
- 备份当前只包含展示图；导入把备份图交给 create。衣橱复制只复制 photo，并用目标主人重新保存。新增原图和私有图片必须经过这两个当前消费者，不能把备份里的处理图冒充相机原图。出处：src/wardrobe/miniapp-wardrobe.controller.ts（exportBackup/importBackup）、wardrobe-copy.service.ts。
- 已有 AI fetch 注入先例，但只有识图和搭配文本生成，没有整理任务。现有依赖方向 WardrobeModule → AiModule/FileModule，AiModule → FileModule，不需要反向引用。出处：src/ai/ai.module.ts、garment-vision.service.ts、src/wardrobe/wardrobe.module.ts。
- 已验证实验使用同步图像接口 qwen-image-3.0-pro、n=1、1024*1024、prompt_extend=false、watermark=false、seed=701；先记录已提交，再保存响应和图片。request_id 在这些实验中只是请求记录，不存在已验证的供应商任务查询流程。出处：C:/Users/Administrator/Desktop/千问三类固定提示词验证20261006/run-threecategories.cjs；只读核对，未执行脚本。
- 五类提示词来源已实际读取并核对 SHA-256。出处：C:/Users/Administrator/Desktop/衣物整理五类固定提示词20261006/五类固定提示词.json。运行时必须使用项目内副本，不依赖桌面文件。

### 相关项目规则

| 相关规则 | 来源 | 对本方案的影响 | 规划后复核 |
|---|---|---|---|
| 中文、小文件、清晰职责；研发提醒功能分支 | 用户提供的 AGENTS.md 指令 | 专门的整理服务、模型服务及页面辅助文件；P4 前确认分支 | 已遵守，P3 不创建分支 |
| 禁止批量删除；只能处理一个明确文件 | 用户提供的 AGENTS.md 指令 | 不设计批量清理脚本；回退保留新增数据 | 已遵守 |
| Windows Python 必须显式 UTF-8 | 用户提供的 AGENTS.md 指令 | 本轮验证用 Node UTF-8，不用 Python | 已遵守 |
| 业务、模型调用和存储分属 wardrobe、ai、file | docs/backend-architecture-source-of-truth.md 第 3、5、7、17、18 节 | 不在 Controller 或小程序中写模型规则，不加通用队列 | 已遵守 |
| 主人隔离；普通 AI 结果须人工确认 | 同文第 8、12、19 节，CONTEXT.md | 原图、任务、候选、采用均检查主人，采用单独触发 | 已遵守 |
| 架构接口/配置变动须同步真源及项目状态 | 同文第 20 节 | docs/backend-architecture-source-of-truth.md 与 PROJECT_STATE.md 纳入施工白名单 | 已纳入，只记录本轮事实 |
| 小程序是唯一用户产品；数据库库存状态列保留 | docs/adr/0005-miniapp-is-the-only-user-product.md、0006-no-garment-inventory-status.md | 不为网页新增入口，不动 garment.status 列 | 已遵守 |
| 真人衣橱不能用作灌数据或清空的验收对象 | CONTEXT.md、HANDOFF.md | 自动化用内存库与假模型；真实验收用获准的沙盒 | 已遵守 |

### 改前测试基线

工作目录均为 E:/orca/Libre-Closet/youhua；2026-10-06 实际执行。本轮为运行检查安装了工作区依赖，postinstall 补丁成功；未改包清单或锁文件。系统 Node 为 24，以下后端检查显式使用已核实的 Node 22.23.3。

| 命令 | 退出码 | 摘要 |
|---|---:|---|
| npm run test:miniapp | 0 | 原生小程序静态校验通过 |
| $env:TZ = 'UTC' 后执行 npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand | 0 | 41 套件、240 项通过，无真实模型调用 |
| npx --yes --package=node@22.23.3 -- node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.build.json | 0 | 后端编译检查通过，不生成部署产物 |

另外实际打开并关闭了一次内存 SQLite，Node 22.23.3 下 better-sqlite3 返回 ok=1。未启动生产服务或使用生产数据库。基线不是 Git 固定点；施工固定点仅由 P4 写入 docs/test.md。

## 3 方案

### 模块与数据流

沿用现有模块，新增窄职责文件。完整路径：

相机上传 → 人工确认分类 → 保存原图和现有抠图 → 默认展示抠图
→ 手动开始整理 → 后端持久化记录 → 一次模型生成 → 保存私有候选
→ 预览核对 → 明确采用 → 更新 garment.photo → 所有小程序展示读同一字段。

数据采用扩展而不回写历史：

- Garment 新增 nullable originalPhoto → File；photo 继续是当前选用的展示图。历史 originalPhoto 保持 null，不能回填 photo 作为原图。
- 新实体 GarmentImageNormalization 每件衣物只持有一份当前记录，garment_id 唯一且删除衣物时级联移除记录，不建立候选历史界面。
- 记录字段：id、garment、attemptKey、status、sourcePhoto、candidatePhoto、promptFamily、promptVersion、model、providerRequestId、resultUrl、errorCode、createdAt、updatedAt、dispatchedAt。candidatePhoto 可空，resultUrl 只供后端恢复已返回图片的下载，不暴露给前端。
- status 取 queued、processing、uncertain、ready、failed。是否已采用由 garment.photo.id === candidatePhoto.id 推导，不另存一份 adopted 标志，避免采用事务被拆成两份状态。
- sourcePhoto 固定本次抠图输入；attemptKey 固定本次手动触发。所有更新以记录 id + attemptKey + 允许的旧 status 做条件更新，晚到的旧响应不能覆盖新次结果。
- 原图和候选使用 FileService 的保留私有文件名空间 private-，不改变 File 实体结构；它是阻断公开读取的标记，不是访问凭证。文件内容仍由 storage Owner 保存，关系仍由业务 Owner 持有。

### 模块边界契约

| 模块 / Owner | 职责与数据归属 | 公开契约 / 入口 | 允许依赖（方向） | 禁止依赖 |
|---|---|---|---|---|
| GarmentService | 衣物资料、主人、originalPhoto/当前 photo 关系；采用只改 photo | create 的内部上传来源选项；findOne；readOwnedPhoto；adoptNormalizedPhoto；新衣物图片引用导入 | wardrobe → file、DAL | 模型请求、任务重投、调用整理服务造成循环 |
| GarmentImageNormalizationService | 当前整理记录、状态转换、分类路由、预览和采用协调 | start(id,userId,attemptKey)、get(id,userId)、adopt(id,userId,attemptKey)、getCandidate、exportSnapshot、restoreSnapshot | wardrobe → GarmentService、file、AI、DAL | 直接改 garment.photo/标签；在 GET 中发起生成 |
| GarmentImageNormalizationWorker | 领取 queued、一次派发、保存晚到结果、恢复安全下载 | runPending、recoverOnStartup；由现有 WardrobeModule 注册 | worker → 整理服务、AI、file | 小程序回调驱动生命期、绕过持久化领取、自动重发模型 POST |
| GarmentImageService / AI | 固定提示词、图像输入准备、请求与响应归一 | generate(inputBytes,family) → GeneratedImageResult 或失败类别；GARMENT_IMAGE_FETCH 注入 | AI → FileModule 的既有方向保持，不新增 wardrobe 引用 | 读写衣物或任务库、根据单件外观改提示词 |
| FileService | 图片字节、私有命名、上传单次消费、本地/S3 实现 | storeGarmentPhotosFromFileUpload、storePrivateImageBuffer、copyStoredFile、get；公开读取须排除私有文件 | file → DAL、存储 SDK | 衣物分类、采用决策、调用整理生成 |
| 图片 URL view model | 当前展示 URL 的唯一转换规则 | garmentPhotoUrl(garmentId,file:{id,fileName},origin) | Controller → 该公开纯函数与 file 命名契约 | 数据库查询、标签规则、在多 Controller 重复私有 URL 判断 |
| GarmentImageTransferService | 备份和沙盒复制图片引用映射，不拥有核心衣物或任务状态 | exportImages、importImages、copyImages | transfer → GarmentService、整理服务、FileService | 直接写内部仓库、复制源所有权、重放收费任务 |
| 小程序 api/image-source/详情辅助文件 | 请求与带鉴权图片下载；页面事件、查询与预览 | api.start/get/adoptGarmentNormalization；resolvePrivateImageUrls；详情页面公开事件 | 页面 → api → 后端公开 JSON/图片路由 | 前端保存模型 Key、判定真实扣费、直接调用模型 |

adoptNormalizedPhoto 的公开参数为 garmentId、userId、candidateFileId、expectedPhotoId；检查主人及候选 File 的 createdBy，并以原 photo 关系做条件更新。重复采用同一 candidate 返回当前衣物；冲突返回明确错误，不清除任何图片。整理服务先确认该候选属于当前 ready 记录及 attemptKey，再调用它，候选字段不可从请求随意指定。

GeneratedImageResult = { requestId, imageUrl, usage }；imageUrl 是模型已完成返回的图片，不是新生成入口。分类与提示词统一传 family，禁止页面传自由 prompt。

family 的公开取值固定为“上衣、裤子、半身裙、连衣裙、外套”，与已确认提示词文件的键一致；AI 服务公开导出该类型，wardrobe 只依赖服务公开类型，不深层导入内部提示词文件。NormalizationView 无任务时 status=idle，attemptKey=null、adopted=false；类别或原图不满足时仍 idle 且 canStart=false，并给出原因。所有前端字段固定为 attemptKey、status、family、message、originalPhotoUrl、candidatePhotoUrl、adopted、canStart、canAdopt；当前展示图继续从衣物 item.photoUrl 读取，不再存一份展示状态。

Worker 只能通过整理服务的公开状态操作 claimQueued、saveProviderResult、completeCandidate、markFailed、markUncertain、recoverDispatched 工作，不直接访问任务 Repository。claimQueued 返回 NormalizationWorkItem = {recordId,attemptKey,garmentId,ownerId,sourceFileName,family} 或 null；sourceFileName 只在后端用于 FileService.get。所有回写操作都带 recordId/attemptKey，saveProviderResult 接收 GeneratedImageResult，completeCandidate 接收已落盘的 candidateFileId。Transfer 使用 NormalizationTransferSnapshot = {status,promptFamily,promptVersion,model,sourcePhotoRef,candidatePhotoRef}；图片 Ref 在包内是图片条目引用，导入/复制时转换为目标 File ID 后交给 restoreSnapshot，不携带原所有权、供应商凭证或可重放派发标志。

### 跨模块连接与验证

| 消费者 → 提供者 | 公开契约与数据 | Test Seam | 最小集成检查 |
|---|---|---|---|
| 新增入口 → GarmentService → FileService | storeGarmentPhotosFromFileUpload → { originalPhoto, photo } | 实际 Controller/Service + 内存库 + 假分割 | TEST-015：单次消费、原图字节不变、抠图一次、生成零次 |
| 整理入口/Worker → 整理服务 → AI/FileService | attemptKey、family、GeneratedImageResult、candidatePhoto | 真业务链，只有外部模型/存储为假实现 | TEST-016、018：固定五类、一次派发、结果不直接采用、恢复不重投 |
| 图片入口 → GarmentService/整理服务 → FileService | original/display/candidate 角色读取 | 带两份测试 JWT 的真实路由 | TEST-015：主人可读，另一主人、未登录及公开绕路均读不到 |
| 采用入口 → 整理服务 → GarmentService | adoptNormalizedPhoto 与当前 photo | 采用后再调用列表/详情/推荐/今日穿搭入口 | TEST-020：共同显示选中图，其他字段、原图及生成次数不变 |
| 小程序页面 → api → 图片入口 | JSON 状态、带 Bearer 下载、临时本地路径 | Node VM 触发 Page 事件并观察 wx 请求 | TEST-017、019、021：预览、重进、连点、采用及所有已登记图片形状 |
| 备份/复制 → Transfer → 业务 Owner/FileService | 图片角色快照、目标 File 引用 | 当前备份/复制公开入口 | TEST-022、023：原图不丢、引用独立、源不变、不派发任务 |

### 契约影响面闭环

已在 src/wardrobe、src/file、src/ai、miniprogram/pages、miniprogram/utils、README.md 和当前 docs 中有界检索：photoUrl、photo.fileName、storeImageFromFileUpload、copyStoredFile、backup、QWEN、nobg、watermark、onShow。归档只检索 TEST 元数据并读命中的资产段。下面登记当前所有直接落点，不让 P4 再决定范围。

| 编号 | 产品行为 / 契约 | 真源 / Owner | 当前消费者与公开配套面 | 关系证据 | 处置 |
|---|---|---|---|---|---|
| CC-01 | 新上传原图、私有文件和角色读取 | GarmentService、FileService | garment.entity、create-garment.dto、garment.service、miniapp-wardrobe.controller；file interface/abstract、Local/S3、FileController；详情、api/image-source；相关测试 | create → storeImageFromFileUpload；公开 getFile/nobg/watermark；详情 photoUrl | 修改点列于白名单；新增照片 Controller；File 实体和 FileModule 只读验证，无需换存储实现 |
| CC-02 | 五类固定提示词、一张生成候选 | 整理服务、AI | 新分类路由/提示词/模型服务；AiModule/WardrobeModule；app.module 配置；详情事件/API；README 配置表、架构真源、PROJECT_STATE | taxonomyTags.category/subcategory；GARMENT_VISION_FETCH 先例；实验同步请求 | 修改上述当前落点；旧 Vision/Outfit AI 只读回归，不改识别模型 |
| CC-03 | 恢复、查询、防重复收费 | 整理服务/Worker | 新实体与双数据库迁移；状态 Controller；详情辅助文件、api；恢复集成测试和页面事件脚本 | onShow/loadGarment；start/read/worker 的共同 attemptKey | 修改对应新增落点；身份和查询同 CC-01；不新增刷新后自动生成 |
| CC-04 | 显式采用及全部展示一致 | GarmentService 的 photo | miniapp-wardrobe 列表/详情/重复候选、miniapp-outfit、miniapp-daily-outfit；新 URL helper；api/image-source；outfit 页面 onShow；相关测试 | 三处 toGarmentCard/toViewModel 均拼接 photo URL | 修改这些生产者与缓存刷新；wardrobe、garment-form、add/edit/daily-outfit 的图片模板只读验证：继续绑定 photoUrl，由统一 API 解析，无需换模板 |
| CC-05 | 新图片经过现有备份和衣橱复制 | Transfer + 各数据 Owner | miniapp-wardrobe export/import；wardrobe-copy；create-garment.dto、FileService.copyStoredFile；对应当前测试 | ZIP manifest.photo、copyStoredFile → create(photoFileName) | 修改并保留现有所有资料与权限断言；管理员列表/Excel 只读验证：仍读取选用 photo，不需要访问新增原图 |
| CC-06 | 当前公开说明和回归入口 | 后端架构真源、package.json | README.md、docs/backend-architecture-source-of-truth.md、PROJECT_STATE.md；package.json、validate-miniapp-shell、既有鉴权/AI/推荐测试 | 文档第 20 节要求同步；现有 scripts/Jest 配置 | 修改三份说明；其余只读运行。无需新增 npm 依赖或改 package.json |

网页衣橱及 outfit.service 的 PWA 图片模板登记为退役用户入口排除，依据 ADR 0005；不新增网页功能。公开 FileController 仍是活跃共享读取入口，已经覆盖，不能随网页一起排除。docs/archive 中的旧 PLAN/TASK/TEST 及桌面实验材料为历史/验证材料，只读，不回写或部署它们。

### 关键决定

1. 上传来源由服务端入口明确指定：正常小程序新增使用 camera-upload；备份/复制使用 stored-image。不是让客户端提交一个可信“这是原图”的标志。旧调用默认沿用现状，历史展示图没有原图关系。
2. FileService 先把上传流读为一份 Buffer，原始字节保存至私有文件，再把同一输入交给现有抠图一次。原图写入失败不报告保存成功；抠图原有降级不改。模型成功输出只做可读图片校验与存储，不再抠图。
3. 首版固定 qwen-image-3.0-pro 与实验参数 n=1、size=1024*1024、prompt_extend=false、watermark=false、seed=701。复用 QWEN_API_KEY；新增 QWEN_IMAGE_ENABLED（默认 false）、QWEN_IMAGE_MODEL（只允许选定模型）、QWEN_IMAGE_API_URL、QWEN_IMAGE_TIMEOUT_MS（默认 240000）。配置缺失在发送前报明确错误，不能影响普通上传。
4. 结构化 taxonomyTags.category 有值时优先使用；空时读取用户确认的 subcategory。tops→上衣、outerwear→外套、dresses→连衣裙；bottoms 只有明确裤装/短裤/裤子/长裤/牛仔裤/西裤等裤类词或半身裙/裙装等裙类词才路由。裤裙冲突、连体装、空白或无法归类均提示不支持，不猜测、不识图补分。路由只读，不回写类别。
5. 提示词版本为 20261006-v1，由 AI 文件持有，复制已认可文字，不拼入单件标签、不启用自动扩写。已核对文本 SHA-256：上衣 ac234938f7a16732375d7f28f5fd77089203f321e46c57e824852d625920d18f；裤子 0af5ac12660291e480b4c477017bf97d0653866cd3bfedfe161056e854ba95b3；半身裙 1943760f0922ad385507bfcc5411eee857dc9fd2b2667d746b28a73c8b4cb00e；连衣裙 843fc4cb9b3bc87233ca11e1cce8db2a7e03823f4eab7f81e485086f26e9639e；外套 8f065c083714b57d92906a3896a60368529207c40bd0b0f49aef3e0704c7ff72。
6. start 在事务中以 garment_id 唯一记录和条件写入防并发。queued/processing/uncertain/ready 已存在时返回原次记录；已有 ready 图继续预览，不因又点按钮收费。明确 failed 后，只有新一次手动点击的新 attemptKey 才允许新尝试；同 key 永不重投。
7. Worker 先把 queued 条件领取为 processing 并落盘 dispatchedAt，再发送唯一一次 POST。小程序 POST 只返回任务受理结果，不等待四分钟生成。Worker 用独立 EntityManager 上下文；无工作时不派发，不引入新队列组件。
8. 客户端开始请求超时先 GET 原次状态，不能重发开始请求。小程序后台停轮询，回来或重启先 GET；轮询只读取任务，不调用模型。服务器重启可领取尚未派发的 queued；原 processing 没有完整结果的保守转 uncertain，不重发，不能保证外部恰好一次交付。
9. 模型完整响应一到即记录 requestId/resultUrl；下载落盘成功后才 ready。下载失败可继续取已经返回的同一图片，不能重新生成；没有完整响应的断网/超时/服务中断为 uncertain。只把可确认拒绝或发送前错误判 failed。同步实验没有证明供应商可按 request_id 查图，不设计虚构的查任务接口；结果始终无法确认时保持未知并阻止额外生成。
10. 三个公开 JSON 接口统一 { item: ... }：POST /api/miniapp/garments/:id/normalization（attemptKey）；GET 同路径；POST 同路径/adopt（attemptKey）。公开快照包含 attemptKey、status、family、message、originalPhotoUrl、candidatePhotoUrl、adopted、canStart/canAdopt；不返回模型 Key、resultUrl、原图/候选物理文件名或原始供应商响应。
11. 图片 GET /api/miniapp/garments/:id/photos/:role（original/display/candidate）必须经过现有鉴权并显式检查有效 userId 和主人归属；即使 AUTH_ENABLED=false，也不能匿名读取私有图。服务端生成的角色 URL 统一带 ?v=<File.id>，Controller 在主人校验后核对 v 与该角色当前 File.id；缺失、无效或陈旧版本返回 404，不让同一 URL 在换图后返回另一张图片。响应使用 Cache-Control: private, no-store；File ID 仅作为版本，不是访问凭证，不泄露物理文件名。对私有文件，公开 file/nobg/watermark 一律拒绝，并校验文件名防编码路径绕过。S3 私有文件禁止公有 ACL；若部署桶策略允许裸读须暂停，不把接口鉴权当作桶权限证明。
12. 小程序 resolvePrivateImageUrls 只解析同源上述受保护路由，并用 wx.downloadFile + Bearer 换成本地临时路径；按当前登录身份和完整带 v 的图片 URL 缓存，同一 URL 合并下载。旧公开 photoUrl 原样通过，其他外域不携带令牌。登录身份变化失效缓存，在途旧身份返回不得填入新页面；日志不记录令牌。
13. 采用只调用 GarmentService 修改 photo；不调用旧 update 上传处理或 deleteOldPhoto。保留 sourcePhoto、originalPhoto、candidatePhoto 所引用文件。新文件名不可变，采用后 display URL 的 v 随 File.id 更新，不能复用只含角色路径的缓存键。推荐页重新进入仅重新读取衣物图并按 id 更新当前卡片，不重新推荐、不改理由或选择规则。
14. 兼容备份版本 1/2，新增版本 3 的可选 originalPhoto 与 normalizationSnapshot。存量包无原图就保持 null；新包保留原图、当前展示、已有候选及本次固定输入图 sourcePhoto 的字节与引用，即使采用后 sourcePhoto 不再是当前展示，也必须入包。相同 File 通过引用映射去重后恢复。只恢复本地图片和状态快照，不恢复供应商凭证或重放生成；queued/processing/uncertain 快照保守为 uncertain，ready 带候选则保留 ready。包中声明的任一图片引用缺失时先拒绝该不完整包；未声明原图的合法旧记录仍为 null，不能伪造原图。
15. 沙盒复制沿用已有白名单和确认规则，把原图、当前展示、候选及固定输入图 sourcePhoto 复制成目标主人自己的 File，保留私有标记；任务生成信息只做同样的本地快照恢复，不能复制可运行的派发记录。相同源 File 用映射去重；不修改源、不自动调用抠图或生成。删除衣物沿用现有业务操作，阻断晚到结果回写；不新增批量文件清理。

### 硬约束落实

| 硬约束 | 工程落实方式 |
|---|---|
| HC-01 | start 与 adopt 独立路由；ready 不改 photo |
| HC-02 | originalPhoto 引用保留上传 Buffer；不经模型、不被 adopt 替换 |
| HC-03 | 只读已确认大类/细分类，固定 family 和版本；分类表不变 |
| HC-04 | 保留 Vision/抠图，独立图像请求配置与选定模型 |
| HC-05 | n=1；数据库领取与 attemptKey；GET/预览/采用零生成；未知不重投 |
| HC-06 | 只改展示引用，资料和推荐算法只读；失败页面保留原衣物 |
| HC-07 | 历史 originalPhoto=null、不自动回填；旧包不冒充原图 |
| HC-08 | 任务与候选后端持久化，Page 生命周期只查询；关闭不是取消/采用 |

### 放弃的选项

- 前端等到模型结束再保存：退出会丢掉结果；长请求超时容易诱发重复收费。
- 仅按钮禁用或仅进程内锁：重启、双设备和重复网络请求仍可重复生成。
- 覆盖原文件/将候选放公开 URL：不便核对原图，缓存不一致，还绕过主人隔离。
- 一开始引入 Redis/队列平台：两人单进程没有这个规模，数据库一份状态及一次派发足够。
- 自动失败重试或拿 request_id 当任务查询号：未验证供应商恢复合同，不能为方便而重复付费。

### Test Seam

| Seam | 覆盖的上游条目 | 现有先例 | 选择理由 |
|---|---|---|---|
| 真实小程序 Controller → 业务服务 → 内存 SQLite；仅模型/存储伪造 | AC-01～05、EX-01～04 | miniapp-wardrobe.controller.spec.ts、conditional-auth.guard.spec.ts、migrations/garment-tags-backfill.migration.spec.ts | 新增窄集成载体，能证明权限、事务、防并发及多个展示入口，而非两份隔离单测 |
| GarmentImageService.generate 的注入 fetch | AC-02、AC-05、HC-03～05 | garment-vision.service.spec.ts 的假 fetch | 精确观察一次请求、固定 prompt、n=1、错误分类，无付费 |
| Node VM 触发 Page.onShow/页面按钮及 wx 行为 | AC-02～05、EX-04 | validate-miniapp-shell.cjs、validate-admin-wardrobe-copy.cjs 的页面合同先例 | 增加真实事件观测，不能仅靠搜索按钮名证明退出或采用正确 |
| 当前 exportBackup/importBackup、WardrobeCopyService.copy | HC-02、06、07、EX-03 | 当前备份与复制测试；命中历史 TEST 资产 | 在现有公开边界扩展图片引用，保留所有旧资料与权限保护 |

## 4 界面与流程

- 入口仍在衣物详情，不增加页签或网页页面；展示当前图片，原图存在时提供“查看原图”。
- 无任务且支持类别时显示“AI 整理”；旧衣物缺原图或类别无法确定时说明原因，不偷偷回填原图或调用分类。
- queued/processing 显示“整理中”，开始按钮不可再次发起；仍可查看原衣物。退出、切后台不取消；回到详情恢复查询。
- uncertain 显示“结果待确认，可能已产生本次费用”，提供“查看处理状态”，不是“再生成”；明确 failed 显示失败，不自动重试。
- ready 展示当前图/候选对比，原图另可放大核对，使用完整显示比例而不是裁掉衣服的对比缩略图；只有“采用整理图”发起 adopt。“暂不采用”只收起预览，不删除候选。
- adopt 成功提示“已采用”；再次读取时从 photo 与 candidatePhoto 关系显示已采用，继续可核对原图。不满意在采用前退出，展示不变。
- 图片或状态临时加载失败显示局部提示，不清空已加载的衣物资料；重新查看只做查询。保存、开始受理、候选保存和采用是四个不同写入点，不串成自动流水线。
- 只面向小程序；当前图片消费者通过同一 photoUrl 与 API 下载处理取得一致展示。退出恢复不等于新增通知、订阅消息或后台常驻。

## 5 文件白名单

### 允许范围与文件职责

以下仅为用户认可 TASKS 后的施工授权范围，P3 不修改这些产品文件。每张 TASK 的允许改必须是此表子集。测试文件只由 a 卡改，实现卡不得改断言。

| 精确路径 | 动作 | 职责 | 不负责 | 本次变化 |
|---|---|---|---|---|
| src/dal/entity/garment.entity.ts | 修改 | 衣物持久化字段 | 状态规则/模型 | nullable originalPhoto |
| src/dal/entity/garment-image-normalization.entity.ts | 新建 | 当前整理记录结构 | 调度/业务判断 | 唯一 garment、一次尝试字段 |
| src/dal/migrations/sqlite/Migration20261006000100.ts | 新建 | SQLite 扩展 schema | 回填原图/删旧行 | 原图关联、任务表、约束 |
| src/dal/migrations/postgres/Migration20261006000100.ts | 新建 | PostgreSQL 同等扩展 | 新业务算法 | 与 SQLite 字段对应 |
| src/dal/migrations/garment-image-normalization.migration.spec.ts | 新建 | 迁移保护测试 | 产品代码 | 旧行保留、唯一关系 |
| src/file/file-service.interface.ts | 修改 | 文件公开命名/接口 | 衣物策略 | 新存储契约、私有标记判定 |
| src/file/file-service.abstract.ts | 修改 | 单次读流/通用图片准备 | 分类/采用/生成 | 双图保存、私有读取规则 |
| src/file/local-file/local-file.service.ts | 修改 | 本地字节及 File 记录 | 整理任务 | 私有 Buffer、复制保留标记、公开 share 保护 |
| src/file/s3-file/s3-file.service.ts | 修改 | S3 字节及 File 记录 | 业务规则/桶运维 | 同等私有存储与复制 |
| src/file/controller/file.controller.ts | 修改 | 公共图片入口 | 主人业务查库 | 拒绝私有/路径绕过 |
| src/file/file-service.abstract.spec.ts | 修改 | 文件公开行为 | 模型效果验收 | 新读流与原有兜底回归 |
| src/file/local-file/local-file.service.spec.ts | 修改 | 本地存储合同 | 整理算法 | 字节、私有标记、复制保护 |
| src/file/s3-file/s3-file.service.spec.ts | 修改 | S3 存储合同 | 真实桶权限证明 | 同等合同行为 |
| src/file/controller/file.controller.spec.ts | 修改 | 公共入口保护 | 真实微信登录 | 私有公开绕路拒绝 |
| src/wardrobe/dto/create-garment.dto.ts | 修改 | 内部图片引用输入 | 前端可信原图标志 | 明确来源与复制关联 |
| src/wardrobe/dto/garment-image-normalization.dto.ts | 新建 | 整理公开快照/请求 | 存储实现 | 固定字段与角色 |
| src/wardrobe/garment.service.ts | 修改 | 衣物 Owner | 模型/任务生命期 | 原图保存、按主读取、条件采用、导入引用 |
| src/wardrobe/garment.service.spec.ts | 修改 | 衣物公开行为 | 新模型请求 | 保留原有资料、图片变更约束 |
| src/wardrobe/garment-image-category.ts | 新建 | 五类确定性映射 | 识图/标签回写 | 类别冲突拒绝 |
| src/wardrobe/garment-image-normalization.service.ts | 新建 | 任务 Owner/状态规则 | 直接改衣物/实际模型协议 | start/get/adopt、快照与一次领取 |
| src/wardrobe/garment-image-normalization.worker.ts | 新建 | 持久任务驱动 | 通用队列/前端状态 | 单次派发、重启与下载恢复 |
| src/wardrobe/miniapp-garment-image.controller.ts | 新建 | 整理及受保护图片入口 | 复杂规则/模型 | 校验、调用公开服务、JSON/流 |
| src/wardrobe/view-models/garment-photo.view-model.ts | 新建 | 展示图 URL 映射 | 查库/分类 | 按 File.id 版本化私有路由与旧 URL 兼容 |
| src/wardrobe/garment-image-transfer.service.ts | 新建 | 图片快照的导出/导入/复制 | 绕过 Owner 写库/派发 | 映射图片引用，停止任务重放 |
| src/wardrobe/wardrobe.module.ts | 修改 | 注入注册 | 业务算法 | 实体/服务/Controller/Worker 注册 |
| src/wardrobe/miniapp-wardrobe.controller.ts | 修改 | 衣物与 ZIP 入口 | 整理生命期/图片映射规则 | 新增来源、URL helper、Transfer 接入 |
| src/wardrobe/miniapp-outfit.controller.ts | 修改 | 推荐 JSON | 推荐算法/生成图片 | 使用 photo URL helper |
| src/wardrobe/miniapp-daily-outfit.controller.ts | 修改 | 今日穿搭 JSON | 整体穿搭照片新处理 | 衣物卡片使用同一 helper |
| src/wardrobe/wardrobe-copy.service.ts | 修改 | 已授权沙盒复制编排 | 新权限规则/派发任务 | Transfer 接入和新引用读取 |
| src/wardrobe/garment-image-normalization.integration.spec.ts | 新建 | 跨模块公开路径集成 | 私有方法单测/收费联调 | TEST-015/018/020 |
| src/wardrobe/miniapp-wardrobe.controller.spec.ts | 修改 | 当前 JSON/备份测试 | 改旧验收意图 | 增量适配依赖、版本 3 兼容 |
| src/wardrobe/miniapp-outfit.controller.spec.ts | 修改 | 推荐图合同回归 | 改推荐规则 | 私有展示与旧卡片合同 |
| src/wardrobe/miniapp-daily-outfit.controller.spec.ts | 修改 | 今日穿搭图回归 | 改整体照片规则 | 单件选用图一致 |
| src/wardrobe/wardrobe-copy.service.spec.ts | 修改 | 当前复制合同 | 修改源/真人写入 | 新图片复制、原有保护保留 |
| src/ai/garment-image-prompts.ts | 新建 | 固定提示词真源 | 单件分析 | 原样五段文本、版本 |
| src/ai/garment-image.service.ts | 新建 | 模型请求边界 | 主人/衣物 DB | 固定参数、fetch 注入、响应分类 |
| src/ai/garment-image.service.spec.ts | 新建 | 模型协议测试 | 真实费用/效果 | TEST-016 |
| src/ai/ai.module.ts | 修改 | 模型服务注入 | 业务规则 | 新服务/fetch 注册导出 |
| src/app.module.ts | 修改 | 配置声明 | 提示词/调度 | 新图像配置，默认关闭 |
| miniprogram/utils/api.js | 修改 | 认证请求封装 | 模型/提示词 | 整理接口、统一图片解析接入 |
| miniprogram/utils/image-source.js | 新建 | 受保护图片下载 | 主人识别/后台生成 | 同源限制、身份隔离缓存 |
| miniprogram/pages/garment-detail/image-normalization.js | 新建 | 详情整理事件/轮询辅助 | 直接 wx 模型请求 | 预览、恢复、采用辅助 |
| miniprogram/pages/garment-detail/index.js | 修改 | Page 生命周期/资料展示 | 巨型整理状态机 | 接入辅助文件、原图查看 |
| miniprogram/pages/garment-detail/index.wxml | 修改 | 详情呈现 | 提示词/状态规则 | 整理按钮、对比、采用/提示 |
| miniprogram/pages/garment-detail/index.wxss | 修改 | 对比布局 | 数据处理 | 完整服装预览样式 |
| miniprogram/pages/outfit/index.js | 修改 | 已有推荐页面呈现 | 重新推荐/规则变更 | onShow 仅更新已有卡片图片 |
| scripts/validate-garment-image-normalization.cjs | 新建 | 页面事件合同验证 | 实现代码/真实外网 | 固定三个用例入口，VM 假 wx |
| README.md | 修改 | 当前配置公开说明 | 新商业化流程 | 图像配置、手动与未知状态说明 |
| docs/backend-architecture-source-of-truth.md | 修改 | 当前实现真源 | 伪造已部署事实 | 新公开契约、Owner、配置 |
| PROJECT_STATE.md | 修改 | 当前本轮事实 | 覆盖历史记录 | 实际施工/验证状态，不声称部署 |
| docs/plan.md | 修改 | 认可后的工程合同 | 施工时自由改范围 | 方案变化须回 P3 |
| docs/task.md | 修改 | 唯一任务状态 | 内联测试定义 | 状态、实际改动、证据指针 |
| docs/test.md | 修改 | TEST manifest/执行证据 | 替代源码 | P4 固定点、哈希和红绿记录 |

### 禁止触碰

- package.json、package-lock.json：不用新增依赖；现有测试命令直接复用。
- src/ai/garment-vision.service.ts、src/ai/outfit-ai.service.ts、src/wardrobe/recommendation/outfit-generator.service.ts：不改识别和推荐逻辑。
- src/dal/entity/file.entity.ts、src/dal/dal.module.ts、src/file/file.module.ts：现有字段/适配选择足够；发现必须改时回 P3，不自行扩权。
- src/auth/conditional-auth.guard.ts：复用鉴权并在新入口显式拒绝无有效主人，不顺带重构鉴权。
- docs/spec.md、CONTEXT.md、HANDOFF.md、docs/PROJECT_LOG.md 与所有既有 ADR/冻结归档：P3 不重写，施工不改需求或旧结论。
- .env、.env.local、生产数据卷/SQLite、真实用户照片、生产仓库、部署工作流及密钥文件：不读取输出秘密、不改真人衣橱，不发布。
- 其余不在允许表内的文件：一律先暂停回 P3；不批量删除文件或目录。

## 6 验证方式

### 自动验证

工作目录：E:/orca/Libre-Closet/youhua。后端完整命令为以下两行 PowerShell；TZ 在命令中显式设置，不能依赖机器已有环境：

~~~powershell
$env:TZ = 'UTC'
npx --yes --package=node@22.23.3 -- node node_modules/jest/bin/jest.js --runInBand
~~~

改前已通过 41 套件、240 项。npm run test:miniapp 已通过；无产物 tsc 命令见第 2 章，已通过。P4 新资产命令精确列在 TEST 中；它们目前 planned，不冒充已经写好或已绿。P5 必须执行 manifest 全部命令，再执行以上整体回归、小程序静态检查与 tsc。

模块边界没有现成依赖图检查工具；不新增 lint 框架。评审逐条核对 Owner/公开导入方向，使用上述跨模块集成路径验证，不能以两份隔离单测代替。

### TEST 资产策略

检索证据：按照片、备份、复制、归属、Seam 搜索当前测试和归档 TEST 元数据，命中并只读 2026-08-22 的 TEST-004、2026-08-20 的 TEST-002/004 小节。历史不同轮次存在同号异义，本轮不回写历史；新资产从已见最大编号 013 之后分配，Derived From 同时记录路径与旧编号。

| 上游条目 | 影响范围 / 风险词 / Seam | 历史检索证据 | 决策 | Asset ID | 来源或 derived-from |
|---|---|---|---|---|---|
| AC-01～05 | 小程序现有结构 | 当前静态脚本已通过 | reuse | TEST-014 | scripts/validate-miniapp-shell.cjs，本轮首次登记 ID |
| AC-01、EX-01/03、HC-02/07 | 原图/单次读流/主人隔离/公开绕路 | 现有 Controller 和文件测试没有原图合同；归档无此资产 | new | TEST-015 | 无 |
| AC-02/05、HC-03～05 | 五类/固定文本/一张/同步响应 | Vision fetch 先例可借结构，语义不是图像生成 | new | TEST-016 | 无 |
| AC-02/03、HC-01 | 手动生成/预览 Page 事件 | 复制页静态资产不验证此行为，不能冒充复用 | new | TEST-017 | 无 |
| AC-03/05、EX-04、HC-05/08 | 并发/重进/重启/晚到/未知 | 归档没有一次派发恢复资产 | new | TEST-018 | 无 |
| AC-03/05、EX-04 | 前端超时/关闭/身份隔离 | 原静态脚本不证明 Page 事件与请求次数 | new | TEST-019 | 无 |
| AC-04、EX-01～03、HC-06 | 采用/原图保留/多入口 photo | 当前卡片测试未证明显式采用 | new | TEST-020 | 无 |
| AC-04、HC-01/05 | 前端采用/列表与缓存一致 | 归档未覆盖此事件 | new | TEST-021 | 无 |
| HC-02/06/07、EX-03 | backup/原图/已处理图片 | 2026-08-22 TEST-004 当前载体可扩展，断言语义改变 | adapt | TEST-022 | 上述归档 TEST-004 |
| HC-02/06/07、EX-03 | copy/源不变/目标私有图 | 2026-08-20 TEST-002 当前载体可扩展，须保留全量和权限保护 | adapt | TEST-023 | 上述归档 TEST-002 |

### 人工验收

1. 获准的验收沙盒打开新增 → 上传一张真实照片并确认资料 → 保存后看默认图及原图，没点整理没有候选。
2. 五类各一件打开详情 → 手动整理 → 完整新旧对比、可查看原图，不采用则衣橱仍旧图；本路径会收费，执行前另行确认 5 件上限。
3. 一件整理中退出/关闭 → 稍后重进 → 原次状态或候选仍在；预览退出再进，候选仍在。配合可控假模型验证超时与晚到，不盲目花钱造故障。
4. 有候选 → 点采用 → 详情、衣橱、现有推荐及今日穿搭中的这件图一致；资料、原图不变，查看与采用不增加生成计数。
5. 两个获准的沙盒主人 → 请求对方衣物的任务/图片/采用 → 被拒绝；自己的正常查看可用。不借真人衣橱做越权写实验。
6. 导出/导入及管理员复制新图衣物副本 → 原图和选用图可核对，候选和固定输入图字节、引用均保留，源未改、目标引用独立 → 不自动抠图或生成；旧包保持无原图而不是虚称有原图。

### 上游覆盖检查

此处“已覆盖”仅表示计划与验证映射完整，不表示功能或人工验收已通过。

| 上游条目 | 负责的 PLAN/TASK | 验证方式 | 状态 |
|---|---|---|---|
| MVP-01、AC-01、HC-02、HC-07 | 第 3 章；TASK-01a/01b、05a/05b | TEST-015/022/023，人工 1/6 | 已覆盖 |
| MVP-02、AC-02、HC-03、HC-04 | 第 3/4 章；TASK-02a/02b | TEST-016/017，人工 2 | 已覆盖 |
| MVP-03、AC-03、HC-01、HC-08 | 第 3/4 章；TASK-02a/02b、03a/03b | TEST-017/018/019，人工 2/3 | 已覆盖 |
| MVP-04、AC-04、HC-06 | 第 3/4 章；TASK-04a/04b、05a/05b | TEST-020/021/022/023，人工 4/6 | 已覆盖 |
| MVP-05、AC-05、HC-05 | 第 3 章；TASK-03a/03b | TEST-016/018/019，人工 3 | 已覆盖 |
| EX-01 | TASK-01a/01b、04a/04b | TEST-015/020/021，人工 2/4 | 已覆盖 |
| EX-02 | TASK-04a/04b | TEST-020：采用写失败原状态完整，人工 4 | 已覆盖 |
| EX-03 | TASK-01a/01b、04a/04b、05a/05b | TEST-015/020/022/023，人工 5/6 | 已覆盖 |
| EX-04 | TASK-03a/03b | TEST-018/019，派发计数与未知提示，人工 3 | 已覆盖 |

## 7 回滚与暂停条件

### 回滚

- 所有验证先用隔离内存库与假模型。P3 没有产品改动；P4 只回撤本人白名单改动，不用 git reset --hard，不批量删除文件。
- schema 采用 nullable 扩展，历史行不回填；迁移反向验证仅限无本轮用户数据的隔离测试库。有新原图、候选或已采用引用后，不执行生产 down/drop。
- 出现新逻辑问题先关闭 QWEN_IMAGE_ENABLED，只停新的整理；保留原图、候选、任务状态和已采用展示的读取能力，不回退到会公开私有文件的旧读取代码。
- 已派发任务不可通过“回滚”假定没有费用；保留 dispatched/uncertain 记录，不重投、不删除证据。恢复原展示只能引用仍保留的旧图，不能覆盖原图字节。
- 备份/复制问题保持源只读并停止目标写入；不清空真人衣橱，不用批量清理替代修正。

### 暂停条件

- 需要白名单外文件、改变五类文本/模型参数、增加默认收费次数或新的用户交互时，回 P3/P2重新确认。
- 发现跨主人读写、令牌/Key/图片数据进入日志、私有文件能经公开 URL 或 S3 裸读时立即停付费联调与发布。
- 同步供应商没有完整响应却要求自动重投或承诺必定找回结果时，停止；先确认真实恢复能力，不能把 request_id 猜成任务号。
- 数据库领取条件不能防双请求/双 Worker、采用会改标签或删除旧图、晚到响应可覆盖其他 attempt 时，不进入下一实现卡。
- 新旧备份/复制有丢原图、共享源引用或自动派发时停止；不能通过削弱已有断言达成绿灯。
- P4 前用户尚未确认 TASKS 或分支策略时不施工；真实 API、提交、部署和体验版发布均保留各自授权门。
