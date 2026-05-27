import { Migration } from '@mikro-orm/migrations';

export class Migration20260526000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "garment" add column "subcategory" varchar(255) null;`);
    this.addSql(`alter table "garment" add column "seasons" jsonb null;`);
    this.addSql(`alter table "garment" add column "style_tags" jsonb null;`);
    this.addSql(`alter table "garment" add column "scene_tags" jsonb null;`);
    this.addSql(`alter table "garment" add column "material" varchar(255) null;`);
    this.addSql(`alter table "garment" add column "thickness" varchar(255) null;`);
    this.addSql(`alter table "garment" add column "fit" varchar(255) null;`);
    this.addSql(
      `alter table "garment" add column "status" varchar(255) not null default 'wearable';`,
    );
    this.addSql(`alter table "garment" add column "price" numeric null;`);
    this.addSql(
      `alter table "garment" add column "purchase_date" timestamptz null;`,
    );
    this.addSql(
      `alter table "garment" add column "purchase_channel" varchar(255) null;`,
    );
    this.addSql(
      `alter table "garment" add column "wear_count" integer not null default 0;`,
    );
    this.addSql(
      `alter table "garment" add column "last_worn_date" timestamptz null;`,
    );
  }
}
