import { Garment } from '../../dal/entity/garment.entity';
import { GarmentStatus } from '../garment-status.enum';
import {
  DEMAND_CONFLICT_CAUTION,
  demandConflictCautions,
  filterCandidateWardrobe,
} from './outfit-candidate-filter';

describe('filterCandidateWardrobe', () => {
  const makeGarment = (data: Partial<Garment>) =>
    Object.assign(new Garment(), {
      status: GarmentStatus.Wearable,
      ...data,
    });

  const weather = (minC: number, maxC: number) =>
    ({
      status: 'available' as const,
      city: '上海市',
      currentC: 20,
      hourly: [],
      minC,
      maxC,
    }) as const;

  it('keeps unlabeled color when the request does not mention color', () => {
    const unlabeled = makeGarment({
      id: 1,
      category: 'tops',
      name: '未标色上衣',
    });
    expect(
      filterCandidateWardrobe({
        garments: [unlabeled],
        requestText: '今天穿什么',
      }).map((garment) => garment.id),
    ).toEqual([1]);
  });

  it('drops unlabeled and non-black garments when the request requires black', () => {
    const unlabeled = makeGarment({ id: 1, category: 'tops', name: '未标色' });
    const black = makeGarment({
      id: 2,
      category: 'tops',
      name: '黑T',
      color: 'black' as any,
    });
    const white = makeGarment({
      id: 3,
      category: 'tops',
      name: '白T',
      color: 'white' as any,
    });
    expect(
      filterCandidateWardrobe({
        garments: [unlabeled, black, white],
        requestText: '只要黑色',
      }).map((garment) => garment.id),
    ).toEqual([2]);
  });

  it('keeps red or black garments for 红配黑 without requiring both on one piece', () => {
    const red = makeGarment({
      id: 1,
      category: 'dresses',
      name: '红裙',
      color: 'red' as any,
    });
    const black = makeGarment({
      id: 2,
      category: 'footwear',
      name: '黑鞋',
      color: 'black' as any,
    });
    const blue = makeGarment({
      id: 3,
      category: 'tops',
      name: '蓝衬衫',
      color: 'blue' as any,
    });
    expect(
      filterCandidateWardrobe({
        garments: [red, black, blue],
        requestText: '红配黑',
      }).map((garment) => garment.id),
    ).toEqual([1, 2]);
  });

  it('excludes dresses and 半身裙 but not pants for 不要裙子', () => {
    const dress = makeGarment({ id: 1, category: 'dresses', name: '连衣裙' });
    const skirt = makeGarment({
      id: 2,
      category: 'bottoms',
      name: '半身裙',
      taxonomyTags: { category: ['半身裙'] },
    });
    const pants = makeGarment({ id: 3, category: 'bottoms', name: '长裤' });
    expect(
      filterCandidateWardrobe({
        garments: [dress, skirt, pants],
        requestText: '不要裙子',
      }).map((garment) => garment.id),
    ).toEqual([3]);
  });

  it('keeps the core even when it conflicts, and reports a demand conflict caution', () => {
    const dress = makeGarment({
      id: 8,
      category: 'dresses',
      name: '红裙',
      color: 'red' as any,
    });
    const blackShoes = makeGarment({
      id: 9,
      category: 'footwear',
      name: '黑鞋',
      color: 'black' as any,
    });
    const whiteBag = makeGarment({
      id: 10,
      category: 'bags',
      name: '白包',
      color: 'white' as any,
    });
    expect(
      filterCandidateWardrobe({
        garments: [dress, blackShoes, whiteBag],
        core: dress,
        requestText: '配黑色',
      }).map((garment) => garment.id),
    ).toEqual([8, 9]);
    expect(demandConflictCautions(dress, '配黑色')).toEqual([
      DEMAND_CONFLICT_CAUTION,
    ]);
    expect(demandConflictCautions(dress, '不要裙子')).toEqual([
      DEMAND_CONFLICT_CAUTION,
    ]);
  });

  it('drops thick non-core garments above 25℃ unless the user asks to stay warm', () => {
    const shoes = makeGarment({ id: 1, category: 'footwear', name: '凉鞋' });
    const coat = makeGarment({
      id: 2,
      category: 'outerwear',
      name: '厚外套',
      taxonomyTags: { thickness: ['厚款'] },
    });
    expect(
      filterCandidateWardrobe({
        garments: [shoes, coat],
        temperatureContext: weather(18, 25.1),
      }).map((garment) => garment.id),
    ).toEqual([1]);
    expect(
      filterCandidateWardrobe({
        garments: [shoes, coat],
        requestText: '我要保暖',
        temperatureContext: weather(18, 25.1),
      }).map((garment) => garment.id),
    ).toEqual([1, 2]);
  });
});
