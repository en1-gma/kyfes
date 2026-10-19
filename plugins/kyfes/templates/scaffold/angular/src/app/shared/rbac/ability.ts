import {
  type EnvironmentProviders,
  effect,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { Ability, type MongoAbility, type RawRuleOf, createMongoAbility } from '@casl/ability';
import { AbilityServiceSignal } from '@casl/angular';
import { type RawRule, SessionStore } from '@shared/auth';
import type { Actions, AppSubject } from './subjects';

export type AppAbility = MongoAbility<[Actions, AppSubject]>;
export type AppRawRule = RawRuleOf<AppAbility>;

/** Regole del server (già validate con Zod in shared/auth) → Ability CASL. */
export function buildAbility(rules: readonly RawRule[]): AppAbility {
  return createMongoAbility<AppAbility>(rules as AppRawRule[]);
}

/**
 * Ability unica dell'app, alimentata dalla sessione: quando `/auth/me` cambia
 * (login, invalidazione dopo un 403) le regole si aggiornano e i template si ricalcolano.
 */
export function provideRbac(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Ability, useFactory: () => buildAbility([]) },
    provideEnvironmentInitializer(() => {
      const session = inject(SessionStore);
      const abilities = inject<AbilityServiceSignal<AppAbility>>(AbilityServiceSignal);
      effect(() => abilities.update(session.rules() as AppRawRule[]));
    }),
  ]);
}

export type CanFn = (action: Actions, subject: AppSubject, field?: string) => boolean;

/** `can(azione, soggetto, campo?)` reattivo (signal): da usare nei componenti e nei template. */
export function injectCan(): CanFn {
  const abilities = inject<AbilityServiceSignal<AppAbility>>(AbilityServiceSignal);
  return (action, subject, field) => abilities.can(action, subject, field);
}

export function injectAbility(): AppAbility {
  return inject(Ability) as AppAbility;
}
