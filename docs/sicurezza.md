# Sicurezza

## Sessione: cookie HttpOnly e BFF

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant F as BFF (/api)
    participant I as Identity provider
    B->>F: GET /api/auth/login?returnTo=/orders
    F->>I: Authorization Code + PKCE (server side)
    I-->>F: code → token (tenuti sul server)
    F-->>B: Set-Cookie: __Host-session=…; HttpOnly; Secure; SameSite=Lax; Path=/<br/>Set-Cookie: XSRF-TOKEN=…; Secure; SameSite=Lax; Path=/
    B->>F: GET /api/auth/me (cookie)
    F-->>B: { user, rules, locale }
    B->>F: POST /api/orders (cookie + X-XSRF-TOKEN)
```

- **Perché non i token nel browser**: qualunque XSS legge `localStorage`/`sessionStorage` e invia il token altrove; un cookie `HttpOnly` non è leggibile da JavaScript, `Secure` impone HTTPS, `SameSite` blocca gran parte del CSRF, il prefisso `__Host-` impedisce a sottodomini di sovrascriverlo.
- **BFF** (Backend-for-Frontend): il flusso OIDC e i token restano sul server (gateway, reverse proxy, route handler di Next/SvelteKit o un servizio dedicato). Il browser parla solo con la propria origine.
- **401**: se il backend espone `/api/auth/refresh` (negli scaffold il refresh è attivo di default), il rinnovo è single-flight: una sola `POST /auth/refresh` in volo, le richieste in attesa la condividono e ciascuna è ripetuta una sola volta. Un contatore dei refresh riusciti fa sì che una richiesta partita prima di un refresh già concluso venga solo ripetuta, senza un nuovo refresh. Se il rinnovo fallisce, il redirect al login (`onUnauthorized`) avviene una sola volta, per quante richieste fossero in coda. Le richieste annullate non contano come errori.
- **Logout**: `POST /api/auth/logout`, poi `queryClient.clear()` (nessun dato dell'utente precedente resta in cache).
- **Redirect**: `returnTo` passa da `safeRedirect`, che accetta solo percorsi relativi della stessa origine e controlla anche il risultato normalizzato e decodificato: `/.//host`, `/%2e%2e//host` o `/%5Chost` non diventano un URL verso un altro host.

## CSRF

Double-submit: il server imposta il cookie `XSRF-TOKEN` (leggibile), il client lo copia nell'header `X-XSRF-TOKEN` sui metodi non sicuri, il server confronta i due. axios lo fa da sé con `xsrfCookieName`/`xsrfHeaderName` (e `withXSRFToken` limitato all'origine dell'API); Angular con `withXsrfConfiguration`. Per le server action/form action di Next e SvelteKit il server verifica `Origin`.

## XSS

| Vietato | Alternativa |
|---|---|
| `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `innerHTML =`, `insertAdjacentHTML`, `document.write`, `createContextualFragment`, `srcdoc =` | testo normale, oppure `sanitizeHtml()` di `shared/lib` (DOMPurify) sulla stessa riga; l'eccezione vale solo se `sanitizeHtml` è importato da `shared/lib` e non ridefinito nel file |
| `bypassSecurityTrust*` (Angular) | il sanitizer di Angular, o `sanitizeHtml` |
| `eval` (anche `window.eval`), `Function(…)` con o senza `new`, `setTimeout('codice')` | funzioni |
| `href={userUrl}` | `href={safeUrl(userUrl)}` (solo `https:`, `mailto:`, `tel:`, relativi) |
| `target="_blank"` senza `rel` | `rel="noopener noreferrer"` |
| `window.location = returnTo` | `safeRedirect(returnTo)` |
| `addEventListener('message', …)` senza controllo | verifica di `event.origin` contro una lista |

## Header e CSP

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}' 'strict-dynamic'; style-src 'self';
  img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none';
  frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
```

Gli scaffold li applicano così: SPA Vite e Angular con `deploy/security-headers.conf` (nginx) e, dove disponibile, CSP automatica di Angular (nella `location /api/` di Angular gli header sono ripetuti, perché un `add_header` annulla quelli del livello superiore, e il proxy verso il BFF usa `proxy_ssl_verify on`: prima del deploy va configurato `proxy_ssl_trusted_certificate`, altrimenti nginx rifiuta il BFF); Next.js con CSP a nonce generata in `src/proxy.ts`; SvelteKit con `kit.csp` e `hooks.server.ts`. Asset con hash in cache lunga, `index.html` senza cache.

## Segreti

Nel frontend non esistono segreti: tutto ciò che è nel bundle è pubblico. Le variabili con prefisso pubblico (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`, `NG_APP_`) contengono solo valori pubblici e si leggono solo in `shared/config/env.ts`, validate con Zod. Gli hook rifiutano chiavi riconoscibili (AWS, GitHub, Slack, chiavi private, `client_secret`) nel codice e nei file `.env`, dove contano anche i valori senza virgolette di variabili come `CLIENT_SECRET`, `API_KEY`, `*_TOKEN`, `PASSWORD` (esclusi segnaposto e i file `.env.example/.sample/.template`). Le librerie che scrivono cookie dal browser (js-cookie, universal-cookie, react-cookie, vue-cookies, ngx-cookie-service) non si importano.

## Dipendenze

Lockfile versionato, installazione con `npm ci` (o equivalente) in CI, `npm audit --omit=dev --audit-level=high` (dipendenze di produzione) nel workflow generato. Script di terze parti solo con SRI.

## Protezione dei controlli

L'agente non deve poter spegnere i controlli che lo vincolano. Gli hook negano le modifiche a `.kyfes/`, `tools/kyfes/`, `.claude/settings*.json` (`disableAllHooks`), `.codex/hooks.json`, `.codex/config.toml`, agli agenti, alle regole e alle skill di kyfes e a `kyfes-check.yml`, sia con gli strumenti di scrittura sia via shell, con qualsiasi combinazione di maiuscole nel percorso. In Claude Code l'installer aggiunge regole `permissions.deny` (`Edit(.kyfes/**)`, `Edit(tools/kyfes/**)`, `Edit(.claude/settings*.json)`), indipendenti dagli hook. Il controllo dei comandi shell è euristico: le barriere successive sono lo stop gate e la CI, che rieseguono `arch_check` sull'intero progetto.
