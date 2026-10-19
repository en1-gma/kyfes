/** Header carrying the policy (request, so Next applies the nonce, and response). */
export const CSP_HEADER = 'Content-Security-Policy';
/** Request header exposing the per-request nonce to server components. */
export const NONCE_HEADER = 'x-nonce';

/** CSP source keywords: quoted as the header requires. */
const SRC = {
  self: "'self'",
  none: "'none'",
  strictDynamic: "'strict-dynamic'",
  unsafeEval: "'unsafe-eval'",
  unsafeInline: "'unsafe-inline'",
} as const;

/**
 * Per-request CSP with nonce. Next reads the nonce from the request CSP header and applies it to
 * its own scripts/styles; pages are rendered dynamically (the root layout reads cookies).
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const nonceSrc = `'nonce-${nonce}'`;
  return [
    `default-src ${SRC.self}`,
    `script-src ${SRC.self} ${nonceSrc} ${SRC.strictDynamic}${isDev ? ` ${SRC.unsafeEval}` : ''}`,
    // Dev only: the Next dev overlay injects inline styles (a nonce would disable 'unsafe-inline').
    isDev ? `style-src ${SRC.self} ${SRC.unsafeInline}` : `style-src ${SRC.self} ${nonceSrc}`,
    `img-src ${SRC.self} blob: data:`,
    `font-src ${SRC.self}`,
    `connect-src ${SRC.self}`,
    `worker-src ${SRC.self}`,
    `object-src ${SRC.none}`,
    `base-uri ${SRC.none}`,
    `form-action ${SRC.self}`,
    `frame-ancestors ${SRC.none}`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
