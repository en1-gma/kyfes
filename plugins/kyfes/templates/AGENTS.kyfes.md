<!-- kyfes:start (blocco gestito dall'installer: modifiche qui vengono sovrascritte) -->
## Regole frontend (kyfes)

Questo progetto segue la skill `kyfes-architecture` (framework: __FRAMEWORK__). In sintesi:

- **Alberatura fissa**: `app → pages → features → shared`, dipendenze solo verso il basso. Feature in `features/<feature>/{api,components,model,locales,permissions.ts,index.ts}`; `shared/{api,auth,rbac,i18n,charts,ui,lib,config}`. Mai import interni tra feature.
- **Sessione solo in cookie** `__Host-session` `HttpOnly; Secure; SameSite` impostato dal server (BFF, OIDC Authorization Code + PKCE lato server). Il browser non vede token: niente `localStorage`/`sessionStorage`, niente `Authorization: Bearer`, niente `document.cookie =`. Solo HTTPS.
- **CSRF**: header `X-XSRF-TOKEN` dal cookie `XSRF-TOKEN` sui metodi non sicuri. **XSS**: niente HTML grezzo senza `sanitizeHtml`, niente `eval`, `rel="noopener noreferrer"`, redirect con `safeRedirect`, CSP senza `unsafe-inline`.
- **Dati**: client HTTP (axios / Angular `HttpClient`) solo in `shared/api`; letture e scritture con TanStack Query in `features/<f>/api`, chiavi dalla factory, risposte validate con Zod, liste a cursore `{items, nextCursor, limit}`, errori `ApiError {code, message, correlationId}`.
- **RBAC**: permessi CASL dal server (`/api/auth/me`); ogni rotta, pulsante, colonna e campo CRUD condizionato da `can(azione, soggetto)`. Mai controlli sui nomi dei ruoli. Il server resta l'autorità.
- **i18n**: ogni testo visibile tradotto (namespace = feature), formattazioni con `Intl`. **Grafici** solo tramite `shared/charts`, accessibili.
- **Costanti, non letterali**: ogni valore di dominio (azioni e soggetti RBAC, campi, namespace i18n, stati, filtri, ordinamenti, colonne, rotte, endpoint, chiavi di query, mapping) è definito una volta nel modulo che lo possiede e referenziato ovunque (schema della sez. 9.1 della skill). Una scrittura che ripete un valore già definito come costante viene rifiutata; oltre il 10% di valori duplicati (`arch_check`, riuso costanti) lo stop gate blocca.
- **Test**: Vitest + Testing Library + MSW, Playwright + axe; test RBAC per ogni feature.

Modo di lavorare:
- Pianifica con l'agente **kyfes:architect** (Claude Code) o la skill **$kyfes-plan** (Codex), non con il planner integrato.
- Implementa un task alla volta con **kyfes:implementer** / l'agente Codex `kyfes_implementer`.
- Fai verificare con **kyfes:reviewer** / **$kyfes-review**.
- Gli hook rifiutano le scritture non conformi (valutando il file risultante) e bloccano la chiusura finché `arch_check`, lint, typecheck e test non passano, anche dopo un commit: correggi la causa, non aggirarli. Il codice si scrive con gli strumenti di modifica dei file, non da shell (redirect, `sed -i`, `cp`/`mv`, `git apply`): quei comandi sono rifiutati.
- Configurazione e comandi: `.kyfes/config.json` (la modifica solo l'utente, come `tools/kyfes/` e le impostazioni e gli hook dell'agente). Controllo completo: `python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py .`
<!-- kyfes:end -->
