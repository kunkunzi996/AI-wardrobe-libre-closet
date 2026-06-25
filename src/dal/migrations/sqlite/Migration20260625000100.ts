import { Migration } from '@mikro-orm/migrations';

export class Migration20260625000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `garment` add column `pocket_presence` text null;',
    );
    this.addSql(
      'alter table `garment` add column `pocket_position` text null;',
    );
    this.addSql(
      'alter table `garment` add column `chest_mark_presence` text null;',
    );
    this.addSql(
      'alter table `garment` add column `chest_mark_type` text null;',
    );
    this.addSql(
      'alter table `garment` add column `chest_mark_position` text null;',
    );
    this.addSql(
      'alter table `garment` add column `chest_mark_text` text null;',
    );
  }
}
