import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryKey,
  Property,
  type Ref,
} from '@mikro-orm/core';
import { File } from './file.entity';
import { Outfit } from './outfit.entity';
import { ShareableId } from './shareableId.entity';
import { User } from './user.entity';
import { GarmentColor } from '../../wardrobe/garment-color.enum';
import { GarmentStatus } from '../../wardrobe/garment-status.enum';
import type {
  GarmentChestMarkPosition,
  GarmentChestMarkType,
  GarmentFeaturePresence,
  GarmentPocketPosition,
} from '../../ai/dto/garment-vision-result.dto';

export { GarmentColor };
export { GarmentStatus };

@Entity()
export class Garment extends ShareableId {
  @PrimaryKey()
  public id!: number;

  @Property({ nullable: true })
  public name?: string;

  @Property()
  public category!: string;

  @Property({ nullable: true })
  public color?: GarmentColor;

  @Property({ nullable: true })
  public brand?: string;

  @Property({ nullable: true })
  public size?: string;

  @Property({ nullable: true })
  public notes?: string;

  @Property({ nullable: true })
  public subcategory?: string;

  @Property({ type: 'json', nullable: true })
  public seasons?: string[];

  @Property({ type: 'json', nullable: true })
  public styleTags?: string[];

  @Property({ type: 'json', nullable: true })
  public sceneTags?: string[];

  @Property({ nullable: true })
  public material?: string;

  @Property({ nullable: true })
  public thickness?: string;

  @Property({ nullable: true })
  public pocketPresence?: GarmentFeaturePresence;

  @Property({ nullable: true })
  public pocketPosition?: GarmentPocketPosition;

  @Property({ nullable: true })
  public chestMarkPresence?: GarmentFeaturePresence;

  @Property({ nullable: true })
  public chestMarkType?: GarmentChestMarkType;

  @Property({ nullable: true })
  public chestMarkPosition?: GarmentChestMarkPosition;

  @Property({ nullable: true })
  public chestMarkText?: string;

  @Property({ nullable: true })
  public fit?: string;

  @Property({ default: GarmentStatus.Wearable })
  public status: GarmentStatus = GarmentStatus.Wearable;

  @Property({ nullable: true })
  public price?: number;

  @Property({ nullable: true })
  public purchaseDate?: Date;

  @Property({ nullable: true })
  public purchaseChannel?: string;

  @Property({ default: 0 })
  public wearCount = 0;

  @Property({ nullable: true })
  public lastWornDate?: Date;

  @OneToOne({
    entity: () => File,
    nullable: true,
  })
  public photo?: File;

  @ManyToOne({
    entity: () => User,
    deleteRule: 'cascade',
    ref: true,
    nullable: true,
  })
  public owner?: Ref<User>;

  @ManyToMany(() => Outfit, (outfit) => outfit.garments)
  public outfits = new Collection<Outfit>(this);
}
