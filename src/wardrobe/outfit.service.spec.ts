import { OutfitService } from './outfit.service';

describe('OutfitService', () => {
  const makeService = () =>
    new OutfitService(
      null as any,
      null as any,
      null as any,
      null as any,
    );

  describe('parseSlotsFromBody', () => {
    it('parses comma-joined repeated fields into multiple outfit slots', () => {
      const service = makeService();

      const slots = service.parseSlotsFromBody('tops,bags', '2,1');

      expect(slots).toEqual([
        { category: 'tops', garmentId: 2 },
        { category: 'bags', garmentId: 1 },
      ]);
    });
  });
});
