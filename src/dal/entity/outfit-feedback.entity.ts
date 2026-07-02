import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { User } from './user.entity';

@Entity()
export class OutfitFeedback {
  @PrimaryKey()
  public id!: number;

  @Property()
  public createdAt: Date = new Date();

  /** good=搭配得不错，soso=一般，bad=不喜欢 */
  @Property()
  public rating!: string;

  @Property({ type: 'text', nullable: true })
  public comment?: string;

  /** 生成这套推荐时用户输入的需求语句 */
  @Property({ type: 'text', nullable: true })
  public requestText?: string;

  @Property({ nullable: true })
  public planTitle?: string;

  @Property({ type: 'text', nullable: true })
  public planReason?: string;

  /** 被评价方案包含的衣物 id 快照 */
  @Property({ type: 'json', nullable: true })
  public garmentIds?: number[];

  /** 推荐来源：ai 或 fallback */
  @Property({ nullable: true })
  public source?: string;

  @Property({ nullable: true })
  public coreGarmentId?: number;

  @ManyToOne({
    entity: () => User,
    deleteRule: 'cascade',
    ref: true,
    nullable: true,
  })
  public owner?: Ref<User>;
}
