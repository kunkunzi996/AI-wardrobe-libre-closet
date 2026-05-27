import { GarmentColor } from '../garment-color.enum';

export interface WardrobeQueryIntent {
  colors: string[];
  styles: string[];
  scenes: string[];
  seasons: string[];
  excludedCategories: string[];
  keywords: string[];
}

const COLOR_WORDS: Record<string, GarmentColor> = {
  黑: GarmentColor.BLACK,
  黑色: GarmentColor.BLACK,
  白: GarmentColor.WHITE,
  白色: GarmentColor.WHITE,
  灰: GarmentColor.GREY,
  灰色: GarmentColor.GREY,
  米色: GarmentColor.BEIGE,
  卡其: GarmentColor.BEIGE,
  棕色: GarmentColor.BROWN,
  蓝: GarmentColor.BLUE,
  蓝色: GarmentColor.BLUE,
  红: GarmentColor.RED,
  红色: GarmentColor.RED,
  粉: GarmentColor.PINK,
  粉色: GarmentColor.PINK,
  绿: GarmentColor.GREEN,
  绿色: GarmentColor.GREEN,
  黄: GarmentColor.YELLOW,
  黄色: GarmentColor.YELLOW,
  紫: GarmentColor.PURPLE,
  紫色: GarmentColor.PURPLE,
};

const STYLE_WORDS = ['法式', '休闲', '简约', '韩系', '甜美', '运动', '复古'];
const SCENE_WORDS = ['通勤', '上班', '约会', '旅行', '居家', '聚会', '面试'];
const SEASON_WORDS = ['春', '夏', '秋', '冬', '春天', '夏天', '秋天', '冬天'];

function pushUnique(values: string[], value: string) {
  if (!values.includes(value)) values.push(value);
}

export function parseWardrobeQuery(input = ''): WardrobeQueryIntent {
  const text = input.trim();
  const intent: WardrobeQueryIntent = {
    colors: [],
    styles: [],
    scenes: [],
    seasons: [],
    excludedCategories: [],
    keywords: [],
  };

  for (const [word, color] of Object.entries(COLOR_WORDS)) {
    if (text.includes(word)) pushUnique(intent.colors, color);
  }

  for (const style of STYLE_WORDS) {
    if (text.includes(style)) pushUnique(intent.styles, style);
  }

  for (const scene of SCENE_WORDS) {
    if (text.includes(scene)) pushUnique(intent.scenes, scene);
  }

  for (const season of SEASON_WORDS) {
    if (text.includes(season)) pushUnique(intent.seasons, season[0]);
  }

  if (/不想穿.*裙|不要.*裙|不穿.*裙/.test(text)) {
    pushUnique(intent.excludedCategories, 'dresses');
    pushUnique(intent.excludedCategories, 'bottoms');
  }

  if (/不想穿.*外套|不要.*外套|不穿.*外套/.test(text)) {
    pushUnique(intent.excludedCategories, 'outerwear');
  }

  if (text.includes('下雨')) pushUnique(intent.keywords, '下雨');
  if (text.includes('不要太正式')) pushUnique(intent.keywords, '不要太正式');
  if (text.includes('显瘦')) pushUnique(intent.keywords, '显瘦');
  if (text.includes('保暖')) pushUnique(intent.keywords, '保暖');

  return intent;
}
