import type { Garment } from '../../dal/entity/garment.entity';
import { isPrivateImageFileName } from '../../file/file-service.interface';
import { COLOR_VALUE_TO_LABEL } from '../garment-tag-taxonomy';

/** 当前展示图唯一 URL 映射；旧公开图片保持原地址。 */
export function garmentPhotoUrl(
  garmentId: number,
  file: { id: number; fileName: string } | null | undefined,
  origin: string,
): string {
  if (!file) return '';
  return isPrivateImageFileName(file.fileName)
    ? `${origin}/api/miniapp/garments/${garmentId}/photos/display?v=${file.id}`
    : `${origin}/file/${file.fileName}`;
}

const categories: Record<string, string> = {
  tops: '上衣',
  bottoms: '下装',
  outerwear: '外套',
  dresses: '连衣裙',
  footwear: '鞋子',
  bags: '包包',
  accessories: '配饰',
  other: '其他',
};

/** 采用响应与衣橱沿用同一衣物快照，不序列化 ORM/私有 File。 */
export function garmentViewModel(garment: Garment, origin: string) {
  return {
    id: garment.id,
    name: garment.name ?? '',
    category: garment.category,
    categoryLabel: categories[garment.category] ?? garment.category,
    color: garment.color ?? '',
    colorLabel: garment.color
      ? (COLOR_VALUE_TO_LABEL[garment.color] ?? garment.color)
      : '',
    season: garment.seasons?.[0] ?? '',
    seasons: garment.seasons ?? [],
    subcategory: garment.subcategory ?? '',
    styleTags: garment.styleTags ?? [],
    sceneTags: garment.sceneTags ?? [],
    material: garment.material ?? '',
    thickness: garment.thickness ?? '',
    taxonomyTags: garment.taxonomyTags ?? {},
    taxonomyTagList: Array.from(
      new Set(Object.values(garment.taxonomyTags ?? {}).flat()),
    ),
    pocketPresence: garment.pocketPresence ?? 'unknown',
    pocketPosition: garment.pocketPosition ?? 'unknown',
    chestMarkPresence: garment.chestMarkPresence ?? 'unknown',
    chestMarkType: garment.chestMarkType ?? 'unknown',
    chestMarkPosition: garment.chestMarkPosition ?? 'unknown',
    chestMarkText: garment.chestMarkText ?? null,
    brand: garment.brand ?? '',
    size: garment.size ?? '',
    notes: garment.notes ?? '',
    photoUrl: garmentPhotoUrl(garment.id, garment.photo, origin),
    originalPhotoUrl: garment.originalPhoto
      ? `${origin}/api/miniapp/garments/${garment.id}/photos/original?v=${garment.originalPhoto.id}`
      : '',
    detailUrl: `/api/miniapp/garments/${garment.id}`,
  };
}
