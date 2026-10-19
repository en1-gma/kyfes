import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Runs against `npm run dev` with VITE_API_MOCKS=true (see playwright.config.ts): MSW plays the BFF.

test.describe('orders', () => {
  test('list, chart and accessibility (WCAG 2.2 AA)', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.getByRole('heading', { level: 1, name: 'Ordini' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Totale ordini per mese' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('manager creates an order', async ({ page }) => {
    await page.goto('/orders');
    await page.getByRole('link', { name: 'Nuovo ordine' }).click();
    await page.getByLabel('Cliente').fill('E2E S.r.l.');
    await page.getByLabel('Totale (EUR)').fill('99.90');
    await page.getByRole('button', { name: 'Salva' }).click();
    await expect(page.getByRole('heading', { name: /Ordine ORD-/ })).toBeVisible();
    await expect(page.getByText('E2E S.r.l.')).toBeVisible();
  });

  test('unknown route shows the not-found page', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible();
  });
});
