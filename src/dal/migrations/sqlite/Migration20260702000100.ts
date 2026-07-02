import { Migration } from '@mikro-orm/migrations';

export class Migration20260702000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`outfit_feedback\` (\`id\` integer not null primary key autoincrement, \`created_at\` datetime not null, \`rating\` text not null, \`comment\` text null, \`request_text\` text null, \`plan_title\` text null, \`plan_reason\` text null, \`garment_ids\` json null, \`source\` text null, \`core_garment_id\` integer null, \`owner_id\` integer null, constraint \`outfit_feedback_owner_id_foreign\` foreign key(\`owner_id\`) references \`user\`(\`id\`) on delete cascade on update cascade);`,
    );
    this.addSql(
      `create index \`outfit_feedback_owner_id_index\` on \`outfit_feedback\` (\`owner_id\`);`,
    );
  }
}
