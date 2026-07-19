import { Migration } from '@mikro-orm/migrations';

export class Migration20260719000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table `garment` add column `tags_backfilled_at` datetime null;');
  }

  override async down(): Promise<void> {
    this.addSql('alter table `garment` drop column `tags_backfilled_at`;');
  }
}
