import { existsSync } from 'node:fs';
import { join } from 'node:path';

const SqliteDatabase = (() => {
  try {
    return require('node:sqlite').DatabaseSync;
  } catch {
    return require('better-sqlite3');
  }
})();

// 固定为本轮施工之前的真实 schema，不因新实体出现而自动补齐新字段。
const baselineMigrations = [
  'Migration20251104025338',
  'Migration20260219201513',
  'Migration20260224004611',
  'Migration20260305210519',
  'Migration20260326211214',
  'Migration20260406193247',
  'Migration20260416215236',
  'Migration20260526000100',
  'Migration20260526000200',
  'Migration20260616000100',
  'Migration20260625000100',
  'Migration20260628000100',
  'Migration20260629000100',
  'Migration20260702000100',
  'Migration20260711000100',
  'Migration20260719000100',
  'Migration20260819000100',
];
const migrationName = 'Migration20261006000100';

const loadMigration = (database: 'sqlite' | 'postgres', name: string) => {
  const migrationPath = join(__dirname, database, `${name}.ts`);
  // 实现未出现时保留真实旧 schema；红灯来自 schema 合同，而不是找不到模块。
  if (!existsSync(migrationPath)) return undefined;
  const MigrationClass = require(migrationPath)[name];
  return new MigrationClass(undefined as any, undefined as any);
};

describe('TEST-015 原图与当前整理记录数据库迁移合同', () => {
  let database: any;

  const applySqlite = async (name: string) => {
    const migration = loadMigration('sqlite', name);
    if (migration) {
      await migration.up();
      for (const query of migration.getQueries()) database.exec(String(query));
    }
    return migration;
  };

  beforeEach(async () => {
    database = new SqliteDatabase(':memory:');
    for (const name of baselineMigrations) await applySqlite(name);
    database.exec('pragma foreign_keys = on;');
    database
      .prepare(
        'insert into `user` (`id`, `shareable_id`, `password`) values (?, ?, ?)',
      )
      .run(1, 'test-owner', 'test-password');
    database
      .prepare(
        'insert into `file` (`id`, `shareable_id`, `file_name`, `created_on`, `created_by_id`) values (?, ?, ?, ?, ?)',
      )
      .run(1, 'test-photo', 'legacy.webp', '2026-10-06', 1);
    database
      .prepare(
        'insert into `garment` (`id`, `shareable_id`, `name`, `category`, `photo_id`, `owner_id`, `status`) values (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(1, 'test-garment', '保留的旧衣物', 'tops', 1, 1, 'laundry');
  });

  afterEach(() => database?.close());

  it('TEST-015 SQLite 扩展原图列且旧行和 status 在 up/down 后保留', async () => {
    const migration = await applySqlite(migrationName);
    const columns = database.prepare("pragma table_info('garment')").all();
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'original_photo_id', notnull: 0 }),
        expect.objectContaining({ name: 'status' }),
      ]),
    );
    expect(
      database
        .prepare(
          'select `name`, `photo_id`, `status`, `original_photo_id` from `garment` where `id` = 1',
        )
        .get(),
    ).toEqual({
      name: '保留的旧衣物',
      photo_id: 1,
      status: 'laundry',
      original_photo_id: null,
    });

    migration.reset();
    await migration.down();
    for (const query of migration.getQueries()) database.exec(String(query));
    expect(
      database
        .prepare(
          'select `name`, `photo_id`, `status` from `garment` where `id` = 1',
        )
        .get(),
    ).toEqual({ name: '保留的旧衣物', photo_id: 1, status: 'laundry' });
  });

  it('TEST-015 SQLite 每件衣物唯一当前任务且删除衣物级联移除记录', async () => {
    await applySqlite(migrationName);
    const tables = database
      .prepare("select name from sqlite_master where type = 'table'")
      .all();
    expect(tables).toContainEqual({ name: 'garment_image_normalization' });
    const insert = database.prepare(
      'insert into `garment_image_normalization` (`garment_id`, `attempt_key`, `status`, `source_photo_id`, `prompt_family`, `prompt_version`, `model`, `created_at`, `updated_at`) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const fields = [
      1,
      'first-attempt',
      'queued',
      1,
      '上衣',
      '20261006-v1',
      'qwen-image-3.0-pro',
      '2026-10-06',
      '2026-10-06',
    ];
    insert.run(...fields);
    expect(() =>
      insert.run(
        ...fields.map((value, index) =>
          index === 1 ? 'second-attempt' : value,
        ),
      ),
    ).toThrow(/unique|constraint/i);
    database.prepare('delete from `garment` where `id` = 1').run();
    expect(
      database
        .prepare('select count(*) as count from `garment_image_normalization`')
        .get(),
    ).toEqual({ count: 0 });
  });

  it('TEST-015 PostgreSQL 同等原图/任务字段、唯一关系与级联 SQL', async () => {
    const migration = loadMigration('postgres', migrationName);
    if (migration) await migration.up();
    const queries: string[] = migration?.getQueries().map(String) ?? [];
    const sql = queries.join('\n');
    expect(sql).toContain('"original_photo_id"');
    expect(sql).not.toMatch(
      /"original_photo_id"\s+(?:integer|int)\s+not null/i,
    );
    expect(sql).not.toMatch(/drop\s+column\s+"status"/i);
    const fields = [
      'id',
      'garment_id',
      'attempt_key',
      'status',
      'source_photo_id',
      'candidate_photo_id',
      'prompt_family',
      'prompt_version',
      'model',
      'provider_request_id',
      'result_url',
      'error_code',
      'created_at',
      'updated_at',
      'dispatched_at',
    ];
    const tableSql = queries
      .filter((query) => query.includes('garment_image_normalization'))
      .join('\n');
    for (const field of fields) expect(tableSql).toContain(`"${field}"`);
    expect(
      queries.some(
        (query) =>
          query.includes('garment_image_normalization') &&
          /unique/i.test(query) &&
          query.includes('"garment_id"'),
      ),
    ).toBe(true);
    expect(tableSql).toMatch(
      /foreign key\s*\("garment_id"\)[^;]*on delete cascade/i,
    );
  });
});
