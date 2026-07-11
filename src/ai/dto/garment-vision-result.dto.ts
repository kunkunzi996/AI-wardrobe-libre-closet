import { GarmentColor } from '../../wardrobe/garment-color.enum';
import type { GarmentTaxonomySelection } from '../../wardrobe/garment-tag-taxonomy';

export const GARMENT_FEATURE_PRESENCE_VALUES = [
  'yes',
  'no',
  'unknown',
] as const;
export type GarmentFeaturePresence =
  (typeof GARMENT_FEATURE_PRESENCE_VALUES)[number];

export const GARMENT_POCKET_POSITION_VALUES = [
  'chest',
  'side',
  'other',
  'unknown',
] as const;
export type GarmentPocketPosition =
  (typeof GARMENT_POCKET_POSITION_VALUES)[number];

export const GARMENT_CHEST_MARK_TYPE_VALUES = [
  'text',
  'label',
  'icon',
  'mixed',
  'unknown',
] as const;
export type GarmentChestMarkType =
  (typeof GARMENT_CHEST_MARK_TYPE_VALUES)[number];

export const GARMENT_CHEST_MARK_POSITION_VALUES = [
  'chest-left',
  'chest-center',
  'other',
  'unknown',
] as const;
export type GarmentChestMarkPosition =
  (typeof GARMENT_CHEST_MARK_POSITION_VALUES)[number];

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
  fit?: string;
  taxonomyTags: GarmentTaxonomySelection;
  pocketPresence: GarmentFeaturePresence;
  pocketPosition: GarmentPocketPosition;
  chestMarkPresence: GarmentFeaturePresence;
  chestMarkType: GarmentChestMarkType;
  chestMarkPosition: GarmentChestMarkPosition;
  chestMarkText: string | null;
  confidence: number;
  notes: string;
}
