import { Migration } from '@mikro-orm/migrations';

export class Migration20260628000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "outfit" add column "photo_id" int null;');
    this.addSql(
      'alter table "outfit" add constraint "outfit_photo_id_foreign" foreign key ("photo_id") references "file" ("id") on delete set null on update cascade;',
    );
    this.addSql(
      'create unique index "outfit_photo_id_unique" on "outfit" ("photo_id");',
    );
  }
}
