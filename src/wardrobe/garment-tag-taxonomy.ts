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

export type GarmentTagGroup = keyof typeof GARMENT_TAG_TAXONOMY;
export type GarmentTaxonomySelection = Partial<
  Record<GarmentTagGroup, string[]>
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
