import { MultipartFile } from '@fastify/multipart';
import type {
  GarmentChestMarkPosition,
  GarmentChestMarkType,
  GarmentFeaturePresence,
  GarmentPocketPosition,
} from '../../ai/dto/garment-vision-result.dto';
import { GarmentColor } from '../garment-color.enum';
import { GarmentStatus } from '../garment-status.enum';
import type { GarmentTaxonomySelection } from '../garment-tag-taxonomy';

export type TagInput = string | string[];

export interface CreateGarmentDto {
  name?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  color?: GarmentColor;
  size?: string;
  seasons?: TagInput;
  styleTags?: TagInput;
  sceneTags?: TagInput;
  material?: string;
  thickness?: string;
  pocketPresence?: GarmentFeaturePresence;
  pocketPosition?: GarmentPocketPosition;
  chestMarkPresence?: GarmentFeaturePresence;
  chestMarkType?: GarmentChestMarkType;
  chestMarkPosition?: GarmentChestMarkPosition;
  chestMarkText?: string | null;
  fit?: string;
  taxonomyTags?: GarmentTaxonomySelection | string;
  status?: GarmentStatus;
  price?: number | string;
  purchaseDate?: Date | string;
  purchaseChannel?: string;
  wearCount?: number | string;
  lastWornDate?: Date | string;
  notes?: string;
  photo?: MultipartFile | undefined;
  photoFileName?: string;
}
