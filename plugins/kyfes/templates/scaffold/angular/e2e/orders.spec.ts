import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Ordini', () => {
  test('manager: lista, azioni CRUD e nessuna violazione axe', async ({ page }) => {
    await page.goto('/orders?mockUser=manager');
    await expect(page.getByRole('heading', { level: 1, name: 'Ordini' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuovo ordine' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Modifica ordine/ }).first()).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  test('viewer: nessuna azione di scrittura', async ({ page }) => {
    await page.goto('/orders?mockUser=viewer');
    await expect(page.getByRole('link', { name: /Apri ordine/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuovo ordine' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Elimina ordine/ })).toHaveCount(0);
  });

  test('viewer: la rotta di creazione mostra la pagina 403', async ({ page }) => {
    await page.goto('/orders/new?mockUser=viewer');
    await expect(page.getByRole('heading', { name: 'Accesso negato' })).toBeVisible();
    await expect(page).toHaveURL(/\/orders\/new/);
  });

  test('form: validazione Zod e creazione', async ({ page }) => {
    await page.goto('/orders/new?mockUser=manager');
    await page.getByRole('button', { name: 'Crea ordine' }).click();
    await expect(page.getByText('Il cliente è obbligatorio.')).toBeVisible();
    await page.getByLabel('Cliente').fill('ACME S.r.l.');
    await page.getByLabel('Totale (EUR)').fill('120.50');
    await page.getByRole('button', { name: 'Crea ordine' }).click();
    await expect(page.getByRole('heading', { name: /Ordine ORD-/ })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
