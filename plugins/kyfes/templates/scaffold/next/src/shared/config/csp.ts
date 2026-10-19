import { CSP_HEADER, CSP_SRC as SRC, NONCE_HEADER } from './constants';

export { CSP_HEADER, NONCE_HEADER };

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
