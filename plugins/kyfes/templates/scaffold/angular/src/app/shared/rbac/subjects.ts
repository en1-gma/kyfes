import type { ForcedSubject } from '@casl/ability';

/** Azioni CASL: unico punto in cui sono scritte (`Action.Update`, mai `'update'`). */
export const Action = {
  Create: 'create',
  Read: 'read',
  Update: 'update',
  Delete: 'delete',
  Manage: 'manage',
} as const;
export type Actions = (typeof Action)[keyof typeof Action];
export const ACTIONS: readonly Actions[] = Object.values(Action);

/**
 * Registro dei soggetti CASL: un sostantivo singolare PascalCase per feature.
 * Ogni feature lo registra qui e lo riespone in `features/<f>/permissions.ts`
 * (es. `ORDER_SUBJECT = Subject.Order`). 'all' è il jolly di CASL.
 */
export const Subject = {
  Order: 'Order',
} as const;
export type SubjectName = (typeof Subject)[keyof typeof Subject];

/** Soggetto per tipo (`Subject.Order`) o per record (`subject(Subject.Order, order)`). */
export type AppSubject = SubjectName | ForcedSubject<SubjectName> | 'all';
