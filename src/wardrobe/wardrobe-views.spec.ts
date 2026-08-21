import * as fs from 'fs';
import * as path from 'path';

describe('wardrobe views', () => {
  const readView = (name: string) =>
    fs.readFileSync(
      path.join(__dirname, '..', '..', 'views', 'wardrobe', name),
      'utf-8',
    );
  const readProjectView = (...segments: string[]) =>
    fs.readFileSync(
      path.join(__dirname, '..', '..', 'views', ...segments),
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
      'price',
      'purchaseDate',
      'purchaseChannel',
    ]) {
      expect(form).toContain(`name="${field}"`);
    }
    expect(form).not.toContain('name="status"');
  });

  it('renders localized option labels without changing submitted values', () => {
    const form = readView('form.hbs');

    expect(form).toContain('<select name="category"');
    expect(form).toContain('value="{{this.value}}"');
    expect(form).toContain('{{this.label}}');
    expect(form).toContain('{{#ifEquals this.value ../garment.color}}');
    expect(form).not.toContain('{{#ifEquals this.value ../garment.status}}');
  });

  it('exposes metadata filters and detail fields', () => {
    const index = readView('index.hbs');
    const show = readView('show.hbs');

    for (const field of ['season', 'style', 'scene']) {
      expect(index).toContain(`name="${field}"`);
    }

    expect(index).not.toContain('name="status"');
    expect(index).not.toContain('{{this.statusLabel}}');
    expect(show).not.toContain('{{statusLabel}}');
    expect(show).toContain('{{colorLabel}}');

    for (const field of [
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

  it('sends the homepage photo intake call to the AI photo flow', () => {
    const home = readProjectView('index.hbs');

    expect(home).toContain('href="/wardrobe/ai-intake"');
  });

  it('sends the desktop and drawer photo intake navigation to the AI photo flow', () => {
    const navbar = readProjectView('partials', 'navbar.hbs');

    expect(navbar).toContain('href="/wardrobe/ai-intake"');
    expect(navbar).not.toContain(
      'href="/wardrobe/new">{{t \'lang.PHOTO_INTAKE\'}}',
    );
  });

  it('offers both AI photo intake and manual entry from the empty wardrobe state', () => {
    const index = readView('index.hbs');

    expect(index).toContain('href="/wardrobe/ai-intake"');
    expect(index).toContain('href="/wardrobe/new"');
  });

  it('explains the AI photo intake confirmation flow in plain language', () => {
    const aiIntake = readView('ai-intake.hbs');

    expect(aiIntake).toContain('AI 会先草拟衣物信息');
  });

  it('omits inventory status from wardrobe and analytics pages', () => {
    const confirm = readView('ai-confirm.hbs');
    const analytics = readProjectView('analytics', 'index.hbs');

    expect(confirm).not.toContain('name="status"');
    expect(analytics).not.toContain('ANALYTICS_WEARABLE');
    expect(analytics).not.toContain('ANALYTICS_LAUNDRY');
  });
});
