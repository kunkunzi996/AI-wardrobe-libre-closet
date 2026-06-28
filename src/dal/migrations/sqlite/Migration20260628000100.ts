import { Migration } from '@mikro-orm/migrations';

export class Migration20260628000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table `outfit` add column `photo_id` integer null;');
    this.addSql(
      'create unique index `outfit_photo_id_unique` on `outfit` (`photo_id`);',
    );
  }
}
