import {
  AI_GARMENT_FIT_TAGS,
  AI_GARMENT_TAG_TAXONOMY,
  GARMENT_TAG_TAXONOMY,
  filterAiGarmentTaxonomySelection,
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

  it('keeps the full taxonomy compatible with historical values', () => {
    expect(
      sanitizeGarmentTaxonomySelection({
        wearingFeel: ['舒适', '宽松'],
        fit: ['合身', '宽松'],
      }),
    ).toEqual({
      wearingFeel: ['舒适', '宽松'],
      fit: ['合身', '宽松'],
    });
  });

  it('defines an AI taxonomy without wearing feel and with objective fits only', () => {
    expect(AI_GARMENT_TAG_TAXONOMY).not.toHaveProperty('wearingFeel');
    expect(AI_GARMENT_TAG_TAXONOMY.fit).toEqual(AI_GARMENT_FIT_TAGS);
    expect(AI_GARMENT_TAG_TAXONOMY.fit).toEqual([
      '直筒',
      '廓形',
      'A字',
      'H型',
      'X型',
      'O型',
      '茧型',
      '喇叭',
    ]);
    expect(Object.keys(AI_GARMENT_TAG_TAXONOMY)).toEqual(
      Object.keys(GARMENT_TAG_TAXONOMY).filter(
        (group) => group !== 'wearingFeel',
      ),
    );
  });

  it('filters mixed AI tags and reports rejected values', () => {
    expect(
      filterAiGarmentTaxonomySelection({
        wearingFeel: ['舒适', '亲肤'],
        fit: ['宽松', 'A字', '直筒'],
        color: ['黑色'],
      }),
    ).toEqual({
      selection: {
        fit: ['A字', '直筒'],
        color: ['黑色'],
      },
      rejected: [
        { group: 'wearingFeel', tag: '舒适' },
        { group: 'wearingFeel', tag: '亲肤' },
        { group: 'fit', tag: '宽松' },
      ],
    });
  });

  it('handles JSON input, duplicates, malformed input, and bounded rejection logs', () => {
    expect(
      filterAiGarmentTaxonomySelection(
        JSON.stringify({
          fit: ['A字', 'A字', '紧身'],
          unknownGroup: ['x'.repeat(200), 'x'.repeat(200)],
        }),
      ),
    ).toEqual({
      selection: { fit: ['A字'] },
      rejected: [
        { group: 'fit', tag: '紧身' },
        { group: 'unknownGroup', tag: 'x'.repeat(80) },
      ],
    });
    expect(filterAiGarmentTaxonomySelection('{bad json')).toEqual({
      selection: {},
      rejected: [],
    });
    expect(filterAiGarmentTaxonomySelection(null)).toEqual({
      selection: {},
      rejected: [],
    });
  });
});
