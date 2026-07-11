import { Migration } from '@mikro-orm/migrations';

export class Migration20260711000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "garment" add column "taxonomy_tags" jsonb null;');
  }

  override async down(): Promise<void> {
    this.addSql('alter table "garment" drop column "taxonomy_tags";');
  }
}
