import { Migration } from '@mikro-orm/migrations';

export class Migration20260702000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "outfit_feedback" ("id" serial primary key, "created_at" timestamptz not null, "rating" varchar(255) not null, "comment" text null, "request_text" text null, "plan_title" varchar(255) null, "plan_reason" text null, "garment_ids" jsonb null, "source" varchar(255) null, "core_garment_id" int null, "owner_id" int null);`,
    );
    this.addSql(
      `alter table "outfit_feedback" add constraint "outfit_feedback_owner_id_foreign" foreign key ("owner_id") references "user" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `create index "outfit_feedback_owner_id_index" on "outfit_feedback" ("owner_id");`,
    );
  }
}
