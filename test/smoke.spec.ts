import { test, expect } from '@playwright/test';

const APP_NAME = process.env.APP_NAME || 'Boilerplate';

test.use({ locale: 'zh-CN' });

test('homepage loads with APP_NAME title and version', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('/');
  await expect(page.locator('body')).toContainText(APP_NAME);
  expect(
    consoleErrors,
    `Console errors found:\n${consoleErrors.join('\n')}`,
  ).toHaveLength(0);
});

test('homepage presents Chinese wardrobe product entry points', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('body')).toContainText('我的衣橱');
  await expect(page.locator('body')).toContainText('拍照入库');
  await expect(page.locator('body')).toContainText('AI搭配');
  await expect(page.locator('body')).toContainText('今日穿搭');
});
