import { Migration } from '@mikro-orm/migrations';

export class Migration20260526000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table \`garment\` add column \`subcategory\` text null;`);
    this.addSql(`alter table \`garment\` add column \`seasons\` json null;`);
    this.addSql(`alter table \`garment\` add column \`style_tags\` json null;`);
    this.addSql(`alter table \`garment\` add column \`scene_tags\` json null;`);
    this.addSql(`alter table \`garment\` add column \`material\` text null;`);
    this.addSql(`alter table \`garment\` add column \`thickness\` text null;`);
    this.addSql(`alter table \`garment\` add column \`fit\` text null;`);
    this.addSql(
      `alter table \`garment\` add column \`status\` text not null default 'wearable';`,
    );
    this.addSql(`alter table \`garment\` add column \`price\` real null;`);
    this.addSql(
      `alter table \`garment\` add column \`purchase_date\` datetime null;`,
    );
    this.addSql(
      `alter table \`garment\` add column \`purchase_channel\` text null;`,
    );
    this.addSql(
      `alter table \`garment\` add column \`wear_count\` integer not null default 0;`,
    );
    this.addSql(
      `alter table \`garment\` add column \`last_worn_date\` datetime null;`,
    );
  }
}
