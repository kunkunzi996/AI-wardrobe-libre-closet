import { GarmentColor } from '../garment-color.enum';
import {
  AI_GARMENT_FIT_TAGS,
  AI_GARMENT_TAG_TAXONOMY,
  COLOR_LABEL_TO_VALUE,
  COLOR_VALUE_TO_LABEL,
  sanitizeGarmentTaxonomySelection,
  taxonomySeasonLabelsFromValues,
  type AiGarmentTagGroup,
} from '../garment-tag-taxonomy';

export type OutfitTagSource = 'taxonomy' | 'legacy';

export interface OutfitGarmentProfile {
  garmentId: number;
  tagsByGroup: Record<string, string[]>;
  sourceByGroup: Record<string, OutfitTagSource>;
}

export type OutfitColorRelation = '同色系' | '撞色';

type OutfitGarmentInput = {
  id?: unknown;
  taxonomyTags?: unknown;
  color?: unknown;
  seasons?: unknown;
  sceneTags?: unknown;
  styleTags?: unknown;
  material?: unknown;
  subcategory?: unknown;
  thickness?: unknown;
  fit?: unknown;
};

const PROFILE_GROUPS = Object.keys(
  AI_GARMENT_TAG_TAXONOMY,
) as AiGarmentTagGroup[];
const OBJECTIVE_FITS = new Set<string>(AI_GARMENT_FIT_TAGS);
const SINGLE_GARMENT_COLOR_RELATIONS = new Set(['撞色', '同色系']);

const LEGACY_THICKNESS_LABELS: Record<string, string> = {
  极薄: '极薄',
  薄: '薄款',
  薄款: '薄款',
  偏薄: '薄款',
  thin: '薄款',
  light: '薄款',
  适中: '适中',
  中等: '适中',
  medium: '适中',
  厚: '厚款',
  厚款: '厚款',
  偏厚: '厚款',
  thick: '厚款',
  heavy: '厚款',
  加厚: '加厚',
};

function valuesFrom(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.flatMap((value) => valuesFrom(value));
  }
  if (typeof input !== 'string') return [];
  return input
    .split(/[,，、]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function garmentIdFrom(input: unknown): number {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string' && input.trim()) {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function legacyColorValues(input: unknown): string[] {
  return valuesFrom(input).flatMap((value) => {
    const label = COLOR_VALUE_TO_LABEL[value as GarmentColor] ?? value;
    return COLOR_LABEL_TO_VALUE[label] ? [label] : [];
  });
}

function legacyThicknessValues(input: unknown): string[] {
  return valuesFrom(input).map(
    (value) => LEGACY_THICKNESS_LABELS[value.toLowerCase()] ?? value,
  );
}

function legacySelection(garment: OutfitGarmentInput) {
  return {
    season: taxonomySeasonLabelsFromValues(valuesFrom(garment.seasons)),
    color: legacyColorValues(garment.color),
    occasion: valuesFrom(garment.sceneTags),
    style: valuesFrom(garment.styleTags),
    material: valuesFrom(garment.material),
    category: valuesFrom(garment.subcategory),
    thickness: legacyThicknessValues(garment.thickness),
    fit: valuesFrom(garment.fit),
  };
}

function validProfileTags(group: AiGarmentTagGroup, values: unknown): string[] {
  const tags = valuesFrom(values);
  if (group === 'fit') {
    return tags.filter((tag) => OBJECTIVE_FITS.has(tag));
  }
  if (group === 'colorFeeling') {
    return tags.filter((tag) => !SINGLE_GARMENT_COLOR_RELATIONS.has(tag));
  }
  return tags;
}

function normalizedGroupTags(
  group: AiGarmentTagGroup,
  selection: Record<string, unknown>,
): string[] {
  return validProfileTags(group, selection[group]);
}

export function buildOutfitGarmentProfile(
  input: unknown,
): OutfitGarmentProfile {
  const garment = (
    input && typeof input === 'object' ? input : {}
  ) as OutfitGarmentInput;
  const taxonomySelection = sanitizeGarmentTaxonomySelection(
    garment.taxonomyTags,
  );
  const legacyTags = sanitizeGarmentTaxonomySelection(legacySelection(garment));
  const tagsByGroup: Record<string, string[]> = {};
  const sourceByGroup: Record<string, OutfitTagSource> = {};

  for (const group of PROFILE_GROUPS) {
    const taxonomyTags = normalizedGroupTags(group, taxonomySelection);
    const legacyValues = normalizedGroupTags(group, legacyTags);
    const tags = taxonomyTags.length > 0 ? taxonomyTags : legacyValues;
    if (tags.length === 0) continue;

    tagsByGroup[group] = Array.from(new Set(tags));
    sourceByGroup[group] = taxonomyTags.length > 0 ? 'taxonomy' : 'legacy';
  }

  return {
    garmentId: garmentIdFrom(garment.id),
    tagsByGroup,
    sourceByGroup,
  };
}

function normalizedColor(value: string): GarmentColor | undefined {
  const trimmed = value.trim();
  const fromLabel = COLOR_LABEL_TO_VALUE[trimmed];
  if (fromLabel) return fromLabel;
  if ((Object.values(GarmentColor) as string[]).includes(trimmed)) {
    return trimmed as GarmentColor;
  }
  return undefined;
}

function colorPairKey(left: GarmentColor, right: GarmentColor): string {
  return [left, right].sort().join('|');
}

const CONTRAST_COLOR_PAIRS = new Set([
  colorPairKey(GarmentColor.RED, GarmentColor.GREEN),
  colorPairKey(GarmentColor.BLUE, GarmentColor.ORANGE),
  colorPairKey(GarmentColor.YELLOW, GarmentColor.PURPLE),
  colorPairKey(GarmentColor.BLACK, GarmentColor.WHITE),
]);

export function deriveOutfitColorRelations(
  profiles: readonly OutfitGarmentProfile[],
): OutfitColorRelation[] {
  const colors = profiles.flatMap((profile) =>
    (profile.tagsByGroup.color ?? [])
      .map((color) => normalizedColor(color))
      .filter((color): color is GarmentColor => Boolean(color)),
  );
  const relations = new Set<OutfitColorRelation>();

  for (let left = 0; left < colors.length; left += 1) {
    for (let right = left + 1; right < colors.length; right += 1) {
      if (colors[left] === colors[right]) {
        relations.add('同色系');
      } else if (
        CONTRAST_COLOR_PAIRS.has(colorPairKey(colors[left], colors[right]))
      ) {
        relations.add('撞色');
      }
    }
  }

  return Array.from(relations);
}
