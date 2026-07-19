import { Migration20260719000100 as PostgresMigration } from './postgres/Migration20260719000100';
import { Migration20260719000100 as SqliteMigration } from './sqlite/Migration20260719000100';

const SqliteDatabase = (() => {
  try {
    return require('node:sqlite').DatabaseSync;
  } catch {
    return require('better-sqlite3');
  }
})();

describe('Migration20260719000100', () => {
  let database: any;

  beforeEach(() => {
    database = new SqliteDatabase(':memory:');
    database.exec(
      'create table `garment` (`id` integer not null primary key, `name` text null);',
    );
    database.prepare('insert into `garment` (`id`, `name`) values (?, ?)').run(
      1,
      '保留的旧衣物',
    );
  });

  afterEach(() => {
    database.close();
  });

  it('adds, writes, reads, and removes the timestamp column without losing old rows', async () => {
    const migration = new SqliteMigration(undefined as any, undefined as any);
    await migration.up();
    for (const query of migration.getQueries()) database.exec(String(query));

    expect(
      database
        .prepare(
          "select count(*) as `count` from pragma_table_info('garment') where name = 'tags_backfilled_at'",
        )
        .get(),
    ).toMatchObject({ count: 1 });

    const timestamp = new Date('2026-07-19T08:00:00.000Z').toISOString();
    database
      .prepare('update `garment` set `tags_backfilled_at` = ? where `id` = ?')
      .run(timestamp, 1);
    expect(
      database
        .prepare('select `name`, `tags_backfilled_at` from `garment` where `id` = 1')
        .get(),
    ).toEqual({ name: '保留的旧衣物', tags_backfilled_at: timestamp });

    migration.reset();
    await migration.down();
    for (const query of migration.getQueries()) database.exec(String(query));

    expect(
      database
        .prepare(
          "select count(*) as `count` from pragma_table_info('garment') where name = 'tags_backfilled_at'",
        )
        .get(),
    ).toMatchObject({ count: 0 });
    expect(database.prepare('select `name` from `garment` where `id` = 1').get()).toEqual({
      name: '保留的旧衣物',
    });
  });

  it('uses a nullable timestamptz column for PostgreSQL', async () => {
    const migration = new PostgresMigration(undefined as any, undefined as any);
    await migration.up();

    expect(migration.getQueries().map(String)).toEqual([
      'alter table "garment" add column "tags_backfilled_at" timestamptz null;',
    ]);
  });
});
