import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { createDb, sessions } from '@/mocks/data'
import { renderWithProviders } from '@/test/render'
import OrderEditPage from './OrderEditPage.vue'

// The default mock server serves the orders of createDb().
const orders = createDb().orders

describe('OrderEditPage record-level permission', () => {
  it('operator gets "not authorized" on an order that is not a draft', async () => {
    const confirmed = orders.find((o) => o.status === 'confirmed')
    await renderWithProviders(OrderEditPage, { session: sessions.operator, props: { id: confirmed?.id } })
    expect(await screen.findByRole('heading', { name: 'Accesso non autorizzato' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salva' })).toBeNull()
  })

  it('operator can edit a draft', async () => {
    const draft = orders.find((o) => o.status === 'draft')
    await renderWithProviders(OrderEditPage, { session: sessions.operator, props: { id: draft?.id } })
    expect(await screen.findByRole('button', { name: 'Salva' })).toBeInTheDocument()
  })
})
