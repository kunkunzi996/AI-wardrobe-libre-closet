import { GarmentColor } from '../../wardrobe/garment-color.enum';

export interface GarmentVisionResult {
  fileName: string;
  category: string;
  subcategory?: string;
  color?: GarmentColor;
  seasons: string[];
  styleTags: string[];
  sceneTags: string[];
  material?: string;
  thickness?: string;
  confidence: number;
  notes: string;
}
