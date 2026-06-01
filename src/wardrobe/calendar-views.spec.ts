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

  it('shows save feedback and disables repeated calendar submissions', () => {
    const view = calendarView();

    expect(view).toContain('hx-post="/calendar"');
    expect(view).toContain('hx-swap="none"');
    expect(view).toContain('set btn.disabled to true');
    expect(view).toContain('hx-on::after-request');
    expect(view).toContain(
      "window.location.href = event.detail.xhr.getResponseHeader('HX-Redirect')",
    );
    expect(view).toContain('hx-on::response-error');
    expect(view).toContain(
      "this.querySelector('button[type=submit]').disabled = false",
    );
    expect(view).toContain("set btn.innerText to '保存中...'");
    expect(view).toContain('{{#if saved}}');
    expect(view).toContain("{{t 'lang.CALENDAR_OUTFIT_ADDED'}}");
  });
});
