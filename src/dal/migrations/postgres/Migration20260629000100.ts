import { Migration } from '@mikro-orm/migrations';

export class Migration20260629000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "user" add column "nickname" varchar(255) null;');
    this.addSql('alter table "user" add column "bio" text null;');
    this.addSql('alter table "user" add column "avatar_id" int null;');
    this.addSql(
      'alter table "user" add constraint "user_avatar_id_unique" unique ("avatar_id");',
    );
    this.addSql(
      'alter table "user" add constraint "user_avatar_id_foreign" foreign key ("avatar_id") references "file" ("id") on update cascade on delete set null;',
    );
  }
}
