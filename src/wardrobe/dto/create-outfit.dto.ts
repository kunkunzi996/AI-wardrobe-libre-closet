import { OutfitSlot } from 'src/dal/entity/outfit.entity';

export interface CreateOutfitDto {
  name?: string;
  notes?: string;
  slots?: OutfitSlot[];
  photoFileName?: string;
}
