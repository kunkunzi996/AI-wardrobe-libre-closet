import { Collection } from '@mikro-orm/core';
import { Outfit } from '../dal/entity/outfit.entity';
import { Garment } from '../dal/entity/garment.entity';
import { OutfitController } from './outfit.controller';

describe('OutfitController', () => {
  it('returns outfit garments as a plain array for the detail template', async () => {
    const shirt = Object.assign(new Garment(), {
      id: 1,
      name: 'Black shirt',
    });
    const outfit = Object.assign(new Outfit(), { id: 10, name: 'Work outfit' });
    outfit.garments = new Collection<Garment>(outfit, [shirt]);
    const controller = new OutfitController(
      { findOne: jest.fn().mockResolvedValue(outfit) } as any,
      null as any,
      null as any,
      null as any,
    );

    const result = await controller.show(10, {} as any);

    expect(result.outfit.garments).toEqual([shirt]);
  });
});
