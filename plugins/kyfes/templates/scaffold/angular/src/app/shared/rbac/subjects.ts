import type { ForcedSubject } from '@casl/ability';
import { ACTION, type SUBJECT } from '@shared/config/constants';

/**
 * Azioni e registro dei soggetti CASL: definiti in shared/config/constants.ts e riesposti qui con
 * i nomi dell'API di `@shared/rbac` (`Action.Update`, `Subject.Order`; mai `'update'`).
 */
export { ACTION as Action, SUBJECT as Subject } from '@shared/config/constants';

export type Actions = (typeof ACTION)[keyof typeof ACTION];
export const ACTIONS: readonly Actions[] = Object.values(ACTION);

export type SubjectName = (typeof SUBJECT)[keyof typeof SUBJECT];

/** Soggetto per tipo (`Subject.Order`) o per record (`subject(Subject.Order, order)`). */
export type AppSubject = SubjectName | ForcedSubject<SubjectName> | 'all';
