import { fireEvent, screen, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { createDb, sessions } from '@/mocks/data'
import { createHandlers } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { renderWithProviders } from '@/test/render'
import OrderForm from './OrderForm.vue'

/** Records the JSON bodies the form sends. */
function captureBodies(method: 'post' | 'patch', path: string) {
  const bodies: unknown[] = []
  server.events.on('request:start', async ({ request }) => {
    if (request.method === method.toUpperCase() && new URL(request.url).pathname.startsWith(path)) {
      bodies.push(await request.clone().json())
    }
  })
  return bodies
}

describe('OrderForm field-level permissions', () => {
  it('operator: create never sends the status', async () => {
    server.use(...createHandlers('operator'))
    const bodies = captureBodies('post', '/api/orders')
    const { emitted } = await renderWithProviders(OrderForm, { session: sessions.operator })
    expect(screen.getByLabelText('Stato')).toBeDisabled()
    await fireEvent.update(screen.getByLabelText('Cliente'), 'Cliente Operatore')
    await fireEvent.update(screen.getByLabelText('Totale'), '12')
    await fireEvent.click(screen.getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(emitted().saved).toBeTruthy())
    expect(bodies).toEqual([{ customerName: 'Cliente Operatore', total: 12 }])
    server.events.removeAllListeners()
  })

  it('operator: update of a draft sends only the writable fields', async () => {
    const db = createDb()
    server.use(...createHandlers('operator', db))
    const draft = db.orders.find((o) => o.status === 'draft')
    const bodies = captureBodies('patch', '/api/orders/')
    const { emitted } = await renderWithProviders(OrderForm, {
      session: sessions.operator,
      props: { order: draft },
    })
    await fireEvent.update(screen.getByLabelText('Cliente'), 'Rinominato')
    await fireEvent.click(screen.getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(emitted().saved).toBeTruthy())
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).not.toHaveProperty('status')
    expect(bodies[0]).toMatchObject({ customerName: 'Rinominato' })
    server.events.removeAllListeners()
  })
})

describe('OrderForm server errors', () => {
  const fill = async () => {
    await fireEvent.update(screen.getByLabelText('Cliente'), 'Cliente')
    await fireEvent.click(screen.getByRole('button', { name: 'Salva' }))
  }

  it('shows server field messages as text next to the field', async () => {
    server.use(
      http.post('/api/orders', () =>
        HttpResponse.json(
          { code: 'VALIDATION', message: 'x', fieldErrors: { customerName: ['Cliente già esistente'] } },
          { status: 422 },
        ),
      ),
    )
    await renderWithProviders(OrderForm, { session: sessions.manager })
    await fill()
    expect(await screen.findByText('Cliente già esistente')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('field errors on keys that are not form fields fall back to the generic error', async () => {
    server.use(
      http.post('/api/orders', () =>
        HttpResponse.json(
          { code: 'VALIDATION', message: 'x', fieldErrors: { warehouse: ['closed'] } },
          { status: 422 },
        ),
      ),
    )
    await renderWithProviders(OrderForm, { session: sessions.manager })
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent('Si è verificato un errore')
  })
})
