import { Garment } from '../../dal/entity/garment.entity';
import {
  COLOR_LABEL_TO_VALUE,
  COLOR_VALUE_TO_LABEL,
} from '../garment-tag-taxonomy';
import {
  buildOutfitGarmentProfile,
  type OutfitGarmentProfile,
} from './outfit-tag-profile';
import { parseWardrobeQuery } from './wardrobe-query-parser';
import type { OutfitTemperatureContext } from '../../weather/tencent-weather.service';

const THICK_TAGS = new Set(['厚款', '加厚']);
const THIN_TAGS = new Set(['极薄', '薄款']);
const SKIRT_TAGS = new Set(['连衣裙', '半身裙']);
const OUTERWEAR_TAGS = new Set(['夹克', '风衣', '大衣', '羽绒服']);

export const DEMAND_CONFLICT_CAUTION =
  '需求冲突提醒：围绕的这件和这次需求有冲突。';

export function filterCandidateWardrobe(input: {
  garments: Garment[];
  core?: Garment;
  requestText?: string;
  temperatureContext?: OutfitTemperatureContext;
}): Garment[] {
  return input.garments.filter(
    (garment) =>
      garment.id === input.core?.id ||
      !isMiniappIncompatible(
        garment,
        input.requestText,
        input.core,
        input.temperatureContext,
      ),
  );
}

export function isMiniappIncompatible(
  garment: Garment,
  requestText: string | undefined,
  core?: Garment,
  temperatureContext?: OutfitTemperatureContext,
): boolean {
  if (core && garment.id === core.id) return false;
  const profile = buildOutfitGarmentProfile(garment);
  const intent = parseWardrobeQuery(requestText);
  if (failsHardColor(profile, garment, intent.colors)) return true;
  if (failsHardThickness(profile, intent.thickness)) return true;
  if (failsExcludedCategory(garment, profile, intent.excludedCategories)) {
    return true;
  }
  return failsWeatherGate(profile, requestText, temperatureContext);
}

export function demandConflictCautions(
  core: Garment | undefined,
  requestText: string | undefined,
): string[] {
  if (!core) return [];
  const intent = parseWardrobeQuery(requestText);
  const profile = buildOutfitGarmentProfile(core);
  const conflicts =
    failsHardColor(profile, core, intent.colors) ||
    failsHardThickness(profile, intent.thickness) ||
    failsExcludedCategory(core, profile, intent.excludedCategories);
  return conflicts ? [DEMAND_CONFLICT_CAUTION] : [];
}

function failsHardColor(
  profile: OutfitGarmentProfile,
  garment: Garment,
  allowedColors: string[],
): boolean {
  if (!allowedColors.length) return false;
  const colors = garmentColorValues(profile, garment);
  if (!colors.length) return true;
  return !colors.some((color) => allowedColors.includes(color));
}

function failsHardThickness(
  profile: OutfitGarmentProfile,
  thickness: 'thin' | 'thick' | undefined,
): boolean {
  if (!thickness) return false;
  const tags = profile.tagsByGroup.thickness ?? [];
  if (!tags.length) return true;
  if (thickness === 'thin') return tags.some((tag) => THICK_TAGS.has(tag));
  return tags.some((tag) => THIN_TAGS.has(tag));
}

function failsExcludedCategory(
  garment: Garment,
  profile: OutfitGarmentProfile,
  excluded: string[],
): boolean {
  if (excluded.includes('dresses') && isSkirt(garment, profile)) return true;
  if (excluded.includes('outerwear') && isOuterwear(garment, profile)) {
    return true;
  }
  return excluded.includes(garment.category);
}

function isSkirt(garment: Garment, profile: OutfitGarmentProfile): boolean {
  if (garment.category === 'dresses') return true;
  return (profile.tagsByGroup.category ?? []).some((tag) =>
    SKIRT_TAGS.has(tag),
  );
}

function isOuterwear(garment: Garment, profile: OutfitGarmentProfile): boolean {
  if (garment.category === 'outerwear') return true;
  return (profile.tagsByGroup.category ?? []).some((tag) =>
    OUTERWEAR_TAGS.has(tag),
  );
}

function garmentColorValues(
  profile: OutfitGarmentProfile,
  garment: Garment,
): string[] {
  const fromTags = (profile.tagsByGroup.color ?? []).flatMap((label) => {
    const value = COLOR_LABEL_TO_VALUE[label];
    return value ? [value] : [];
  });
  if (typeof garment.color === 'string' && garment.color.trim()) {
    const label = COLOR_VALUE_TO_LABEL[garment.color];
    const value = label ? COLOR_LABEL_TO_VALUE[label] : garment.color;
    if (value) fromTags.push(value);
  }
  return Array.from(new Set(fromTags));
}

function failsWeatherGate(
  profile: OutfitGarmentProfile,
  requestText: string | undefined,
  temperatureContext?: OutfitTemperatureContext,
): boolean {
  if (!temperatureContext || temperatureContext.status !== 'available') {
    return false;
  }
  const weatherTags = profile.tagsByGroup.weather ?? [];
  const thicknessTags = profile.tagsByGroup.thickness ?? [];
  const explicitWarm = isExplicitWarmRequest(requestText);
  const explicitCool = isExplicitCoolRequest(requestText);
  const highTemperature = (temperatureContext.maxC ?? -Infinity) > 25;
  const lowTemperature = (temperatureContext.minC ?? Infinity) <= 10;
  if (
    highTemperature &&
    !explicitWarm &&
    (weatherTags.includes('冬寒') ||
      thicknessTags.some((tag) => THICK_TAGS.has(tag)))
  ) {
    return true;
  }
  if (
    lowTemperature &&
    !explicitCool &&
    (weatherTags.includes('夏热') || thicknessTags.includes('极薄'))
  ) {
    return true;
  }
  return false;
}

function isExplicitWarmRequest(requestText?: string): boolean {
  if (!requestText) return false;
  const text = requestText.toLowerCase();
  return ['保暖', '暖和', '御寒', '防寒', '怕冷', '冷', 'warm', 'winter'].some(
    (word) => text.includes(word),
  );
}

function isExplicitCoolRequest(requestText?: string): boolean {
  if (!requestText) return false;
  const text = requestText.toLowerCase();
  return [
    '凉爽',
    '清凉',
    '清爽',
    '透气',
    '怕热',
    '太热',
    'cool',
    'summer',
  ].some((word) => text.includes(word));
}
