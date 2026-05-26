# Libre Closet AI Wardrobe Modification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Libre Closet into a Chinese AI wardrobe product that first completes the clothing-management loop, then adds rule-based recommendations, then connects image and text AI.

**Architecture:** Keep Libre Closet's existing NestJS + MikroORM + Handlebars + Tailwind PWA structure. Extend the existing wardrobe domain instead of rebuilding from scratch: garments remain the source data, outfits remain saved looks, calendar entries become the first version of "today's outfit records", and new AI modules call into those existing services.

**Tech Stack:** Node 22, NestJS 11, Fastify, MikroORM, SQLite/PostgreSQL migrations, Handlebars views, Tailwind/DaisyUI, Jest, Playwright, existing Libre Closet PWA.

---

## Scope Notes

This is a staged product modification plan, not a single giant feature. Each task must leave the app runnable and commit-worthy.

The first target is not "complete AI styling". The first target is:

```text
录入衣服 -> 找到衣服 -> 生成搭配 -> 记录今日穿搭 -> 用记录改进推荐
```

AGPL-3.0 notice: Libre Closet is AGPL-3.0. If this modified app is later made available over the network, keep license/source obligations visible before any public launch.

## Current Libre Closet Baseline

Important existing files:

- `package.json`: Node 22 app scripts, Jest, Playwright, build, precommit.
- `src/dal/entity/garment.entity.ts`: current clothing item data model.
- `src/dal/entity/outfit.entity.ts`: current saved outfit data model.
- `src/dal/entity/outfit-calendar.entity.ts`: current outfit schedule/worn record model.
- `src/wardrobe/garment.service.ts`: garment create/update/search/remove logic.
- `src/wardrobe/wardrobe.controller.ts`: garment pages and photo upload endpoints.
- `src/wardrobe/outfit.service.ts`: saved outfit creation and outfit builder row logic.
- `src/wardrobe/outfit.controller.ts`: outfit pages and scheduling flow.
- `src/wardrobe/calendar.service.ts`: weekly outfit schedule and worn toggle.
- `views/wardrobe/index.hbs`: wardrobe list, search, filter UI.
- `views/wardrobe/form.hbs`: garment create/edit form.
- `views/wardrobe/show.hbs`: garment detail page.
- `views/outfits/form.hbs`: outfit builder page.
- `views/outfits/show.hbs`: saved outfit detail page.
- `views/calendar/index.hbs`: schedule/worn tracking page.
- `src/i18n/en/lang.json`: current source language keys.

## Recommended Development Order

### Task 1: Baseline Startup and Safety Check

**Files:**
- Read: `README.md`
- Read: `package.json`
- Read: `.env`
- Modify only if needed: `.env.local`
- Test: existing Jest and build scripts

- [ ] **Step 1: Install dependencies**

Run:

```powershell
npm install
```

Expected:

```text
added ... packages
```

or:

```text
up to date
```

- [ ] **Step 2: Run unit tests before modification**

Run:

```powershell
npm test
```

Expected:

```text
Test Suites: ... passed
Tests: ... passed
```

- [ ] **Step 3: Run build before modification**

Run:

```powershell
npm run build
```

Expected:

```text
webpack ... compiled successfully
```

or Nest build output with no errors.

- [ ] **Step 4: Start local app**

Run:

```powershell
npm run start:dev
```

Expected:

```text
Nest application successfully started
```

Open:

```text
http://localhost:3000
```

Acceptance:

- Wardrobe page opens.
- New garment page opens.
- Outfit page opens.
- Calendar page opens.

- [ ] **Step 5: Commit baseline marker if local validation passes**

Run:

```powershell
git status --short
git add docs/superpowers/plans/2026-05-26-libre-closet-ai-wardrobe-plan.md
git commit -m "docs: add AI wardrobe modification plan"
```

Expected:

```text
[main ...] docs: add AI wardrobe modification plan
```

### Task 2: Chinese Product Shell and Navigation

**Files:**
- Modify: `src/i18n/en/lang.json`
- Create: `src/i18n/zh/lang.json`
- Modify: `src/app.module.ts`
- Modify: `views/partials/navbar.hbs`
- Modify: `views/partials/dock.hbs`
- Modify: `views/index.hbs`
- Test: `src/app.controller.spec.ts`
- Test: `test/smoke.spec.ts`

- [ ] **Step 1: Add Chinese language file**

Create `src/i18n/zh/lang.json` with product-facing Chinese copy for:

```json
{
  "APP_NAME": "AI穿搭衣橱",
  "WARDROBE": "我的衣柜",
  "NEW_GARMENT": "新增衣物",
  "OUTFITS": "穿搭方案",
  "CALENDAR": "今日穿搭",
  "SEARCH": "搜索",
  "FILTERS": "筛选",
  "SAVE": "保存",
  "CANCEL": "取消"
}
```

- [ ] **Step 2: Wire Chinese into i18n config**

In `src/app.module.ts`, confirm the i18n loader can read `src/i18n/zh/lang.json`. Keep English available so existing tests and fallback text do not break.

- [ ] **Step 3: Rename visible product entry points**

Update `views/partials/navbar.hbs`, `views/partials/dock.hbs`, and `views/index.hbs` so the first-screen navigation is:

```text
我的衣柜
拍照入库
AI搭配
今日穿搭
```

Acceptance:

- The app still opens at `http://localhost:3000`.
- Main navigation no longer feels like generic Libre Closet.
- Existing English fallback does not crash.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm test
npm run build
git status --short
git add src/i18n/zh/lang.json src/app.module.ts views/partials/navbar.hbs views/partials/dock.hbs views/index.hbs
git commit -m "feat: add Chinese AI wardrobe shell"
```

### Task 3: Extend Garment Data Model

**Files:**
- Modify: `src/dal/entity/garment.entity.ts`
- Modify: `src/wardrobe/dto/create-garment.dto.ts`
- Modify: `src/wardrobe/dto/update-garment.dto.ts`
- Modify: `src/wardrobe/dto/search-garment.dto.ts`
- Modify: `src/wardrobe/garment.service.ts`
- Create: `src/wardrobe/garment-status.enum.ts`
- Create: `src/dal/migrations/sqlite/Migration20260526000100.ts`
- Create: `src/dal/migrations/postgres/Migration20260526000100.ts`
- Test: `src/wardrobe/garment.service.spec.ts`

- [ ] **Step 1: Add garment status enum**

Create `src/wardrobe/garment-status.enum.ts`:

```ts
export enum GarmentStatus {
  Wearable = 'wearable',
  Laundry = 'laundry',
  Stored = 'stored',
  Damaged = 'damaged',
  Archived = 'archived',
}
```

- [ ] **Step 2: Extend `Garment` entity**

Add these fields to `src/dal/entity/garment.entity.ts`:

```ts
@Property({ nullable: true })
public subcategory?: string;

@Property({ type: 'json', nullable: true })
public seasons?: string[];

@Property({ type: 'json', nullable: true })
public styleTags?: string[];

@Property({ type: 'json', nullable: true })
public sceneTags?: string[];

@Property({ nullable: true })
public material?: string;

@Property({ nullable: true })
public thickness?: string;

@Property({ nullable: true })
public fit?: string;

@Property({ default: 'wearable' })
public status: string = 'wearable';

@Property({ nullable: true })
public price?: number;

@Property({ nullable: true })
public purchaseDate?: Date;

@Property({ nullable: true })
public purchaseChannel?: string;

@Property({ default: 0 })
public wearCount: number = 0;

@Property({ nullable: true })
public lastWornDate?: Date;
```

- [ ] **Step 3: Extend create/update/search DTOs**

Add matching optional fields in:

```text
src/wardrobe/dto/create-garment.dto.ts
src/wardrobe/dto/update-garment.dto.ts
src/wardrobe/dto/search-garment.dto.ts
```

Use `string[]` for tag fields and `string` for form-submitted raw values when needed.

- [ ] **Step 4: Add migrations**

SQLite migration must add nullable columns and default status:

```sql
alter table garment add column subcategory text null;
alter table garment add column seasons text null;
alter table garment add column style_tags text null;
alter table garment add column scene_tags text null;
alter table garment add column material text null;
alter table garment add column thickness text null;
alter table garment add column fit text null;
alter table garment add column status text not null default 'wearable';
alter table garment add column price real null;
alter table garment add column purchase_date datetime null;
alter table garment add column purchase_channel text null;
alter table garment add column wear_count integer not null default 0;
alter table garment add column last_worn_date datetime null;
```

Postgres migration must use equivalent column names and types:

```sql
alter table "garment" add column "subcategory" varchar(255) null;
alter table "garment" add column "seasons" jsonb null;
alter table "garment" add column "style_tags" jsonb null;
alter table "garment" add column "scene_tags" jsonb null;
alter table "garment" add column "material" varchar(255) null;
alter table "garment" add column "thickness" varchar(255) null;
alter table "garment" add column "fit" varchar(255) null;
alter table "garment" add column "status" varchar(255) not null default 'wearable';
alter table "garment" add column "price" numeric null;
alter table "garment" add column "purchase_date" timestamptz null;
alter table "garment" add column "purchase_channel" varchar(255) null;
alter table "garment" add column "wear_count" integer not null default 0;
alter table "garment" add column "last_worn_date" timestamptz null;
```

- [ ] **Step 5: Update service mapping**

In `src/wardrobe/garment.service.ts`, update `create()` and `update()` to persist the new fields. Convert comma-separated form text into arrays for `seasons`, `styleTags`, and `sceneTags`.

Acceptance:

- Creating a garment with new fields stores those values.
- Updating a garment preserves old values when fields are not submitted.
- Garments default to `status = wearable`.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm test
npm run build
git status --short
git add src/dal/entity/garment.entity.ts src/wardrobe src/dal/migrations
git commit -m "feat: extend garment wardrobe metadata"
```

### Task 4: Upgrade Garment Create/Edit/List UI

**Files:**
- Modify: `views/wardrobe/form.hbs`
- Modify: `views/wardrobe/index.hbs`
- Modify: `views/wardrobe/show.hbs`
- Modify: `src/wardrobe/wardrobe.controller.ts`
- Modify: `src/wardrobe/garment.service.ts`
- Test: `test/smoke.spec.ts`

- [ ] **Step 1: Expand create/edit form**

Add inputs for:

```text
二级品类
季节
风格标签
场景标签
材质
厚薄
版型
状态
价格
购买日期
购买渠道
```

Keep the form mobile-first and avoid making every field required.

- [ ] **Step 2: Expand list filter**

Add filter support in `views/wardrobe/index.hbs` and `SearchGarmentDto` for:

```text
status
season
style
scene
```

Acceptance:

- User can filter only "可穿" garments.
- User can search by name, notes, brand, style tag, scene tag.
- Existing category/color/size filters still work.

- [ ] **Step 3: Show metadata on detail page**

Update `views/wardrobe/show.hbs` to show:

```text
状态
季节
风格
场景
材质
厚薄
购买信息
穿着次数
最近穿着
```

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm test
npm run build
git status --short
git add views/wardrobe src/wardrobe
git commit -m "feat: improve wardrobe management screens"
```

### Task 5: Turn Calendar Into Today's Outfit Record

**Files:**
- Modify: `src/dal/entity/outfit-calendar.entity.ts`
- Modify: `src/wardrobe/calendar.service.ts`
- Modify: `src/wardrobe/calendar.controller.ts`
- Modify: `views/calendar/index.hbs`
- Create: `src/dal/migrations/sqlite/Migration20260526000200.ts`
- Create: `src/dal/migrations/postgres/Migration20260526000200.ts`
- Test: `src/wardrobe/calendar.service.spec.ts`

- [ ] **Step 1: Add outfit record fields**

Extend `OutfitCalendar` with:

```ts
@Property({ nullable: true })
public scene?: string;

@Property({ nullable: true })
public weather?: string;

@Property({ nullable: true })
public temperature?: string;

@Property({ nullable: true })
public rating?: number;

@Property({ nullable: true })
public feedback?: string;

@Property({ default: false })
public complimented: boolean = false;
```

- [ ] **Step 2: Update worn toggle behavior**

When an outfit is marked worn in `CalendarService.toggleWorn()`:

- Set `wornAt`.
- Increment each garment's `wearCount`.
- Set each garment's `lastWornDate`.

When unmarked:

- Clear `wornAt`.
- Do not decrement counts automatically in the first version, to avoid data surprises.

- [ ] **Step 3: Add record form fields**

Update `views/calendar/index.hbs` so today's outfit can include:

```text
场景
天气
温度
评分
反馈
是否被夸
备注
```

Acceptance:

- User can record what was actually worn.
- Garment usage count updates after marking worn.
- Calendar remains usable as outfit schedule.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm test
npm run build
git status --short
git add src/dal/entity/outfit-calendar.entity.ts src/wardrobe/calendar.service.ts src/wardrobe/calendar.controller.ts views/calendar src/dal/migrations
git commit -m "feat: add daily outfit records"
```

### Task 6: Rule-Based Natural-Language-Like Filtering

**Files:**
- Create: `src/wardrobe/recommendation/wardrobe-query-parser.ts`
- Create: `src/wardrobe/recommendation/wardrobe-query-parser.spec.ts`
- Create: `src/wardrobe/recommendation/wardrobe-recommendation.service.ts`
- Create: `src/wardrobe/recommendation/wardrobe-recommendation.service.spec.ts`
- Modify: `src/wardrobe/wardrobe.module.ts`
- Modify: `src/wardrobe/wardrobe.controller.ts`
- Create: `views/wardrobe/recommend.hbs`
- Test: `test/smoke.spec.ts`

- [ ] **Step 1: Implement simple query parser**

Create a parser that maps common Chinese words into filters:

```ts
export interface WardrobeQueryIntent {
  colors: string[];
  styles: string[];
  scenes: string[];
  seasons: string[];
  excludedCategories: string[];
  keywords: string[];
}
```

Examples:

```text
今天想穿黑色系 -> colors: ['black']
法式一点 -> styles: ['法式']
通勤但不要太正式 -> scenes: ['通勤'], keywords: ['不要太正式']
不想穿裙子 -> excludedCategories: ['skirt', 'dress']
下雨天 -> keywords: ['下雨']
```

- [ ] **Step 2: Recommend matching garments**

Create `WardrobeRecommendationService` that:

- Loads only wearable garments.
- Scores matches by color, style, scene, season, and keyword.
- Groups results by category.
- Returns excluded reasons for non-wearable garments.

- [ ] **Step 3: Add recommendation page**

Add route:

```text
GET /wardrobe/recommend
POST /wardrobe/recommend
```

The page should have one input:

```text
今天想穿什么？
```

and show grouped garment results.

Acceptance:

- "今天想穿黑色系" returns black garments first.
- "今天通勤" prioritizes items tagged for commuting.
- Laundry/damaged/archived items are excluded.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm test
npm run build
git status --short
git add src/wardrobe/recommendation src/wardrobe/wardrobe.module.ts src/wardrobe/wardrobe.controller.ts views/wardrobe/recommend.hbs
git commit -m "feat: add rule based wardrobe recommendations"
```

### Task 7: Generate Full Outfit From One Garment

**Files:**
- Create: `src/wardrobe/recommendation/outfit-generator.service.ts`
- Create: `src/wardrobe/recommendation/outfit-generator.service.spec.ts`
- Modify: `src/wardrobe/outfit.controller.ts`
- Modify: `src/wardrobe/outfit.service.ts`
- Create: `views/outfits/recommend-from-garment.hbs`
- Modify: `views/wardrobe/show.hbs`
- Test: `test/smoke.spec.ts`

- [ ] **Step 1: Add "start from this item" action**

In `views/wardrobe/show.hbs`, add a button:

```text
围绕这件衣服搭一套
```

Link to:

```text
/outfits/recommend?garmentId={{garment.id}}
```

- [ ] **Step 2: Implement outfit generator**

Create a service that receives:

```ts
{
  coreGarmentId: number;
  requestText?: string;
}
```

It should produce 3 plans:

```text
方案A：稳妥通勤
方案B：年轻活泼
方案C：舒适日常
```

Each plan should pick from existing wearable garments only.

- [ ] **Step 3: Allow saving generated plan**

Each generated plan should submit to existing `OutfitService.create()` so generated outfits become normal saved outfits.

Acceptance:

- User selects one garment and gets 3 outfit plans.
- Every recommended item exists in the user's wardrobe.
- User can save one plan as an outfit.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm test
npm run build
git status --short
git add src/wardrobe/recommendation src/wardrobe/outfit.controller.ts src/wardrobe/outfit.service.ts views/outfits/recommend-from-garment.hbs views/wardrobe/show.hbs
git commit -m "feat: recommend outfits from a garment"
```

### Task 8: AI Image Recognition Draft Tags

**Files:**
- Create: `src/ai/ai.module.ts`
- Create: `src/ai/garment-vision.service.ts`
- Create: `src/ai/garment-vision.service.spec.ts`
- Create: `src/ai/dto/garment-vision-result.dto.ts`
- Modify: `src/app.module.ts`
- Modify: `src/wardrobe/wardrobe.controller.ts`
- Modify: `views/wardrobe/form.hbs`
- Create: `views/wardrobe/ai-confirm.hbs`

- [ ] **Step 1: Add AI service boundary**

Create `GarmentVisionService` with this method:

```ts
export interface GarmentVisionResult {
  category: string;
  subcategory?: string;
  color?: string;
  seasons: string[];
  styleTags: string[];
  sceneTags: string[];
  material?: string;
  thickness?: string;
  confidence: number;
  notes: string;
}

export class GarmentVisionService {
  async analyzeImage(fileName: string): Promise<GarmentVisionResult> {
    return {
      category: 'top',
      subcategory: undefined,
      color: undefined,
      seasons: [],
      styleTags: [],
      sceneTags: [],
      confidence: 0,
      notes: 'AI识别服务尚未配置，请手动确认衣物信息。',
    };
  }
}
```

The first commit may use this no-AI boundary so later real AI integration does not touch controllers heavily.

- [ ] **Step 2: Add human confirmation page**

After image upload, route to `views/wardrobe/ai-confirm.hbs`.

Acceptance:

- AI result is never written directly without user confirmation.
- User can edit every suggested field before saving.

- [ ] **Step 3: Connect real AI provider**

Only after the no-AI boundary works, replace `analyzeImage()` with a real model call using environment variables:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=...
AI_VISION_MODEL=...
```

Do not hard-code API keys.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm test
npm run build
git status --short
git add src/ai src/app.module.ts src/wardrobe/wardrobe.controller.ts views/wardrobe
git commit -m "feat: add AI garment recognition confirmation flow"
```

### Task 9: AI Outfit Recommendation Text

**Files:**
- Create: `src/ai/outfit-ai.service.ts`
- Create: `src/ai/outfit-ai.service.spec.ts`
- Modify: `src/wardrobe/recommendation/outfit-generator.service.ts`
- Modify: `views/outfits/recommend-from-garment.hbs`
- Modify: `views/wardrobe/recommend.hbs`

- [ ] **Step 1: Add AI text service**

Create a service that receives:

```ts
{
  requestText: string;
  availableGarments: Array<{
    id: number;
    name?: string;
    category: string;
    color?: string;
    seasons?: string[];
    styleTags?: string[];
    sceneTags?: string[];
    status: string;
  }>;
}
```

It must return structured recommendations:

```ts
{
  title: string;
  garmentIds: number[];
  reason: string;
  cautions: string[];
}
```

- [ ] **Step 2: Enforce real-wardrobe guardrail**

Before showing AI output, validate:

- Every `garmentId` exists.
- Every item belongs to the user.
- Every item is `wearable`.
- No missing item is presented as owned.

- [ ] **Step 3: Add fallback to rule-based result**

If AI fails, show rule-based recommendations and a plain message:

```text
AI暂时不可用，先为你按衣柜标签筛选出这些单品。
```

Acceptance:

- AI can explain why it chose an outfit.
- AI cannot invent clothes.
- The app still works if AI key is missing.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm test
npm run build
git status --short
git add src/ai src/wardrobe/recommendation views/outfits views/wardrobe
git commit -m "feat: add guarded AI outfit recommendations"
```

### Task 10: V1 Analysis Features

**Files:**
- Create: `src/wardrobe/analytics/wardrobe-analytics.service.ts`
- Create: `src/wardrobe/analytics/wardrobe-analytics.service.spec.ts`
- Modify: `src/wardrobe/wardrobe.module.ts`
- Create: `src/wardrobe/analytics.controller.ts`
- Create: `views/analytics/index.hbs`
- Modify: `views/partials/dock.hbs`

- [ ] **Step 1: Add analytics service**

Calculate:

```text
总衣物数
可穿衣物数
待洗衣物数
长期未穿
穿着次数最高
低利用率单品
主要颜色分布
主要风格分布
```

- [ ] **Step 2: Add analytics page**

Create `/analytics` page with practical cards:

```text
最近常穿
长期闲置
衣柜缺口
重复购买风险
```

- [ ] **Step 3: Keep purchase advice conservative**

Do not build shopping links in V1. Only produce suggestions like:

```text
你的浅色外套较少，可以后续考虑补一件春秋外套。
```

Acceptance:

- User can understand closet usage.
- No ecommerce or ad-like flow is introduced.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm test
npm run build
git status --short
git add src/wardrobe/analytics src/wardrobe/analytics.controller.ts src/wardrobe/wardrobe.module.ts views/analytics views/partials/dock.hbs
git commit -m "feat: add wardrobe analytics dashboard"
```

## Features To Defer

Defer these until Tasks 1-9 are stable:

- Inspiration image outfit recreation.
- Shopping anti-duplicate image upload.
- Travel packing lists.
- Social sharing.
- Multi-person wardrobe.
- Native WeChat mini-program rewrite.

Reason: these all depend on reliable garment metadata, outfit records, and AI guardrails.

## Verification Before Each Commit

Before every commit:

```powershell
git status --short
npm test
npm run build
```

For visible UI tasks, also run:

```powershell
npm run start:dev
```

Then verify in browser:

```text
http://localhost:3000
```

## Push Rule

After each successful commit:

```powershell
git remote -v
git push
```

If `git push` fails because the remote is the upstream Libre Closet repository and the user has no permission, stop and ask the user whether to:

```text
1. Create their own GitHub repository and push there.
2. Keep commits local for now.
```

Do not delete files or directories to solve Git problems.
