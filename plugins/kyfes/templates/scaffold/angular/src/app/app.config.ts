import {
  type ApplicationConfig,
  ErrorHandler,
  effect,
  inject,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withNavigationErrorHandler,
} from '@angular/router';
import { provideTanStackQuery } from '@tanstack/angular-query-experimental';
import { createQueryClient, provideApi } from '@shared/api';
import { SessionStore, provideAuth } from '@shared/auth';
import { I18nService, I18nTitleStrategy, provideI18n } from '@shared/i18n';
import { provideRbac } from '@shared/rbac';
import { AppErrorHandler, GlobalErrorState } from './app-error-handler';
import { routes } from './app.routes';

/** La lingua della sessione (se presente) prevale su browser e default. */
function syncLocaleWithSession(): void {
  const session = inject(SessionStore);
  const i18n = inject(I18nService);
  effect(() => {
    const locale = session.locale();
    if (locale) i18n.setLang(locale);
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withNavigationErrorHandler((navError) => inject(GlobalErrorState).report(navError.error)),
    ),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
    provideApi(),
    provideTanStackQuery(createQueryClient()),
    provideI18n(),
    provideAuth(),
    provideRbac(),
    provideEnvironmentInitializer(syncLocaleWithSession),
  ],
};
