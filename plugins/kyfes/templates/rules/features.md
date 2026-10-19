---
paths:
  - "src/features/**"
  - "src/app/features/**"
  - "src/lib/features/**"
---

# Regole per le feature (kyfes)

- Struttura: `api/` (`<f>.api.ts`, `<f>.queries.ts`, `<f>.mutations.ts`), `components/`, `model/<f>.schema.ts`, `locales/<lang>.json`, `permissions.ts`, `index.ts`.
- I componenti non chiamano il client HTTP: usano gli hook/funzioni di `api/`. Chiavi di query solo dalla factory della feature; risposte validate con Zod. Create e update (`PATCH`) inviano solo i campi scrivibili; delete ottimistico con `mutationKey` condivisa.
- Ogni azione CRUD visibile è condizionata da `can()`/`<Can>` sul soggetto della feature; per il record specifico `subject('<Soggetto>', record)`; campi con permesso di campo.
- Stati di caricamento/errore/vuoto con `QueryState`, liste con `LoadMore`, eliminazioni con `ConfirmDeleteDialog` di `shared/ui`: non copiare il markup di un'altra feature.
- Costanti esplicite solo in `constants.ts` della feature (regola `constants-location`, bloccante): nome della feature, namespace, soggetto, campi, stati, filtri, ordinamenti, colonne, segmenti di rotta, endpoint. `permissions.ts`, `model/`, `routes.ts`, `api/` e i componenti le importano; le azioni RBAC e i valori trasversali vengono da `shared/config/constants.ts`.
- Nessun valore di dominio scritto due volte (regola `constant-reuse`, max 10% di duplicati, bloccante). Referenzia la costante, non ripetere il letterale: una scrittura che ripete un valore già esportato come costante viene rifiutata. Schema completo per le nuove feature: sez. 9.1 della skill (nome della feature → namespace, rotte, endpoint e query key derivati).
- Ogni testo visibile nei file di locale della feature, in tutte le lingue. Grafici solo con i wrapper di `shared/charts`.
- Nessun import dai file interni di un'altra feature: solo dal suo `index.ts`, o si sposta il codice comune in `shared`.
- Test accanto ai file: query/mutation con MSW, RBAC con almeno due profili, stati di errore.
