# RBAC sul CRUD con CASL

## Da dove arrivano i permessi

`GET /api/auth/me` restituisce `rules`: regole CASL già calcolate dal server per l'utente (ruoli, tenant, attributi). `shared/rbac` le trasforma in una `Ability` e la ricostruisce quando cambia la sessione. Il frontend non conosce i ruoli: conosce solo azioni e soggetti.

Lo schema della sessione è tollerante: una regola con azione o soggetto che il client non conosce viene accettata ma non fa match (non concede nulla), e un `locale` non valido (o `null`) diventa `undefined` (negli scaffold con lingue fisse anche un `locale` non supportato); così un backend più nuovo non invalida la sessione.

```json
{
  "user": { "id": "…", "name": "Ada", "email": "ada@example.com" },
  "locale": "it",
  "rules": [
    { "action": "read", "subject": "Order" },
    { "action": "update", "subject": "Order", "conditions": { "status": "draft" } },
    { "action": "update", "subject": "Order", "fields": ["status"], "inverted": true },
    { "action": "delete", "subject": "Order", "conditions": { "status": "draft" } }
  ]
}
```

## Matrice CRUD

| Elemento | Permesso | Comportamento se negato |
|---|---|---|
| rotta lista/dettaglio | `read` soggetto | pagina 403 (non un redirect silenzioso) |
| voce di menu | `read` soggetto | nascosta |
| pulsante "Nuovo", rotta di creazione | `create` soggetto | nascosto / 403 |
| azione "Modifica" sulla riga | `update` su `subject('Order', order)` | nascosta |
| rotta di modifica | `update` sul soggetto, poi sul record caricato | "non autorizzato", nessun form |
| azione "Elimina" sulla riga | `delete` su `subject('Order', order)` | nascosta |
| campo del form | `update` con campo (`can('update', order, 'status')`) | sola lettura, e il campo non viene inviato (create e `PATCH` contengono solo i campi scrivibili) |
| colonna con dati sensibili | `read` con campo | colonna nascosta |

Il server resta l'autorità: ogni chiamata è comunque autorizzata dal backend. Un 403 mostra "non autorizzato" e invalida la sessione, perché i permessi potrebbero essere cambiati.

## Binding per framework

| Framework | Componente / direttiva | Funzione |
|---|---|---|
| React, Next.js | `<Can I="delete" this={subject('Order', order)}>` (`@casl/react`) | `useAbility()` |
| Vue | `<Can>` / `$can` (`@casl/vue`) | `useAbility()` |
| Angular | pipe `able`/`ablePure` (`@casl/angular`) | `inject(AppAbility)` |
| SvelteKit | componente `Can.svelte` di `shared/rbac` | `can()` dallo store |

## Vietato

`role === 'admin'`, `roles.includes('manager')`, `isAdmin`, `hasRole('…')`: gli hook li rifiutano fuori da `shared/rbac`, e anche lì i nomi dei ruoli non compaiono perché le regole arrivano già risolte dal server.

## Test

Per ogni feature: la stessa vista renderizzata con almeno due profili mostra e nasconde le azioni CRUD attese, e i campi negati sono in sola lettura e assenti dal payload. Negli scaffold i profili sono *manager*, *viewer* e *operator* (modifica solo gli ordini in bozza e solo alcuni campi); i mock MSW applicano le stesse condizioni e gli stessi permessi per campo e rispondono 403, così i test verificano anche ciò che il server rifiuterebbe.
