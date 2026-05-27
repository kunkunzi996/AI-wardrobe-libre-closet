import { GarmentColor } from '../garment-color.enum';
import { GarmentStatus } from '../garment-status.enum';

export interface SearchGarmentDto {
  keyword?: string;
  category?: string;
  subcategory?: string;
  color?: GarmentColor;
  brand?: string;
  size?: string;
  status?: GarmentStatus;
  season?: string;
  style?: string;
  scene?: string;
}
