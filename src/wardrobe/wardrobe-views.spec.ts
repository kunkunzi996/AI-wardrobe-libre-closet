import * as fs from 'fs';
import * as path from 'path';

describe('wardrobe views', () => {
  const readView = (name: string) =>
    fs.readFileSync(
      path.join(__dirname, '..', '..', 'views', 'wardrobe', name),
      'utf-8',
    );

  it('exposes wardrobe metadata fields on the garment form', () => {
    const form = readView('form.hbs');

    for (const field of [
      'subcategory',
      'seasons',
      'styleTags',
      'sceneTags',
      'material',
      'thickness',
      'fit',
      'status',
      'price',
      'purchaseDate',
      'purchaseChannel',
    ]) {
      expect(form).toContain(`name="${field}"`);
    }
  });

  it('exposes metadata filters and detail fields', () => {
    const index = readView('index.hbs');
    const show = readView('show.hbs');

    for (const field of ['status', 'season', 'style', 'scene']) {
      expect(index).toContain(`name="${field}"`);
    }

    for (const field of [
      'garment.status',
      'garment.seasons',
      'garment.styleTags',
      'garment.sceneTags',
      'garment.material',
      'garment.thickness',
      'garment.purchaseChannel',
      'garment.wearCount',
      'garment.lastWornDate',
    ]) {
      expect(show).toContain(field);
    }
  });
});
