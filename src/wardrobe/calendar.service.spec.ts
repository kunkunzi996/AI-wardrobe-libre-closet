import { Collection } from '@mikro-orm/core';
import { Garment } from '../dal/entity/garment.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  const makeService = (entry?: OutfitCalendar) => {
    const entityManager = {
      persistAndFlush: jest.fn(),
      flush: jest.fn(),
      removeAndFlush: jest.fn(),
    };
    const calendarRepository = {
      create: jest.fn((data: Partial<OutfitCalendar>) =>
        Object.assign(new OutfitCalendar(), data),
      ),
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => entry ?? null),
      getEntityManager: jest.fn(() => entityManager),
    };
    const outfitRepository = {
      find: jest.fn(async () => []),
      findOne: jest.fn(),
    };
    const userRepository = {
      findOneOrFail: jest.fn(),
    };

    const service = new CalendarService(
      calendarRepository as any,
      outfitRepository as any,
      userRepository as any,
    );

    return { service, calendarRepository, outfitRepository, entityManager };
  };

  const makeEntryWithGarments = () => {
    const jacket = Object.assign(new Garment(), {
      id: 1,
      category: 'outerwear',
      wearCount: 2,
    });
    const shoes = Object.assign(new Garment(), {
      id: 2,
      category: 'footwear',
      wearCount: 0,
    });
    const outfit = Object.assign(new Outfit(), { id: 10 });
    outfit.garments = new Collection<Garment>(outfit, [jacket, shoes]);
    const entry = Object.assign(new OutfitCalendar(), {
      id: 99,
      outfit: { unwrap: () => outfit },
      wornAt: undefined,
    });
    return { entry, jacket, shoes };
  };

  it('creates calendar entries with daily outfit record fields', async () => {
    const { service, outfitRepository, calendarRepository } = makeService();
    const outfit = Object.assign(new Outfit(), { id: 1 });
    outfitRepository.findOne.mockResolvedValue(outfit);

    const entry = await service.create({
      date: new Date('2026-05-27'),
      outfitId: 1,
      scene: '通勤',
      weather: '晴',
      temperature: '24C',
      rating: '5',
      feedback: '舒服',
      complimented: 'on',
      notes: '白衬衫很好用',
    });

    expect(calendarRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scene: '通勤',
        weather: '晴',
        temperature: '24C',
        rating: 5,
        feedback: '舒服',
        complimented: true,
      }),
    );
    expect(entry.notes).toBe('白衬衫很好用');
  });

  it('reuses an existing calendar entry for the same outfit on the same day', async () => {
    const { service, outfitRepository, calendarRepository, entityManager } =
      makeService();
    const outfit = Object.assign(new Outfit(), { id: 1 });
    const existing = {
      id: 7,
      date: new Date('2026-05-27T00:00:00.000Z'),
      outfit,
    } as OutfitCalendar;
    outfitRepository.findOne.mockResolvedValue(outfit);
    calendarRepository.findOne.mockResolvedValue(existing);

    const entry = await service.create({
      date: new Date('2026-05-27T12:30:00.000Z'),
      outfitId: 1,
    });

    expect(entry.id).toBe(existing.id);
    expect(calendarRepository.create).not.toHaveBeenCalled();
    expect(entityManager.persistAndFlush).not.toHaveBeenCalled();
    const duplicateQuery = calendarRepository.findOne.mock.calls[0][0];
    expect(duplicateQuery).toEqual(expect.objectContaining({ outfit }));
    expect(
      duplicateQuery.date.$lt.getTime() - duplicateQuery.date.$gte.getTime(),
    ).toBe(24 * 60 * 60 * 1000);
  });

  it('marks worn and updates garment usage without decrementing on unmark', async () => {
    const { entry, jacket, shoes } = makeEntryWithGarments();
    const { service, entityManager } = makeService(entry);

    const wornEntry = await service.toggleWorn(99);

    expect(wornEntry.wornAt).toBeInstanceOf(Date);
    expect(jacket.wearCount).toBe(3);
    expect(shoes.wearCount).toBe(1);
    expect(jacket.lastWornDate).toBe(wornEntry.wornAt);
    expect(shoes.lastWornDate).toBe(wornEntry.wornAt);

    await service.toggleWorn(99);

    expect(entry.wornAt).toBeUndefined();
    expect(jacket.wearCount).toBe(3);
    expect(shoes.wearCount).toBe(1);
    expect(entityManager.flush).toHaveBeenCalledTimes(2);
  });
});
