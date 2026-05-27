import { MultipartFile } from '@fastify/multipart';
import { GarmentColor } from '../garment-color.enum';
import { GarmentStatus } from '../garment-status.enum';
import { TagInput } from './create-garment.dto';

export interface UpdateGarmentDto {
  name?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  color?: GarmentColor;
  size?: string;
  seasons?: TagInput;
  styleTags?: TagInput;
  sceneTags?: TagInput;
  material?: string;
  thickness?: string;
  fit?: string;
  status?: GarmentStatus;
  price?: number | string;
  purchaseDate?: Date | string;
  purchaseChannel?: string;
  wearCount?: number | string;
  lastWornDate?: Date | string;
  notes?: string;
  photo?: MultipartFile | undefined;
  nobgPhoto?: MultipartFile | undefined;
}
