import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('orders', () => {
	test('manager sees the list, the chart and the CRUD actions; page is accessible', async ({
		page
	}) => {
		await page.goto('/orders?mockUser=manager');
		await expect(page.getByRole('heading', { level: 1, name: 'Ordini' })).toBeVisible();
		await expect(page.getByRole('img', { name: /Totale ordini per mese/ })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Nuovo ordine' })).toBeVisible();
		await expect(page.getByRole('button', { name: /Elimina l'ordine/ }).first()).toBeVisible();

		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
			.analyze();
		expect(results.violations).toEqual([]);
	});

	test('viewer has no CRUD actions', async ({ page }) => {
		await page.goto('/orders?mockUser=viewer');
		await expect(page.getByRole('heading', { level: 1, name: 'Ordini' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Nuovo ordine' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Elimina l'ordine/ })).toHaveCount(0);
	});

	test('viewer gets the 403 page on /orders/new', async ({ page }) => {
		await page.goto('/orders/new?mockUser=viewer');
		await expect(page.getByRole('heading', { name: 'Accesso non autorizzato' })).toBeVisible();
	});
});
