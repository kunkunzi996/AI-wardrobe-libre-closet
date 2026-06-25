import { Migration } from '@mikro-orm/migrations';

export class Migration20260625000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table "garment" add column "pocket_presence" varchar(255) null;',
    );
    this.addSql(
      'alter table "garment" add column "pocket_position" varchar(255) null;',
    );
    this.addSql(
      'alter table "garment" add column "chest_mark_presence" varchar(255) null;',
    );
    this.addSql(
      'alter table "garment" add column "chest_mark_type" varchar(255) null;',
    );
    this.addSql(
      'alter table "garment" add column "chest_mark_position" varchar(255) null;',
    );
    this.addSql(
      'alter table "garment" add column "chest_mark_text" varchar(255) null;',
    );
  }
}
