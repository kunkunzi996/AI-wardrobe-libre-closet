import { Migration } from '@mikro-orm/migrations';

export class Migration20260526000200 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "outfit_calendar" add column "scene" varchar(255) null;`);
    this.addSql(
      `alter table "outfit_calendar" add column "weather" varchar(255) null;`,
    );
    this.addSql(
      `alter table "outfit_calendar" add column "temperature" varchar(255) null;`,
    );
    this.addSql(`alter table "outfit_calendar" add column "rating" integer null;`);
    this.addSql(`alter table "outfit_calendar" add column "feedback" text null;`);
    this.addSql(
      `alter table "outfit_calendar" add column "complimented" boolean not null default false;`,
    );
  }
}
