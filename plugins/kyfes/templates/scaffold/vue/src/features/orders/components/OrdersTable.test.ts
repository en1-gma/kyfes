import { screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { sessions } from '@/mocks/data'
import { renderWithProviders } from '@/test/render'
import OrdersTable from './OrdersTable.vue'

const props = { detailTo: () => '/orders/x', editTo: () => '/orders/x/edit' }

async function rows() {
  const table = await screen.findByRole('table')
  return within(table).getAllByRole('row').slice(1)
}

describe('OrdersTable RBAC', () => {
  it('manager sees Edit/Delete on editable orders, not on shipped ones', async () => {
    await renderWithProviders(OrdersTable, { session: sessions.manager, props })
    const body = await rows()
    expect(body.length).toBeGreaterThan(0)
    expect(screen.getByRole('columnheader', { name: 'Azioni' })).toBeInTheDocument()

    const draft = body.find((r) => within(r).queryByText('Bozza'))
    const shipped = body.find((r) => within(r).queryByText('Spedito'))
    expect(draft && within(draft).getByRole('link', { name: /Modifica l'ordine/ })).toBeTruthy()
    expect(draft && within(draft).getByRole('button', { name: /Elimina l'ordine/ })).toBeTruthy()
    expect(shipped && within(shipped).queryByRole('link', { name: /Modifica/ })).toBeNull()
    expect(shipped && within(shipped).queryByRole('button', { name: /Elimina/ })).toBeNull()
  })

  it('viewer sees no actions column and no Edit/Delete', async () => {
    await renderWithProviders(OrdersTable, { session: sessions.viewer, props })
    await rows()
    expect(screen.queryByRole('columnheader', { name: 'Azioni' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Modifica/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Elimina/ })).toBeNull()
  })
})

describe('OrdersTable accessibility', () => {
  it('the sort button accessible name contains its visible text (WCAG 2.5.3)', async () => {
    await renderWithProviders(OrdersTable, { session: sessions.viewer, props })
    await rows()
    const sort = screen.getByRole('button', { name: /^Creato il/ })
    expect(sort).toHaveTextContent('Creato il')
  })

  it('announces the loaded count', async () => {
    await renderWithProviders(OrdersTable, { session: sessions.viewer, props })
    await rows()
    expect(screen.getByText('20 ordini')).toHaveAttribute('aria-live', 'polite')
  })
})
