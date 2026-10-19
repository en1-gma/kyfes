# Dati: client HTTP, TanStack Query, errori

## Un solo client

`shared/api/http.ts` crea l'unica istanza (axios, o `HttpClient` in Angular): `baseURL` da `shared/config/env.ts` (default `/api`), `withCredentials: true`, XSRF, timeout, `Accept: application/json`. Gli interceptor gestiscono il 401 (refresh single-flight, vedi [sicurezza](sicurezza.md)), lasciano passare invariate le richieste annullate (`AbortSignal` di TanStack Query) e trasformano ogni altro errore in `ApiError`:

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
└── orders.mutations.ts  ← create (POST) / update (PATCH) / delete con invalidazione o optimistic update
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
- `staleTime` > 0 di default; retry solo per `ApiError` con `status` 0 (rete/timeout) o >= 500, al massimo 2; mai su 4xx, su una risposta che non passa lo schema Zod o su errori di programmazione. Le mutation non ritentano.
- Ogni mutation dichiara cosa invalida. Create e update inviano solo i campi che l'utente può scrivere (`can(ACTIONS.update, orderSubject(order), field)` per ogni campo di `ORDER_EDITABLE_FIELDS` nello scaffold React; negli altri framework le costanti equivalenti, vedi `references/<framework>.md`); l'update è un `PATCH`.
- Le eliminazioni usano l'optimistic update, sicuro anche con più delete in volo: `mutationKey` condivisa, lo snapshot si ripristina in `onError` solo se è l'ultima delete in corso (altrimenti le liste sono marcate da rifare), il dettaglio si toglie dalla cache solo a eliminazione riuscita, liste e statistiche si invalidano quando finisce l'ultima.
- Le liste usano la paginazione a cursore `{ items, nextCursor, limit }` (lo stesso contratto di kybes) con `useInfiniteQuery`; `limit`, `cursor` e `sort` fanno parte della chiave.
- Lo stato del server non si copia negli store client (Zustand, Pinia, signals, rune): gli store tengono solo stato di UI.

## Stati della vista

Ogni vista che legge dati mostra esplicitamente caricamento, errore (messaggio generico + `correlationId`, pulsante "riprova"; su 403 "non autorizzato") e vuoto. Un error boundary per rotta raccoglie gli errori di rendering.

Gli scaffold lo fanno con componenti di `shared/ui` da riusare in ogni feature: `QueryState` (caricamento → errore → vuoto → contenuto), `LoadMore` (conteggio + "carica altri" finché c'è `nextCursor`) e `ConfirmDeleteDialog` (conferma legata al record da eliminare). Riusarli invece di ricopiare il markup della feature `orders` evita anche la regola `duplicates`.
