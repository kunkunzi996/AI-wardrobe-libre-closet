import {
  buildOutfitGarmentProfile,
  deriveOutfitColorRelations,
} from './outfit-tag-profile';

const makeGarment = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 1,
    category: 'tops',
    ...overrides,
  }) as any;

describe('outfit garment tag profile', () => {
  it('prefers valid taxonomy values per group, removes duplicates, and records taxonomy sources', () => {
    const profile = buildOutfitGarmentProfile(
      makeGarment({
        color: 'black',
        seasons: ['winter'],
        sceneTags: ['约会'],
        styleTags: ['复古'],
        material: '羊毛',
        subcategory: '大衣',
        thickness: 'thick',
        fit: '宽松',
        taxonomyTags: {
          season: ['夏季', '夏季'],
          color: ['白色', '白色'],
          occasion: ['通勤', '通勤'],
          style: ['简约', '简约'],
          material: ['棉', '棉'],
          category: ['衬衫', '衬衫'],
          thickness: ['薄款', '薄款'],
          fit: ['宽松', '直筒', '直筒'],
          weather: ['夏热', '夏热'],
          colorFeeling: ['暖色', '暖色', '撞色', '同色系'],
          length: ['短款', '短款'],
          wearingFeel: ['舒适', '透气'],
        },
      }),
    );

    expect(profile).toEqual({
      garmentId: 1,
      tagsByGroup: {
        season: ['夏季'],
        weather: ['夏热'],
        color: ['白色'],
        colorFeeling: ['暖色'],
        occasion: ['通勤'],
        style: ['简约'],
        material: ['棉'],
        category: ['衬衫'],
        length: ['短款'],
        fit: ['直筒'],
        thickness: ['薄款'],
      },
      sourceByGroup: {
        season: 'taxonomy',
        weather: 'taxonomy',
        color: 'taxonomy',
        colorFeeling: 'taxonomy',
        occasion: 'taxonomy',
        style: 'taxonomy',
        material: 'taxonomy',
        category: 'taxonomy',
        length: 'taxonomy',
        fit: 'taxonomy',
        thickness: 'taxonomy',
      },
    });
    expect(profile.tagsByGroup).not.toHaveProperty('wearingFeel');
    expect(profile.tagsByGroup.fit).not.toEqual(
      expect.arrayContaining(['宽松', '修身', '合身']),
    );
  });

  it('falls back to the mapped legacy field only when that taxonomy group is absent', () => {
    const profile = buildOutfitGarmentProfile(
      makeGarment({
        color: 'black',
        seasons: ['winter', 'winter'],
        sceneTags: ['通勤', '通勤'],
        styleTags: ['法式', '法式'],
        material: '棉',
        subcategory: '衬衫',
        thickness: 'thin',
        fit: '直筒',
        taxonomyTags: {
          weather: ['夏热'],
          colorFeeling: ['冷色'],
          length: ['短款'],
        },
      }),
    );

    expect(profile.tagsByGroup).toEqual({
      season: ['冬季'],
      weather: ['夏热'],
      color: ['黑色'],
      colorFeeling: ['冷色'],
      occasion: ['通勤'],
      style: ['法式'],
      material: ['棉'],
      category: ['衬衫'],
      length: ['短款'],
      thickness: ['薄款'],
      fit: ['直筒'],
    });
    expect(profile.sourceByGroup).toEqual({
      season: 'legacy',
      weather: 'taxonomy',
      color: 'legacy',
      colorFeeling: 'taxonomy',
      occasion: 'legacy',
      style: 'legacy',
      material: 'legacy',
      category: 'legacy',
      length: 'taxonomy',
      thickness: 'legacy',
      fit: 'legacy',
    });
  });

  it('does not turn one garment colorFeeling hints into a fixed color relation', () => {
    const profile = buildOutfitGarmentProfile(
      makeGarment({
        color: 'black',
        taxonomyTags: {
          color: ['黑色'],
          colorFeeling: ['撞色', '同色系'],
        },
      }),
    );

    expect(profile.tagsByGroup.colorFeeling ?? []).toEqual([]);
    expect(deriveOutfitColorRelations([profile])).toEqual([]);
    expect(
      deriveOutfitColorRelations([
        buildOutfitGarmentProfile(
          makeGarment({
            id: 2,
            category: 'tops',
            taxonomyTags: {},
          }),
        ),
      ]),
    ).toEqual([]);
  });
});

describe('outfit color relations', () => {
  const profileFor = (id: number, color: string) =>
    buildOutfitGarmentProfile(
      makeGarment({
        id,
        category: 'tops',
        taxonomyTags: { color: [color] },
      }),
    );

  it('returns same-color relation only when two garments share a normalized color', () => {
    expect(
      deriveOutfitColorRelations([
        profileFor(1, '红色'),
        buildOutfitGarmentProfile(
          makeGarment({
            id: 2,
            category: 'bottoms',
            color: 'red',
            taxonomyTags: {},
          }),
        ),
      ]),
    ).toEqual(['同色系']);
  });

  it.each([
    ['红色', '绿色'],
    ['蓝色', '橙色'],
    ['黄色', '紫色'],
    ['黑色', '白色'],
  ])(
    'returns contrast relation for the explicit %s + %s pair',
    (left, right) => {
      expect(
        deriveOutfitColorRelations([profileFor(1, left), profileFor(2, right)]),
      ).toEqual(['撞色']);
    },
  );
});
