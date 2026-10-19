import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
}

test.describe('orders (manager, mocked API)', () => {
  test('list, chart and accessibility', async ({ page }) => {
    await page.goto('/orders')
    await expect(page.getByRole('heading', { level: 1, name: 'Ordini' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Totale ordini per mese' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Nuovo ordine' })).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('create an order', async ({ page }) => {
    await page.goto('/orders/new')
    await page.getByLabel('Cliente').fill('Cliente E2E')
    await page.getByLabel('Totale').fill('123.45')
    await page.getByRole('button', { name: 'Salva' }).click()
    await expect(page.getByRole('heading', { name: /Ordine ORD-/ })).toBeVisible()
    await expect(page.getByText('Cliente E2E')).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('validation errors are announced next to the fields', async ({ page }) => {
    await page.goto('/orders/new')
    await page.getByRole('button', { name: 'Salva' }).click()
    await expect(page.getByText('Campo obbligatorio')).toBeVisible()
    await expect(page.getByLabel('Cliente')).toHaveAttribute('aria-invalid', 'true')
  })

  test('unknown route shows the 404 page', async ({ page }) => {
    await page.goto('/does-not-exist')
    await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible()
    await expectNoA11yViolations(page)
  })
})
