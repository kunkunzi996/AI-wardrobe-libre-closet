import {
  GARMENT_TAG_TAXONOMY,
  sanitizeGarmentTaxonomySelection,
} from './garment-tag-taxonomy';

describe('garment tag taxonomy', () => {
  it('contains the approved groups and excludes feedback', () => {
    expect(Object.keys(GARMENT_TAG_TAXONOMY)).toEqual([
      'season',
      'weather',
      'thickness',
      'color',
      'colorFeeling',
      'occasion',
      'style',
      'wearingFeel',
      'material',
      'category',
      'length',
      'fit',
    ]);
    expect(GARMENT_TAG_TAXONOMY).not.toHaveProperty('feedback');
  });

  it('keeps only approved tags, removes duplicates, and ignores unknown groups', () => {
    expect(
      sanitizeGarmentTaxonomySelection({
        color: ['黑色', '透明色', '黑色'],
        colorFeeling: ['暖色', '赛博朋克'],
        occasion: '通勤、外太空',
        feedback: ['喜欢'],
      }),
    ).toEqual({
      color: ['黑色'],
      colorFeeling: ['暖色'],
      occasion: ['通勤'],
    });
  });

  it('accepts a JSON string from mini-program multipart uploads', () => {
    expect(
      sanitizeGarmentTaxonomySelection(
        JSON.stringify({
          season: ['春季'],
          style: ['简约'],
          length: ['常规'],
        }),
      ),
    ).toEqual({
      season: ['春季'],
      style: ['简约'],
      length: ['常规'],
    });
  });

  it('returns an empty selection for malformed input', () => {
    expect(sanitizeGarmentTaxonomySelection('{bad json')).toEqual({});
    expect(sanitizeGarmentTaxonomySelection(null)).toEqual({});
  });
});
