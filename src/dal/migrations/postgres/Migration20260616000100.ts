import { Migration } from '@mikro-orm/migrations';

export class Migration20260616000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "user" add column "wechat_open_id" varchar(255) null;`);
    this.addSql(
      `create unique index "user_wechat_open_id_unique" on "user" ("wechat_open_id");`,
    );
  }
}
