# Dati: client HTTP, TanStack Query, errori

## Un solo client

`shared/api/http.ts` crea l'unica istanza (axios, o `HttpClient` in Angular): `baseURL` da `shared/config/env.ts` (default `/api`), `withCredentials: true`, XSRF, timeout, `Accept: application/json`. Gli interceptor gestiscono il 401 e trasformano ogni errore in `ApiError`:

```ts
class ApiError extends Error {
  status: number          // 0 per errori di rete/timeout
  code: string            // dal backend, es. 'ORDER_NOT_FOUND'
  correlationId?: string  // da mostrare all'utente e cercare nei log
  fieldErrors?: Record<string, string[]>
}
```

## Feature: api, queries, mutations

```text
features/orders/api/
├── orders.api.ts        ← funzioni che chiamano il client e fanno OrderSchema.parse(data)
├── orders.queries.ts    ← orderKeys + queryOptions/infiniteQueryOptions + hook/composable
└── orders.mutations.ts  ← create/update/delete con invalidazione o optimistic update
```

Chiavi da una factory, mai scritte a mano nei componenti:

```ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: PageParams & OrderFilters) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
}
```

Regole:
- `staleTime` > 0 di default; nessun retry sugli errori 4xx; al massimo 2 su rete/5xx.
- Ogni mutation dichiara cosa invalida. Le eliminazioni usano l'optimistic update con rollback in `onError`.
- Le liste usano la paginazione a cursore `{ items, nextCursor, limit }` (lo stesso contratto di kybes) con `useInfiniteQuery`; `limit`, `cursor` e `sort` fanno parte della chiave.
- Lo stato del server non si copia negli store client (Zustand, Pinia, signals, rune): gli store tengono solo stato di UI.

## Stati della vista

Ogni vista che legge dati mostra esplicitamente caricamento, errore (messaggio generico + `correlationId`, pulsante "riprova") e vuoto. Un error boundary per rotta raccoglie gli errori di rendering.
