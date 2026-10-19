import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Runs against `npm run dev` with NEXT_PUBLIC_API_MOCKS=true (MSW, user "manager").
test.describe('orders', () => {
  test('list page renders, is accessible and sends a nonce-based CSP', async ({ page }) => {
    const response = await page.goto('/orders');
    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("frame-ancestors 'none'");

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('manager can open the new order form', async ({ page }) => {
    await page.goto('/orders');
    await page.getByRole('link', { name: /nuovo ordine|new order/i }).click();
    await expect(page).toHaveURL(/\/orders\/new$/);
    await expect(page.getByRole('textbox').first()).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
