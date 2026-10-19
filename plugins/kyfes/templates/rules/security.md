---
paths:
  - "src/**"
---

# Sicurezza frontend (kyfes)

- Sessione solo in cookie `HttpOnly; Secure; SameSite` impostato dal server. Mai token in `localStorage`, `sessionStorage`, IndexedDB, stato globale, URL o header `Authorization` costruiti nel browser.
- Tutte le chiamate con `withCredentials` verso la stessa origine (`/api`); CSRF con `X-XSRF-TOKEN` sui metodi non sicuri.
- Niente HTML grezzo senza `sanitizeHtml` importato da shared/lib sulla stessa riga; niente `eval`/`Function`; `rel="noopener noreferrer"` su `target="_blank"`. Nessuna libreria di cookie lato client.
- Redirect solo con `safeRedirect`, URL dell'utente solo con `safeUrl`, `postMessage` con verifica di `origin`.
- `.kyfes/`, `tools/kyfes/` e le impostazioni/hook dell'agente li modifica solo l'utente; il codice non si scrive da shell (redirect, `sed -i`, `git apply`).
- Solo `https://`/`wss://`. Nessun segreto nel bundle: variabili con prefisso pubblico solo per valori pubblici, lette in `shared/config/env.ts`.
