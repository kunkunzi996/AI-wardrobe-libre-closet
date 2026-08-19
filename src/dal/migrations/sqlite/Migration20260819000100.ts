import { Migration } from '@mikro-orm/migrations';

export class Migration20260819000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `user` add column `acceptance_sandbox` integer not null default 0;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table `user` drop column `acceptance_sandbox`;');
  }
}
