import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app.component';
import { appConfig } from './app/app.config';

/**
 * Costante di build (angular.json → define): con 'false' esbuild elimina il ramo e il chunk di MSW.
 * Il confronto resta con il letterale (`FLAG.on` di shared/config/env vale lo stesso): esbuild non
 * propaga costanti importate da altri moduli e il chunk di MSW finirebbe nella build di produzione.
 */
declare const NG_APP_API_MOCKS: string | undefined;

/** MSW nel browser solo in sviluppo e solo con API_MOCKS=true (`npm run dev:mocks`). */
async function enableMocking(): Promise<void> {
  if (typeof NG_APP_API_MOCKS !== 'undefined' && NG_APP_API_MOCKS === 'true' && isDevMode()) {
    const { startMockWorker } = await import('./mocks/browser');
    await startMockWorker();
  }
}

enableMocking()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err: unknown) => console.error(err));
