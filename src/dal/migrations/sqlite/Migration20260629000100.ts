import { Migration } from '@mikro-orm/migrations';

export class Migration20260629000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table `user` add column `nickname` text null;');
    this.addSql('alter table `user` add column `bio` text null;');
    this.addSql('alter table `user` add column `avatar_id` integer null;');
    this.addSql(
      'create unique index `user_avatar_id_unique` on `user` (`avatar_id`);',
    );
  }
}
