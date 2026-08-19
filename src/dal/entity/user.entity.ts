import {
  Cascade,
  Collection,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
  type Ref,
  Unique,
} from '@mikro-orm/core';
import { File } from './file.entity';
import { Garment } from './garment.entity';
import { Outfit } from './outfit.entity';
import { PasswordReset } from './passwordReset.entity';
import { ShareableId } from './shareableId.entity';
import { UserDevice } from './userDevice.entity';

@Entity()
export class User extends ShareableId {
  @PrimaryKey()
  public id!: number;

  @Property({ nullable: true })
  public firstName?: string;

  @Property({ nullable: true })
  public lastName?: string;

  @Unique()
  @Property({ nullable: true })
  public email?: string;

  @Unique()
  @Property({ nullable: true })
  public wechatOpenId?: string;

  @Property({ nullable: true })
  public nickname?: string;

  @Property({ default: false })
  public acceptanceSandbox = false;

  @Property({ type: 'text', nullable: true })
  public bio?: string;

  @OneToOne({ entity: () => File, nullable: true })
  public avatar?: File;

  @Property()
  public password!: string;

  @OneToOne({
    entity: () => PasswordReset,
    cascade: [Cascade.ALL],
    nullable: true,
    ref: true,
    inversedBy: 'user',
  })
  public passwordReset!: Ref<PasswordReset>;

  @OneToMany(() => UserDevice, (userDevice) => userDevice.user)
  public userDevices = new Collection<UserDevice>(this);

  @OneToMany(() => File, (file) => file.createdBy)
  public fileUploads = new Collection<File>(this);

  @OneToMany(() => Garment, (garment) => garment.owner)
  public garments = new Collection<Garment>(this);

  @OneToMany(() => Outfit, (outfit) => outfit.owner)
  public outfits = new Collection<Outfit>(this);
}
