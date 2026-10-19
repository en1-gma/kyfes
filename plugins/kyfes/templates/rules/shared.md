---
paths:
  - "src/shared/**"
  - "src/app/shared/**"
  - "src/lib/shared/**"
---

# Regole per shared (kyfes)

- Solo le sottocartelle `api`, `auth`, `rbac`, `i18n`, `charts`, `ui`, `lib`, `config`: una nuova sottocartella va proposta all'utente.
- `shared` non importa mai da `features`, `pages` o `app`.
- Librerie confinate: client HTTP in `api`; CASL in `rbac`; libreria i18n in `i18n`; libreria di chart in `charts`; DOMPurify in `lib`. Le altre cartelle usano le loro ri-esportazioni.
- `ui`: componenti senza logica di business né chiamate di rete. `lib`: solo funzioni pure, con test.
- `rbac` è l'unico punto dove si interpretano le regole di permesso; nessun nome di ruolo hardcoded nemmeno qui (le regole arrivano dal server).
