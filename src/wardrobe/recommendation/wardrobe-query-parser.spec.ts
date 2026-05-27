import { parseWardrobeQuery } from './wardrobe-query-parser';

describe('parseWardrobeQuery', () => {
  it('maps Chinese outfit request words into wardrobe filters', () => {
    expect(parseWardrobeQuery('今天想穿黑色系')).toEqual(
      expect.objectContaining({
        colors: ['black'],
        styles: [],
        scenes: [],
        seasons: [],
        excludedCategories: [],
      }),
    );

    expect(parseWardrobeQuery('法式一点，今天通勤但不要太正式')).toEqual(
      expect.objectContaining({
        colors: [],
        styles: ['法式'],
        scenes: ['通勤'],
        keywords: ['不要太正式'],
      }),
    );
  });

  it('detects exclusion and weather intent words', () => {
    expect(parseWardrobeQuery('下雨天不想穿裙子')).toEqual(
      expect.objectContaining({
        excludedCategories: ['dresses', 'bottoms'],
        keywords: ['下雨'],
      }),
    );
  });
});
