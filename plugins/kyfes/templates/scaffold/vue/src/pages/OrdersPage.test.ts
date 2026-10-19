import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { sessions } from '@/mocks/data'
import { renderWithProviders } from '@/test/render'
import OrdersPage from './OrdersPage.vue'

// The chart (ECharts/canvas) is not under test here.
const stubs = { OrdersChart: true }

describe('OrdersPage RBAC', () => {
  it('manager sees the "New order" button and row actions', async () => {
    await renderWithProviders(OrdersPage, { session: sessions.manager, stubs })
    expect(screen.getByRole('link', { name: 'Nuovo ordine' })).toBeInTheDocument()
    expect((await screen.findAllByRole('button', { name: /Elimina l'ordine/ })).length).toBeGreaterThan(0)
  })

  it('viewer sees the list but no create/edit/delete', async () => {
    await renderWithProviders(OrdersPage, { session: sessions.viewer, stubs })
    await screen.findByRole('table')
    expect(screen.queryByRole('link', { name: 'Nuovo ordine' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Elimina/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Modifica/ })).toBeNull()
  })

  it('shows a generic error with correlationId when the list fails', async () => {
    const { server } = await import('@/mocks/node')
    const { http } = await import('msw/http')
    const { errorBody } = await import('@/mocks/handlers')
    server.use(http.get('/api/orders', () => errorBody(500)))
    await renderWithProviders(OrdersPage, { session: sessions.viewer, stubs })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Si è verificato un errore')
    expect(alert).toHaveTextContent('mock-500-0001')
  })
})
