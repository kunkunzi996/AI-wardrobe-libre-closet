import { Migration } from '@mikro-orm/migrations';

export class Migration20261006000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `garment` add column `original_photo_id` integer null references `file` (`id`) on delete set null on update cascade;',
    );
    this.addSql(
      'create unique index `garment_original_photo_id_unique` on `garment` (`original_photo_id`);',
    );
    this.addSql(
      'create table `garment_image_normalization` (`id` integer not null primary key autoincrement, `garment_id` integer not null, `attempt_key` text not null, `status` text not null, `source_photo_id` integer not null, `candidate_photo_id` integer null, `prompt_family` text not null, `prompt_version` text not null, `model` text not null, `provider_request_id` text null, `result_url` text null, `error_code` text null, `created_at` datetime not null, `updated_at` datetime not null, `dispatched_at` datetime null, constraint `garment_image_normalization_garment_id_foreign` foreign key (`garment_id`) references `garment` (`id`) on delete cascade on update cascade, constraint `garment_image_normalization_source_photo_id_foreign` foreign key (`source_photo_id`) references `file` (`id`) on update cascade, constraint `garment_image_normalization_candidate_photo_id_foreign` foreign key (`candidate_photo_id`) references `file` (`id`) on delete set null on update cascade);',
    );
    this.addSql(
      'create unique index `garment_image_normalization_garment_id_unique` on `garment_image_normalization` (`garment_id`);',
    );
  }

  override async down(): Promise<void> {
    this.addSql('drop table `garment_image_normalization`;');
    this.addSql('drop index `garment_original_photo_id_unique`;');
    this.addSql('alter table `garment` drop column `original_photo_id`;');
  }
}
