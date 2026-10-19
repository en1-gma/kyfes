---
paths:
  - "src/shared/**"
  - "src/app/shared/**"
  - "src/lib/shared/**"
---

# Regole per shared (kyfes)

- Solo le sottocartelle `api`, `auth`, `rbac`, `i18n`, `charts`, `ui`, `lib`, `config`: una nuova sottocartella va proposta all'utente.
- `shared` non importa mai da `features`, `pages` o `app`.
- Librerie confinate: client HTTP (axios e alternative) in `api`; CASL in `rbac`; libreria i18n in `i18n`; libreria di chart e i suoi wrapper in `charts`; sanitizer (DOMPurify e alternative) in `lib`. Le altre cartelle usano le loro ri-esportazioni.
- `ui`: componenti senza logica di business né chiamate di rete (tra cui `QueryState`, `LoadMore`, `ConfirmDeleteDialog`, da riusare nelle feature). `lib`: solo funzioni pure, con test.
- `rbac` è l'unico punto dove si interpretano le regole di permesso; nessun nome di ruolo hardcoded nemmeno qui (le regole arrivano dal server).
- Le costanti trasversali stanno **solo** in `config/constants.ts`: azioni RBAC e registro dei soggetti, endpoint di autenticazione, nomi di cookie e header, namespace comune, lingue, valuta, varianti dei pulsanti, tipi di grafico, flag di ambiente. `rbac/`, `api/`, `i18n/`, `ui/`, `charts/` le importano e, se fanno parte della loro API pubblica, le ri-esportano. Un nuovo valore trasversale nasce lì (regola `constants-location`).
