import { GarmentColor } from './garment-color.enum';

// Keep taxonomy labels and legacy garment fields on one shared mapping table.
export const COLOR_LABEL_TO_VALUE: Record<string, GarmentColor> = {
  黑色: GarmentColor.BLACK,
  白色: GarmentColor.WHITE,
  灰色: GarmentColor.GREY,
  米色: GarmentColor.BEIGE,
  棕色: GarmentColor.BROWN,
  红色: GarmentColor.RED,
  橙色: GarmentColor.ORANGE,
  黄色: GarmentColor.YELLOW,
  绿色: GarmentColor.GREEN,
  蓝色: GarmentColor.BLUE,
  紫色: GarmentColor.PURPLE,
  粉色: GarmentColor.PINK,
  金色: GarmentColor.GOLD,
  银色: GarmentColor.SILVER,
  彩色: GarmentColor.PATTERN,
};

export const COLOR_VALUE_TO_LABEL = Object.fromEntries(
  Object.entries(COLOR_LABEL_TO_VALUE).map(([label, value]) => [value, label]),
) as Partial<Record<GarmentColor, string>>;

export const SEASON_LABEL_TO_VALUE: Record<string, string> = {
  春季: 'spring',
  夏季: 'summer',
  秋季: 'autumn',
  冬季: 'winter',
  四季: 'all-season',
};

export const SEASON_ALIASES: Record<string, string> = {
  春: '春季',
  春天: '春季',
  spring: '春季',
  夏: '夏季',
  夏天: '夏季',
  summer: '夏季',
  秋: '秋季',
  秋天: '秋季',
  autumn: '秋季',
  fall: '秋季',
  冬: '冬季',
  冬天: '冬季',
  winter: '冬季',
  四季: '四季',
  'all-season': '四季',
};

export function taxonomySeasonLabelsFromValues(input: unknown): string[] {
  const values = Array.isArray(input) ? input : [input];
  return Array.from(
    new Set(
      values.flatMap((value) => {
        if (typeof value !== 'string') return [];
        const trimmed = value.trim();
        const label =
          SEASON_ALIASES[trimmed.toLowerCase()] ?? SEASON_ALIASES[trimmed];
        return label ? [label] : [];
      }),
    ),
  );
}

export function garmentSeasonValuesFromTaxonomy(input: unknown): string[] {
  const labels = Array.isArray(input) ? input : [input];
  return Array.from(
    new Set(
      labels.flatMap((label) => {
        if (typeof label !== 'string') return [];
        const value = SEASON_LABEL_TO_VALUE[label.trim()];
        return value ? [value] : [];
      }),
    ),
  );
}

export const GARMENT_TAG_TAXONOMY = {
  season: ['春季', '夏季', '秋季', '冬季', '四季'],
  weather: [
    '春暖',
    '夏热',
    '秋凉',
    '冬寒',
    '晴天',
    '多云',
    '阴天',
    '雨天',
    '雪天',
    '大风',
    '雾霾',
    '高温',
    '低温',
    '潮湿',
    '干燥',
  ],
  thickness: ['极薄', '薄款', '适中', '厚款', '加厚'],
  color: [
    '黑色',
    '白色',
    '灰色',
    '米色',
    '棕色',
    '红色',
    '橙色',
    '黄色',
    '绿色',
    '蓝色',
    '紫色',
    '粉色',
    '金色',
    '银色',
    '彩色',
  ],
  colorFeeling: [
    '冷色',
    '暖色',
    '中性色',
    '明亮',
    '柔和',
    '低饱和',
    '高饱和',
    '深色',
    '浅色',
    '撞色',
    '同色系',
  ],
  occasion: [
    '日常',
    '通勤',
    '商务',
    '约会',
    '聚会',
    '宴会',
    '婚礼',
    '旅行',
    '运动',
    '户外',
    '居家',
    '校园',
    '度假',
    '面试',
    '正式活动',
  ],
  style: [
    '简约',
    '休闲',
    '通勤',
    '商务',
    '运动',
    '街头',
    '复古',
    '甜美',
    '优雅',
    '性感',
    '中性',
    '文艺',
    '学院',
    '国风',
    '法式',
    '韩系',
    '日系',
    '工装',
  ],
  wearingFeel: [
    '舒适',
    '亲肤',
    '透气',
    '保暖',
    '轻盈',
    '柔软',
    '挺括',
    '弹力',
    '清凉',
    '厚重',
    '束缚',
    '宽松',
  ],
  material: [
    '棉',
    '麻',
    '羊毛',
    '羊绒',
    '真丝',
    '雪纺',
    '针织',
    '牛仔',
    '皮革',
    '麂皮',
    '涤纶',
    '尼龙',
    '粘胶',
    '灯芯绒',
    '蕾丝',
    '混纺',
  ],
  category: [
    'T恤',
    '衬衫',
    '背心',
    '卫衣',
    '针织衫',
    '毛衣',
    '西装',
    '夹克',
    '风衣',
    '大衣',
    '羽绒服',
    '连衣裙',
    '半身裙',
    '裤装',
    '短裤',
    '连体装',
    '鞋履',
    '包袋',
    '帽子',
    '围巾',
    '首饰',
    '腰带',
  ],
  length: [
    '超短',
    '短款',
    '常规',
    '中长',
    '长款',
    '及腰',
    '及臀',
    '及膝',
    '过膝',
    '及踝',
    '拖地',
  ],
  fit: [
    '紧身',
    '修身',
    '合身',
    '直筒',
    '宽松',
    '廓形',
    'A字',
    'H型',
    'X型',
    'O型',
    '茧型',
    '喇叭',
  ],
} as const;

export const AI_GARMENT_FIT_TAGS = [
  '直筒',
  '廓形',
  'A字',
  'H型',
  'X型',
  'O型',
  '茧型',
  '喇叭',
] as const;

export const AI_GARMENT_TAG_TAXONOMY = Object.fromEntries(
  Object.entries(GARMENT_TAG_TAXONOMY)
    .filter(([group]) => group !== 'wearingFeel')
    .map(([group, tags]) => [
      group,
      group === 'fit' ? AI_GARMENT_FIT_TAGS : tags,
    ]),
) as Omit<typeof GARMENT_TAG_TAXONOMY, 'wearingFeel'> & {
  fit: typeof AI_GARMENT_FIT_TAGS;
};

export type GarmentTagGroup = keyof typeof GARMENT_TAG_TAXONOMY;
export type AiGarmentTagGroup = keyof typeof AI_GARMENT_TAG_TAXONOMY;
export type GarmentTaxonomySelection = Partial<
  Record<GarmentTagGroup, string[]>
>;
export type AiGarmentTaxonomySelection = Partial<
  Record<AiGarmentTagGroup, string[]>
>;

export const GARMENT_TAG_GROUP_LABELS: Record<GarmentTagGroup, string> = {
  season: '季节',
  weather: '天气',
  thickness: '厚薄',
  color: '颜色',
  colorFeeling: '色彩感觉',
  occasion: '场合',
  style: '风格',
  wearingFeel: '穿着感',
  material: '材质',
  category: '品类',
  length: '长度',
  fit: '版型',
};

function parseSelection(input: unknown): Record<string, unknown> | undefined {
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input) as unknown;
      return parseSelection(parsed);
    } catch {
      return undefined;
    }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  return input as Record<string, unknown>;
}

function valuesFrom(input: unknown): string[] {
  const values = Array.isArray(input) ? input : [input];
  return values.flatMap((value) =>
    typeof value === 'string'
      ? value
          .split(/[,，、]/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  );
}

export function sanitizeGarmentTaxonomySelection(
  input: unknown,
): GarmentTaxonomySelection {
  const selection = parseSelection(input);
  if (!selection) return {};

  const result: GarmentTaxonomySelection = {};
  for (const group of Object.keys(GARMENT_TAG_TAXONOMY) as GarmentTagGroup[]) {
    const allowed = new Set<string>(GARMENT_TAG_TAXONOMY[group]);
    const tags = Array.from(
      new Set(valuesFrom(selection[group]).filter((tag) => allowed.has(tag))),
    );
    if (tags.length > 0) result[group] = tags;
  }
  return result;
}

export interface RejectedAiGarmentTag {
  group: string;
  tag: string;
}

export interface AiGarmentTaxonomyFilterResult {
  selection: AiGarmentTaxonomySelection;
  rejected: RejectedAiGarmentTag[];
}

const MAX_REJECTED_AI_TAGS = 20;
const MAX_REJECTED_AI_TAG_LENGTH = 80;

function limitedRejectedValue(value: string): string {
  return value.slice(0, MAX_REJECTED_AI_TAG_LENGTH);
}

export function filterAiGarmentTaxonomySelection(
  input: unknown,
): AiGarmentTaxonomyFilterResult {
  const selection = parseSelection(input);
  if (!selection) return { selection: {}, rejected: [] };

  const result: AiGarmentTaxonomySelection = {};
  const acceptedByGroup: Partial<Record<AiGarmentTagGroup, string[]>> = {};
  const rejected: RejectedAiGarmentTag[] = [];
  const rejectedKeys = new Set<string>();

  const reject = (group: string, tag: string) => {
    const limitedGroup = limitedRejectedValue(group);
    const limitedTag = limitedRejectedValue(tag);
    const key = `${limitedGroup}\u0000${limitedTag}`;
    if (rejectedKeys.has(key) || rejected.length >= MAX_REJECTED_AI_TAGS) {
      return;
    }
    rejectedKeys.add(key);
    rejected.push({ group: limitedGroup, tag: limitedTag });
  };

  for (const [group, rawValue] of Object.entries(selection)) {
    const values = valuesFrom(rawValue);
    const allowed = (
      AI_GARMENT_TAG_TAXONOMY as Record<string, readonly string[]>
    )[group];
    if (!allowed) {
      values.forEach((tag) => reject(group, tag));
      continue;
    }

    const allowedValues = new Set(allowed);
    const accepted: string[] = [];
    for (const tag of values) {
      if (allowedValues.has(tag)) {
        if (!accepted.includes(tag)) accepted.push(tag);
      } else {
        reject(group, tag);
      }
    }
    if (accepted.length > 0) {
      acceptedByGroup[group as AiGarmentTagGroup] = accepted;
    }
  }

  for (const group of Object.keys(
    AI_GARMENT_TAG_TAXONOMY,
  ) as AiGarmentTagGroup[]) {
    const accepted = acceptedByGroup[group];
    if (accepted?.length) result[group] = accepted;
  }

  return { selection: result, rejected };
}
