import { render, screen } from '@testing-library/vue'
import { beforeAll, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api'
import { i18n, setLocale } from '@/shared/i18n'
import ErrorState from './ErrorState.vue'

const renderError = (error: unknown) => render(ErrorState, { props: { error }, global: { plugins: [i18n] } })

describe('ErrorState', () => {
  beforeAll(() => setLocale('it'))

  it('403 says "not authorized", not the generic error', () => {
    renderError(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'x', correlationId: 'c-403' }))
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Non hai i permessi per questa operazione.')
    expect(alert).not.toHaveTextContent('Si è verificato un errore')
    expect(alert).toHaveTextContent('c-403')
  })

  it('other errors get the generic message, never the backend text', () => {
    renderError(new ApiError({ status: 500, code: 'INTERNAL', message: 'db down' }))
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Si è verificato un errore')
    expect(alert).not.toHaveTextContent('db down')
  })
})
