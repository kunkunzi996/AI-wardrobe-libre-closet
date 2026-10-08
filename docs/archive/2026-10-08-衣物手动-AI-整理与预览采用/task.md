# 衣物手动 AI 整理与预览采用 TASKS

- 上游：docs/plan.md（用户认可并决定进入 TASKS 后方可施工）
- 功能点：5/10；每个功能点一张准备 TEST 卡和一张实现卡。
- 执行顺序：01a → 01b → 02a → 02b → 03a → 03b → 04a → 04b → 05a → 05b。
- 本轮不并行施工：共享图片、详情、集成夹具和证据文件。编号顺序不是依赖依据，下方逐卡说明真正的前置条件。
- 第一次开工在 docs/test.md 锁定施工固定点；开始先确认是否创建独立功能分支。不默认提交、部署或执行收费模型。
- 所有卡可更新自身状态、实际改动与 TEST 指针；TEST 完整命令、哈希、红绿记录只存在 docs/test.md。a 卡可增量扩展共享启动夹具，但不能删弱已有断言；影响既有定义须更新对应资产版本/哈希，语义改变先回 P3。
- 当前收口：P4 施工完成；既有 P5 CLOSURE-1 双轴 PASS、STD-B01/STD-B02 均 CLOSED。用户于 2026-10-08 原话“确认”，按现有证据范围关闭整轮 P6，并保留受控异常、未验项及原 SPEC GAP。下方各卡保留其执行时点记录，不改历史红绿或未执行说明；最新结论见同目录 test.md#P6-CURRENT-CLOSED-20261008，文内 docs/ 路径为施工时原位置。未提交、推送、合入或正式发布。

## TASK-01a · 准备 TEST：新衣物保留原图且私有图片不可越权读取

### 任务定义

- 状态：red
- 来源：MVP-01、AC-01、EX-01、EX-03、HC-02、HC-07。
- 契约影响面：CC-01，兼顾 CC-06 的既有小程序守卫。
- 阻塞依赖（Depends On）：无；仅在用户认可 TASKS 和分支策略后开工。
- 可并行（Parallel With）：无。
- Consumes：现有新增 Controller/GarmentService/FileService、主人隔离、内存迁移先例和 PLAN 双图/私有合同。
- Produces：TEST-015 原图与权限红证据；TEST-014 既有小程序结构基线；供 01b 使用的不可变复跑凭证。
- Test Seam：真实新增/受保护图片入口 → 业务服务 → 内存 SQLite；外部抠图/存储可替换，真实 JWT 测试主人。
- TEST Asset ID：TEST-014、TEST-015。
- 来源类型：TEST-014 reuse；TEST-015 new。
- TEST 记录：docs/test.md#TEST-014、docs/test.md#TEST-015。
- 历史来源：014 为当前脚本首次登记；015 无匹配，检索证据见 PLAN。
- 边界约束：调用公开上传与读图路径；不能伪造原图关系或只检查 Controller 转发就算隔离。
- 跨模块检查：一张流经 FileService 后原字节保留、抠图一次、生成零次；另一个主人和公开 file/nobg/watermark 路径不能读新私有图。
- 允许改：src/wardrobe/garment-image-normalization.integration.spec.ts、src/dal/migrations/garment-image-normalization.migration.spec.ts、src/file/file-service.abstract.spec.ts、src/file/local-file/local-file.service.spec.ts、src/file/s3-file/s3-file.service.spec.ts、src/file/controller/file.controller.spec.ts、src/wardrobe/garment.service.spec.ts、src/wardrobe/miniapp-wardrobe.controller.spec.ts；docs/test.md 对应资产、docs/task.md 本卡记录。
- 禁止碰：所有实现文件；scripts/validate-miniapp-shell.cjs 的原有守卫不得放宽。
- 验收：014 来源一致并实际 reused-green；015 缺新原图/私有合同导致正确 red，不能把依赖、语法或导入损坏当产品红证据。
- 回滚：只撤回本人测试改动，保留日志，不删除目录。

### 施工后填写

- TEST 记录：docs/test.md#TEST-014-P4-01a（reused-green）、docs/test.md#TEST-015-P4-01a（本卡权威结果 red）；均已从记录读取命令原样复跑。
- 实际改动：新建真实 HTTP/内存 ORM/JWT 集成及数据库迁移两个测试载体，扩展本卡白名单内其余六份单测，共 37 个新用例；既有小程序守卫原样复用。定义哈希与完整命令已锁定；未修改产品实现、PLAN/SPEC 或其它卡定义。
- 未完成项：原图保存及私有图片保护仍未实现，留给 TASK-01b；本卡无流程阻塞。按单卡流程停在 red，不自动施工、不调用收费模型、不提交或部署；P5/P6 尚未执行。

## TASK-01b · 写实现：新衣物原图可核对，默认图沿用一次抠图

### 任务定义

- 状态：green
- 来源：MVP-01、AC-01、EX-01、EX-03、HC-02、HC-07。
- 契约影响面：CC-01、CC-06；包含公共读取绕路，不只增加私有入口。
- 阻塞依赖（Depends On）：TASK-01a=red；其行为守卫 TEST-015 必须红，TEST-014 reused-green 仅作保持行为的回归守卫。
- 可并行（Parallel With）：无。
- Consumes：TEST-015 定义/命令/红证据、TEST-014 结构守卫；现有 storeImageFromFileUpload、主人查询。
- Produces：Garment.originalPhoto；storeGarmentPhotosFromFileUpload → {originalPhoto,photo}；受保护 original/display 角色读取及 ?v=<File.id> 版本校验；新 schema 及新衣物原图查看。
- 边界约束：只由 GarmentService 持有图片关系，FileService 保存字节；新照片 Controller 只做鉴权参数和转发。私有命名不代替主人校验。
- 跨模块检查：重进详情能看原图；双主人及公共路径读取被拒；旧无原图衣物仍展示；原抠图降级不变。
- 允许改：src/dal/entity/garment.entity.ts、src/dal/entity/garment-image-normalization.entity.ts、src/dal/migrations/sqlite/Migration20261006000100.ts、src/dal/migrations/postgres/Migration20261006000100.ts、src/file/file-service.interface.ts、src/file/file-service.abstract.ts、src/file/local-file/local-file.service.ts、src/file/s3-file/s3-file.service.ts、src/file/controller/file.controller.ts、src/wardrobe/dto/create-garment.dto.ts、src/wardrobe/dto/garment-image-normalization.dto.ts、src/wardrobe/garment.service.ts、src/wardrobe/miniapp-garment-image.controller.ts、src/wardrobe/wardrobe.module.ts、src/wardrobe/miniapp-wardrobe.controller.ts、miniprogram/utils/api.js、miniprogram/utils/image-source.js、miniprogram/pages/garment-detail/index.js、miniprogram/pages/garment-detail/index.wxml；docs/task.md 本卡、docs/test.md 执行记录。
- 禁止碰：测试定义与断言；模型调用、推荐规则、历史回填和生产数据。
- 自测：原样执行 TEST-014/015 及 TEST 中当前整体回归命令；新增 schema 在内存库验证，不运行生产迁移。
- 人工验收：获准沙盒新增 → 保存 → 查看默认图/原图 → 退出重进仍可核对；当前没有自动整理。
- 回滚：关闭新增整理入口前置配置，保留已存原图；只在无用户数据的测试库验证迁移 down，不删用户图片。

### 施工后填写

- 实际改动：只修改本卡 19 个实现白名单文件。相机上传由服务端固定来源，上传流读取一次，原字节先存私有 File，默认 photo 继续只走一次既有抠图；历史衣物不回填原图。新增原图关系、当前整理记录实体及 SQLite/PostgreSQL 迁移，未派发生成任务。original/display 路由核对登录、衣物主人及 File.id 版本，公开 file/nobg/watermark 拒绝私有名和路径绕路；Local/S3 都保留原字节。小程序详情新增查看原图入口，带鉴权下载成临时图片，再预览；页面退出忽略迟到结果。当前 URL 映射只覆盖本卡的衣橱入口，全部消费者统一映射留给 TASK-04b。
- TEST 记录：docs/test.md#TEST-014-P4-01b、docs/test.md#TEST-015-P4-01b；原样定向 37 项及整体 277 项通过，结构/编译通过；8 个 TEST-015 载体与 TEST-014 脚本哈希未变，未修改 TEST 定义。
- 未完成项：本卡自动化无阻塞。沙盒新建/重进、微信手机及真实 S3 桶策略待人工验收；PostgreSQL 本卡只有 SQL 合同验证，没有真实连接或生产迁移。AI 生成、候选预览/采用、全入口解析、复制及备份尚在后续卡；下一张 TASK-02a 保持 pending。按 kun-code 单卡流程停止，不自动继续、不调用收费模型、不提交或部署；P5/P6 未执行。

## TASK-02a · 准备 TEST：五类固定提示词手动生成并先预览

### 任务定义

- 状态：red
- 来源：MVP-02、MVP-03、AC-02、AC-03、HC-01、HC-03、HC-04、HC-05。
- 契约影响面：CC-02。
- 阻塞依赖（Depends On）：TASK-01b=green；真实新衣物及受保护图片合同是生成输入和预览载体。
- 可并行（Parallel With）：无。
- Consumes：{originalPhoto,photo}、正常确认后的分类资料、五类文字与哈希、选定模型参数。
- Produces：TEST-016 模型/路由红证据；TEST-017 手动预览 Page 事件红证据；公开 NormalizationView 的验证合同。
- Test Seam：真实整理入口/路由 + AI 注入 fetch；VM Page 事件及 wx 请求观测。
- TEST Asset ID：TEST-016、TEST-017。
- 来源类型：new。
- TEST 记录：docs/test.md#TEST-016、docs/test.md#TEST-017。
- 历史来源：无；当前 Vision/复制静态测试不覆盖生成与预览，见 PLAN。
- 边界约束：不依赖 AI 私有方法；不给调用方开放自由 prompt；前端假后端不能冒充后端分类集成验证。
- 跨模块检查：五类走一套冻结提示词，bottoms 分裙裤，未知/冲突不调用模型；save 零生成，ready 不改 photo。
- 允许改：src/ai/garment-image.service.spec.ts、src/wardrobe/garment-image-normalization.integration.spec.ts、scripts/validate-garment-image-normalization.cjs；docs/test.md 对应资产、docs/task.md 本卡记录。
- 禁止碰：实现文件、已完成原图/权限保护断言。
- 验收：016/017 均为新增缺失行为引起的 red，完整命令与定义哈希落账。
- 回滚：撤回本人新增测试，不删除已有守卫或实验材料。

### 施工后填写

- TEST 记录：docs/test.md#TEST-016-P4-02a、docs/test.md#TEST-017-P4-02a；两项均从资产记录原样复跑为 red。
- 实际改动：只改本卡三份测试载体及台账，32 项后端/协议、4 项页面事件测试已冻结。共享集成只增量补假端口，原图/权限 37 项原样仍绿，载体变化登记 TEST-015 版本 2；没有修改产品代码或兄弟卡定义。
- 未完成项：无流程阻塞；缺失的生成/状态/预览由 TASK-02b 实现。按用户本轮连续执行授权进入下一卡，但每卡仍独立锁测试、核对范围和落账；不提交、部署或收费。

## TASK-02b · 写实现：手动生成一张候选图并预览，暂不替换

### 任务定义

- 状态：green
- 来源：MVP-02、MVP-03、AC-02、AC-03、HC-01、HC-03、HC-04、HC-05。
- 契约影响面：CC-02、CC-06；模型配置、公开说明和页面出口一起接通。
- 阻塞依赖（Depends On）：TASK-02a=red、TASK-01b=green；依赖固定输入、私有存储及本轮红证据。
- 可并行（Parallel With）：无。
- Consumes：TEST-016/017 定义与红证据；GarmentService.findOne/readOwnedPhoto；storePrivateImageBuffer。
- Produces：start/get → NormalizationView；GarmentImageService.generate → GeneratedImageResult；一份 queued/processing/ready 记录；candidatePhoto 与手动预览。
- 边界约束：分类在 wardrobe，固定文本和协议在 AI，字节在 file；照片 Controller 不查内部任务库。先持久化、条件领取后一次派发，默认配置关闭真实生成。
- 跨模块检查：真实开始到模型端口再到私有候选及 GET；当前展示关系不变；页面保存、预览不直接请求模型。
- 允许改：src/wardrobe/garment-image-category.ts、src/wardrobe/garment-image-normalization.service.ts、src/wardrobe/garment-image-normalization.worker.ts、src/wardrobe/miniapp-garment-image.controller.ts、src/wardrobe/dto/garment-image-normalization.dto.ts、src/wardrobe/wardrobe.module.ts、src/ai/garment-image-prompts.ts、src/ai/garment-image.service.ts、src/ai/ai.module.ts、src/app.module.ts、miniprogram/utils/api.js、miniprogram/utils/image-source.js、miniprogram/pages/garment-detail/image-normalization.js、miniprogram/pages/garment-detail/index.js、miniprogram/pages/garment-detail/index.wxml、miniprogram/pages/garment-detail/index.wxss、README.md、docs/backend-architecture-source-of-truth.md、PROJECT_STATE.md；docs/task.md 本卡、docs/test.md 执行记录。
- 禁止碰：TEST 定义、识别/推荐规则、自由提示词、多图生成和收费重试。
- 自测：原样 TEST-016/017，加 TEST-014/015 与整体回归；不打开真实 QWEN_IMAGE_ENABLED。
- 人工验收：假模型环境打开五类衣物详情 → AI 整理 → 当前图/候选/原图可比较；不采用，衣橱不变。
- 回滚：停新派发，保留已落盘候选与原图；不能用重新生成补丢失。

### 施工后填写

- 实际改动：仅本卡白名单内接通分类纯函数、五段原样提示词、AI 请求/下载边界、任务 Owner 与独立 Worker、受保护候选/状态路由、小程序窄辅助文件及对比预览；补默认关闭配置与三份公开说明。ready 只保存候选、不改 photo，未实现采用；未改识别/推荐规则。
- TEST 记录：docs/test.md#TEST-016-P4-02b、docs/test.md#TEST-017-P4-02b；32+4 项原样绿，014/015 保持绿，44 套/309 项完整回归与结构/编译退出 0；冻结断言、定义和命令未变。
- 未完成项：本卡无自动化阻塞；退出/重启与未知恢复由 TASK-03a/03b 完成，采用及备份复制仍待后续卡。手机/真实桶/真实模型仍待人工验收，P5/P6 未执行。依连续授权进入 TASK-03a，不提交、部署或收费。

## TASK-03a · 准备 TEST：重进、重启、超时与连点不重复收费生成

### 任务定义

- 状态：red
- 来源：MVP-05、AC-03、AC-05、EX-04、HC-05、HC-08。
- 契约影响面：CC-03。
- 阻塞依赖（Depends On）：TASK-02b=green；start/get 与持久记录已经可运行，才能验证真实竞争和恢复。
- 可并行（Parallel With）：无。
- Consumes：NormalizationView、attemptKey、queued/processing/uncertain/ready/failed 合同及一次派发基础。
- Produces：TEST-018 后端竞争/重启/下载与未知红证据；TEST-019 前端退出、超时查询和身份缓存红证据。
- Test Seam：双 Service/Worker 共用真实内存 SQLite；受控 fetch Promise；Page 生命周期与 wx.downloadFile。
- TEST Asset ID：TEST-018、TEST-019。
- 来源类型：new。
- TEST 记录：docs/test.md#TEST-018、docs/test.md#TEST-019。
- 历史来源：无；历史仅有进程内批处理锁，不覆盖付费派发恢复。
- 边界约束：不得直接把任务状态改成期望值来声称恢复通过；通过公开方法或重建服务模拟进程。
- 跨模块检查：并发开始/双 Worker 只有一个模型 POST；客户端超时不重发；后端已派发重启为未知；已拿到 URL 只恢复下载；旧 attempt 的晚到响应不覆盖新次结果。
- 允许改：src/wardrobe/garment-image-normalization.integration.spec.ts、scripts/validate-garment-image-normalization.cjs；docs/test.md 对应资产、docs/task.md 本卡记录。
- 禁止碰：实现代码与原已通过的断言；不能靠人工删锁或假红灯。
- 验收：新增重启/超时恢复等未实现行为产生正确 red；若基础竞争已绿则如实记录，不能强造它的红灯。
- 回滚：撤回本卡新测试，保留原定义与记录。

### 施工后填写

- TEST 记录：docs/test.md#TEST-018-P4-03a、docs/test.md#TEST-019-P4-03a；从资产记录读取命令原样复跑，均为正确行为 red。
- 实际改动：只增量扩展两份测试载体与台账。后端 7 项覆盖真实 SQLite 双 Worker、重建、派发中断、同图下载、新手动失败重试、晚到及删除；前端 5 项覆盖超时先查、生命周期、身份缓存与局部图片错误。原有断言不变，共享字节变化更新 TEST-015/016/017 版本与哈希；37+32+4 旧守卫仍绿。
- 未完成项：恢复及失败后新尝试由 TASK-03b 实现；首轮挂起 Promise 的夹具等待方式已修正，不把测试自身超时记为产品红。按连续授权进入下一卡，不提交、不收费。

## TASK-03b · 写实现：退出后继续原次整理，未知结果不重投

### 任务定义

- 状态：green
- 来源：MVP-05、AC-03、AC-05、EX-04、HC-05、HC-08。
- 契约影响面：CC-03、CC-06。
- 阻塞依赖（Depends On）：TASK-03a=red、TASK-02b=green；消费实际 start/get/Worker 和真实恢复红证据。
- 可并行（Parallel With）：无。
- Consumes：TEST-018/019；NormalizationView、GeneratedImageResult、storePrivateImageBuffer；数据状态及条件更新。
- Produces：原次查询恢复、queued 安全领取、processing 重启保守未知、同图下载恢复、晚到结果归属；canStart/canAdopt 与页面提示正确。
- 边界约束：Worker 生命周期独立于小程序；派发前落盘，不能回退为 queued 再发；GET 不生成。resultUrl 只后端用，不暴露，不把 request_id 虚构为供应商任务查询入口。
- 跨模块检查：跨客户端断网/服务重建计数仍不增加；候选落盘前不 ready；未知不清空当前照片，真实明确 failed 后仅新手动 attempt 可开始。
- 允许改：src/wardrobe/garment-image-normalization.service.ts、src/wardrobe/garment-image-normalization.worker.ts、src/wardrobe/miniapp-garment-image.controller.ts、src/wardrobe/dto/garment-image-normalization.dto.ts、src/ai/garment-image.service.ts、miniprogram/utils/api.js、miniprogram/utils/image-source.js、miniprogram/pages/garment-detail/image-normalization.js、miniprogram/pages/garment-detail/index.js、miniprogram/pages/garment-detail/index.wxml、README.md、docs/backend-architecture-source-of-truth.md、PROJECT_STATE.md；docs/task.md 本卡、docs/test.md 执行记录。
- 禁止碰：TEST 定义、自动模型重试、生产进程重启、虚称未扣费。
- 自测：原样 TEST-018/019、014～017 和整体回归，所有超时/晚到用假模型。
- 人工验收：假模型整理中 → 连点/退出/关闭/返回 → 同一状态或结果；超时看“结果待确认”，重新查看不出现第二次生成。
- 回滚：先关新派发，保留处理中或未知记录；不得清掉状态让用户再付费。

### 施工后填写

- 实际改动：只改本卡实现白名单与台账。Owner 条件领取下载、重启派发转未知、失败后递增 key 的手动 retry；Worker 不阻塞服务监听、只恢复原 URL 下载，所有回写匹配记录/attempt。详情辅助文件管轮询，隐藏/退出作废晚到结果，返回查询原次，开始超时 GET 而不再 POST；服务文档同步。
- TEST 记录：docs/test.md#TEST-018-P4-03b、docs/test.md#TEST-019-P4-03b；原样 7+5 项与 014～017 均绿，44 套/316 项完整回归、结构和编译通过，冻结定义/命令/载体一致。
- 未完成项：本卡无自动化阻塞；明确采用与全部出口一致留给 TASK-04a/04b，备份复制待 TASK-05；手机/真实桶/收费联调及 P5/P6 未执行。按连续授权进入 04a，不提交、部署或收费。

## TASK-04a · 准备 TEST：确认采用才换图，所有当前展示入口一致

### 任务定义

- 状态：red
- 来源：MVP-04、AC-04、EX-01、EX-02、EX-03、HC-01、HC-05、HC-06。
- 契约影响面：CC-04。
- 阻塞依赖（Depends On）：TASK-03b=green；有可恢复、主人隔离且一次生成的 ready 候选。
- 可并行（Parallel With）：无。
- Consumes：ready/candidatePhoto、attemptKey、现有 garment.photo；所有当前图片消费者清单。
- Produces：TEST-020 采用与多入口集成红证据；TEST-021 Page 明确采用、重复采用和图片缓存红证据。
- Test Seam：真实 adopt 后再读列表/详情/重复候选/推荐/今日穿搭；VM Page 事件与 API 响应图片解析。
- TEST Asset ID：TEST-020、TEST-021。
- 来源类型：new。
- TEST 记录：docs/test.md#TEST-020、docs/test.md#TEST-021。
- 历史来源：无；历史状态删除资产不是采用图片合同。
- 边界约束：不得只断言数据库字段；要经过所有 CC-04 当前公开出口。推荐数据可控，但生成/筛选规则不改。
- 跨模块检查：采用只改 photo，原图/旧图/资料完整；失败不丢旧图；他人/旧 attempt/随意 File ID 拒绝；所有新图 URL 带鉴权解析及 File.id 版本，采用后的新 URL 不命中旧缓存，陈旧版本拒绝，旧公开图仍兼容。
- 允许改：src/wardrobe/garment-image-normalization.integration.spec.ts、src/wardrobe/garment.service.spec.ts、src/wardrobe/miniapp-outfit.controller.spec.ts、src/wardrobe/miniapp-daily-outfit.controller.spec.ts、src/wardrobe/miniapp-wardrobe.controller.spec.ts、scripts/validate-garment-image-normalization.cjs；docs/test.md 对应资产、docs/task.md 本卡记录。
- 禁止碰：实现、推荐规则和其他资产保护意图。
- 验收：020/021 因未支持明确采用/多入口新图而 red；定义、完整命令、哈希可复跑。
- 回滚：撤回本人新测试；不删已有输出合同断言。

### 施工后填写

- TEST 记录：docs/test.md#TEST-020-P4-04a、docs/test.md#TEST-021-P4-04a；从记录原样复跑均正确 red。
- 实际改动：只扩展本卡四份后端测试载体、一个页面脚本与台账。14 项后端覆盖采用/权限/冲突/写失败/版本及各公开出口；5 项事件覆盖明确采用、失败、嵌套 API 图片与既有推荐照片刷新。既有断言不删弱，受共享字节影响的资产版本/哈希已维护；014～019 的既有行为不变。
- 未完成项：采用入口、推荐/今日图映射及小程序统一解析尚缺，由 04b 实现。继续按顺序施工，不提交或收费。

## TASK-04b · 写实现：采用只切换展示图片，不改真实衣物资料

### 任务定义

- 状态：green
- 来源：MVP-04、AC-04、EX-01、EX-02、EX-03、HC-01、HC-05、HC-06。
- 契约影响面：CC-04、CC-06；含所有当前 JSON 生产者与已有推荐页面缓存。
- 阻塞依赖（Depends On）：TASK-04a=red、TASK-03b=green；消费有效当前候选和采用红证据。
- 可并行（Parallel With）：无。
- Consumes：TEST-020/021；NormalizationView、ready 候选；GarmentService 当前照片关系。
- Produces：adoptNormalizedPhoto 的条件 photo 更新、adopt → {item:衣物}；garmentPhotoUrl(garmentId,file:{id,fileName},origin) 的唯一版本化映射；adopted 派生值及当前卡片刷新。
- 边界约束：整理服务不直接写 garment.photo；不存第二份 adopted 状态；不调用 deleteOldPhoto/上传处理；与资料编辑、所有权、推荐选择隔离。
- 跨模块检查：采用后所有 CC-04 生产者指向同一带新 File.id 版本的展示图 URL，不能命中旧版本缓存；UI 私有图经过统一认证下载；回到现有推荐只更新照片，不重新生成推荐。
- 允许改：src/wardrobe/garment.service.ts、src/wardrobe/garment-image-normalization.service.ts、src/wardrobe/miniapp-garment-image.controller.ts、src/wardrobe/view-models/garment-photo.view-model.ts、src/wardrobe/miniapp-wardrobe.controller.ts、src/wardrobe/miniapp-outfit.controller.ts、src/wardrobe/miniapp-daily-outfit.controller.ts、miniprogram/utils/api.js、miniprogram/utils/image-source.js、miniprogram/pages/garment-detail/image-normalization.js、miniprogram/pages/garment-detail/index.js、miniprogram/pages/garment-detail/index.wxml、miniprogram/pages/garment-detail/index.wxss、miniprogram/pages/outfit/index.js、README.md、docs/backend-architecture-source-of-truth.md、PROJECT_STATE.md；docs/task.md 本卡、docs/test.md 执行记录。
- 禁止碰：测试定义、推荐/识图规则、原图覆盖、物理旧图删除、网页新增入口。
- 自测：原样 TEST-020/021 加前序资产与整体回归；采用/查看模型派发计数必须零增加。
- 人工验收：沙盒候选 → 暂不采用保持旧图 → 明确采用 → 衣橱、详情、现有推荐、今日穿搭同图；原图和标签仍在。
- 回滚：停新采用但保留私有图读取与全部照片；需要切回旧图时使用留存引用，不覆盖原图。

### 施工后填写

- 实际改动：只改本卡实现白名单和台账。衣物 Owner 提供主人/文件/当前图条件采用，整理 Owner 验证当前 ready/attempt 并委托；无旧图删除或模型请求。共享 ViewModel 映射所有当前图出口，衣橱与采用响应共用快照；小程序 API 统一认证解析及版本/身份隔离，详情明确采用/局部失败，现有推荐返回仅刷新照片。
- TEST 记录：docs/test.md#TEST-020-P4-04b、docs/test.md#TEST-021-P4-04b；14+5 项原样绿，前序资产均绿，44 套/330 项整体回归、结构/编译通过；冻结定义/命令/哈希一致。
- 未完成项：本卡无自动化阻塞；05a/05b 备份复制保图待实现；手机/真实桶及 P5/P6 未执行。依连续授权进入下一卡，不提交或部署。

## TASK-05a · 准备 TEST：备份与沙盒复制不丢新图片、不重放收费任务

### 任务定义

- 状态：red
- 来源：MVP-01、MVP-04、EX-03、HC-02、HC-05、HC-06、HC-07。
- 契约影响面：CC-05。
- 阻塞依赖（Depends On）：TASK-04b=green；源衣物已能包含原图、候选、已采用图、独立固定输入图及可恢复任务状态。
- 可并行（Parallel With）：无。
- Consumes：完整新图衣物、现有版本 1/2 备份与沙盒复制权限、原图/任务 Owner 公开快照。
- Produces：TEST-022/023 从明确历史资产派生的红证据；版本 3 和独立目标引用合同。
- Test Seam：现有 exportBackup/importBackup 与 WardrobeCopyService.copy 的公开路径。
- TEST Asset ID：TEST-022、TEST-023。
- 来源类型：adapt。
- TEST 记录：docs/test.md#TEST-022、docs/test.md#TEST-023。
- 历史来源：docs/archive/2026-08-22-废除衣物库存状态/test.md#TEST-004；docs/archive/2026-08-20-衣橱复制到验收沙盒/test.md#TEST-002。历史 ID 以路径消歧，冻结文件不改。
- 边界约束：保留现有备份和复制所有资料/计数/源不变/沙盒白名单保护；不能为了新图删除旧用例或放宽断言。
- 跨模块检查：图像经 Transfer/FileService 进入目标 Owner；旧包没有原图；新包原图字节保持；source/candidate 的字节与引用均映射，采用后独立的 sourcePhoto 不丢失；queued/processing 不变成自动可运行作业。
- 允许改：src/wardrobe/miniapp-wardrobe.controller.spec.ts、src/wardrobe/wardrobe-copy.service.spec.ts、src/file/local-file/local-file.service.spec.ts、src/file/s3-file/s3-file.service.spec.ts；docs/test.md 对应资产、docs/task.md 本卡记录。
- 禁止碰：冻结归档、实现代码、管理员白名单断言、源数据不变断言。
- 验收：022/023 因缺新图片映射与安全恢复而 red，不依赖真实模型；保留历史保护意图并记录新 Derived From。
- 回滚：撤回本卡新增测试，不修改历史证据。

### 施工后填写

- TEST 记录：docs/test.md#TEST-022-P4-05a、docs/test.md#TEST-023-P4-05a；原样复跑正确 red，历史 2 项 backup 与 3 项 copy 均保持绿。
- 实际改动：只改四份授权测试载体与台账。11 项备份新用例经真实 SQLite/Owner 检查 ready 未采用/已采用、独立输入图、静态未知、四类缺引用、版本 1/2 与零抠图；5 项复制新用例检查目标主人独立读图、源只读、未知不重放及 Local/S3 私有标记/原字节/MIME。共享维护 TEST-015 版本 5、020 版本 2，既有断言不删弱。
- 未完成项：05b 实现图片引用映射、静态快照与私有复制；首轮 null 判定改为明确非空守卫，冻结前已原样确认行为红。继续顺序施工，不提交、部署或收费。

## TASK-05b · 写实现：新旧备份可用，复制的照片与源独立

### 任务定义

- 状态：green
- 来源：MVP-01、MVP-04、EX-03、HC-02、HC-05、HC-06、HC-07。
- 契约影响面：CC-05、CC-06；完整当前备份/复制说明与代码闭环。
- 阻塞依赖（Depends On）：TASK-05a=red、TASK-04b=green；使用已稳定的图片与任务公开合同。
- 可并行（Parallel With）：无。
- Consumes：TEST-022/023；GarmentService 的受主隔离引用导入、整理服务 exportSnapshot/restoreSnapshot、FileService.copyStoredFile。
- Produces：Transfer 的 exportImages/importImages/copyImages；版本 1/2 兼容、版本 3 原图/展示/候选/固定输入图 sourcePhoto 保留并按 File 去重映射；目标主人自己的文件与本地状态；源完全只读。
- 边界约束：Transfer 只通过 Owner 操作，不直接访问内部仓库；不复用源 File ID/供应商请求信息，不重放 queued/processing，不抠图或生成已处理图片。
- 跨模块检查：新包循环恢复可查原图/选用图，候选和固定输入图字节与引用完整；旧包 originalPhoto=null；复制目标私有标记保留且独立；已有未标沙盒拒绝、计数和全量资料验证继续成立。
- 允许改：src/wardrobe/garment-image-transfer.service.ts、src/wardrobe/dto/create-garment.dto.ts、src/wardrobe/garment.service.ts、src/wardrobe/garment-image-normalization.service.ts、src/wardrobe/miniapp-wardrobe.controller.ts、src/wardrobe/wardrobe-copy.service.ts、src/wardrobe/wardrobe.module.ts、src/file/file-service.interface.ts、src/file/file-service.abstract.ts、src/file/local-file/local-file.service.ts、src/file/s3-file/s3-file.service.ts、README.md、docs/backend-architecture-source-of-truth.md、PROJECT_STATE.md；docs/task.md 本卡、docs/test.md 执行记录。
- 禁止碰：TEST 定义、复制权限策略、真人衣橱、批量清理、生产发布或历史状态功能。
- 自测：原样 TEST-022/023，manifest 全部资产、整体 Jest、小程序静态检查及无产物 tsc；不能把本卡绿灯写成 P5/P6 已通过。
- 人工验收：获准沙盒导出/导入并复制图像副本 → 核对图片与资料 → 源未变、目标独立、无自动生成；收费联调仍另行批准。
- 回滚：停止目标导入/复制，源只读；保留目标已落盘图片和恢复证据，不清空真实衣橱。

### 施工后填写

- 实际改动：只改本卡实现白名单与台账。新增窄 Transfer，通过衣物/整理 Owner 与文件公开端口导出、导入及复制四类图片，版本 3 去重保图、版本 1/2 保持无原图为空；整包缺引用先拒绝，目标文件及本地任务 key 独立，源只读。处理中快照保守未知，不带供应商请求/URL、不派发、零抠图/生成。Local/S3 私有复制保留原字节/MIME/主人；普通换图保留可能仍被整理引用的旧字节，历史公开无原图行为不变。README、架构真源及项目状态已闭环。
- TEST 记录：docs/test.md#TEST-022-P4-05b、docs/test.md#TEST-023-P4-05b；原样 13 项备份、8 项复制全绿，十组 manifest 命令及最终 44 套/346 项完整回归、14 项页面事件、结构和编译全部通过；冻结定义/命令/载体、分支固定点及 diff --check 一致。
- 未完成项：本卡及 P4 无剩余施工任务，无自动化阻塞。正式 P5 整体评审、P6 手机/真实桶/沙盒操作待授权验收，不能以本卡回归替代；未提交、部署、操作真人衣橱或收费。后续验收通过后提醒以完整功能提交，Commit Message 使用中文。

## P4 定向返修 · STD-B01 / STD-B02（2026-10-07）

- 授权：用户要求先确认真 Bug，再按第一性原理返回修复。沿用 feature/garment-image-normalization，不新增分支，不提交、不推送、不部署、不进入 P6。
- 状态：实现及验证完成，等待 P5 CLOSURE；不是评审关闭或人工验收通过。
- 根因与最小修复：STD-B01 将页面恢复条件从首次请求成功改为真实隐藏/返回生命周期，保留旧响应失效且不重复初次读取；STD-B02 启动恢复/已有结果下载始终可用，生成配置仅在领取新 queued 时生效，不重发 POST。
- 实际变更范围：miniprogram/pages/garment-detail/index.js、src/wardrobe/garment-image-normalization.worker.ts；两个现有测试载体及 TASK/TEST 台账。未改变 SPEC/PLAN、接口、数据结构、提示词、模型、私有读图、采用、备份或推荐业务。
- TEST：现有 TEST-018/019 各增 3 场景；改用真实生产启动钩子，原断言不删弱。实际红绿、共享载体版本/哈希、全量 manifest、44 套/349 项及17页面事件、编译和名称级对照统一见 docs/test.md#P4-RETURN-20261007 与 #P5-CURRENT-P4-RETURN-20261007。
- 冻结集：STD-B01（同根 SPEC-B01）与 STD-B02（同根 SPEC-B02）仍 OPEN、未复核；未调用 kun-review/code-review，配额保持 2/2。返修起点完整 WORKTREE 快照及红绿证据路径见 TEST，不以当前 HEAD 代替快照。
- 下一步：只在用户授权后做 CLOSURE-1，按两项逐条定向复核，不重跑 INITIAL、不自动进入 P6；后续验收完成再提醒中文提交。

## P5 CLOSURE-1 已完成（2026-10-08 补登记既有报告）

- 已完成的 Standards / Spec 两独立实例原报告均 PASS，各自冻结项2/2、六处返修范围6/6；STD-B01（SPEC-B01）及STD-B02（SPEC-B02）均 CLOSED，无返修新增阻断，原剩余配额1/2。不是本次重开评审或主 Agent 补写审查。
- 上方“等待 CLOSURE / OPEN / 配额2/2”为当时返修施工记录，现已由最终报告关闭；具体来源、摘录和范围统一见 docs/test.md#P5-CLOSURE-1-RECOVERED-20261008。
- 下一步仅处理 P6 收口：手机补测已由用户确认；备份/复制完整真实验收凭据和原 SPEC GAP 的处理范围待用户决定。未提交、推送、正式上线或归档，后续完整功能提交使用中文说明。
