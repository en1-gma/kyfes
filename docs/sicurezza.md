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
- **401**: l'interceptor di `shared/api` invalida la sessione e porta al login; se il backend espone `/api/auth/refresh`, il rinnovo è single-flight e la richiesta originale è ripetuta una sola volta.
- **Logout**: `POST /api/auth/logout`, poi `queryClient.clear()` (nessun dato dell'utente precedente resta in cache).

## CSRF

Double-submit: il server imposta il cookie `XSRF-TOKEN` (leggibile), il client lo copia nell'header `X-XSRF-TOKEN` sui metodi non sicuri, il server confronta i due. axios lo fa da sé con `xsrfCookieName`/`xsrfHeaderName` (e `withXSRFToken` limitato all'origine dell'API); Angular con `withXsrfConfiguration`. Per le server action/form action di Next e SvelteKit il server verifica `Origin`.

## XSS

| Vietato | Alternativa |
|---|---|
| `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `innerHTML =`, `insertAdjacentHTML`, `document.write` | testo normale, oppure `sanitizeHtml()` di `shared/lib` (DOMPurify) sulla stessa riga |
| `bypassSecurityTrust*` (Angular) | il sanitizer di Angular, o `sanitizeHtml` |
| `eval`, `new Function`, `setTimeout('codice')` | funzioni |
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

Gli scaffold li applicano così: SPA Vite e Angular con `deploy/security-headers.conf` (nginx) e, dove disponibile, CSP automatica di Angular; Next.js con CSP a nonce generata in `src/proxy.ts`; SvelteKit con `kit.csp` e `hooks.server.ts`. Asset con hash in cache lunga, `index.html` senza cache.

## Segreti

Nel frontend non esistono segreti: tutto ciò che è nel bundle è pubblico. Le variabili con prefisso pubblico (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`, `NG_APP_`) contengono solo valori pubblici e si leggono solo in `shared/config/env.ts`, validate con Zod. Gli hook rifiutano chiavi riconoscibili (AWS, GitHub, Slack, chiavi private, `client_secret`) nel codice e nei file `.env`.

## Dipendenze

Lockfile versionato, installazione con `npm ci` (o equivalente) in CI, `npm audit --omit=dev --audit-level=high` (dipendenze di produzione) nel workflow generato. Script di terze parti solo con SRI.
