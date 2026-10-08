import {
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { File } from './file.entity';
import { Garment } from './garment.entity';

export type GarmentImageNormalizationStatus =
  | 'queued'
  | 'processing'
  | 'uncertain'
  | 'ready'
  | 'failed';

/** 每件衣物只保存一份当前记录；本卡仅建立 schema，不派发任务。 */
@Entity()
export class GarmentImageNormalization {
  @PrimaryKey()
  public id!: number;

  @OneToOne({ entity: () => Garment, ref: true, deleteRule: 'cascade' })
  public garment!: Ref<Garment>;

  @Property()
  public attemptKey!: string;

  @Property({ type: 'text' })
  public status!: GarmentImageNormalizationStatus;

  @ManyToOne({ entity: () => File, ref: true })
  public sourcePhoto!: Ref<File>;

  @ManyToOne({
    entity: () => File,
    ref: true,
    nullable: true,
    deleteRule: 'set null',
  })
  public candidatePhoto?: Ref<File>;

  @Property()
  public promptFamily!: string;

  @Property()
  public promptVersion!: string;

  @Property()
  public model!: string;

  @Property({ nullable: true })
  public providerRequestId?: string;

  @Property({ type: 'text', nullable: true })
  public resultUrl?: string;

  @Property({ nullable: true })
  public errorCode?: string;

  @Property()
  public createdAt = new Date();

  @Property()
  public updatedAt = new Date();

  @Property({ nullable: true })
  public dispatchedAt?: Date;
}
