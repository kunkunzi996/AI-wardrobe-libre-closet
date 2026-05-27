import * as fs from 'fs';
import * as path from 'path';

describe('calendar views', () => {
  const calendarView = () =>
    fs.readFileSync(
      path.join(__dirname, '..', '..', 'views', 'calendar', 'index.hbs'),
      'utf-8',
    );

  it('exposes daily outfit record fields on the calendar page', () => {
    const view = calendarView();

    for (const field of [
      'scene',
      'weather',
      'temperature',
      'rating',
      'feedback',
      'complimented',
      'notes',
    ]) {
      expect(view).toContain(`name="${field}"`);
    }

    expect(view).toContain("{{t 'lang.SELECT_AN_OUTFIT'}}");
  });
});
