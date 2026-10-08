import type { Garment } from '../dal/entity/garment.entity';
import type { GarmentImageFamily } from '../ai/garment-image.service';

/** 只读取用户已确认的资料；未知/冲突不补一次识图。 */
export function garmentImageFamily(
  garment: Pick<Garment, 'category' | 'taxonomyTags' | 'subcategory'>,
): GarmentImageFamily | null {
  const fixed: Record<string, GarmentImageFamily> = {
    tops: '上衣',
    outerwear: '外套',
    dresses: '连衣裙',
  };
  if (fixed[garment.category]) return fixed[garment.category];
  if (garment.category !== 'bottoms') return null;
  const structured = garment.taxonomyTags?.category;
  const labels =
    Array.isArray(structured) && structured.length
      ? structured.map((label) => label.trim()).filter(Boolean)
      : [garment.subcategory?.trim() ?? ''];
  const text = labels.join(' ');
  if (!text || /连体|背带|套装/.test(text)) return null;
  const pants = /裤/.test(text);
  const skirt = /裙/.test(text);
  if (pants === skirt) return null;
  return pants ? '裤子' : '半身裙';
}
