import type { ForcedSubject } from '@casl/ability';

export const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;
export type Actions = (typeof ACTIONS)[number];

/**
 * Registro dei soggetti CASL: un sostantivo singolare PascalCase per feature.
 * Ogni feature dichiara il proprio in `features/<f>/permissions.ts` (con `satisfies SubjectName`)
 * e lo aggiunge qui. 'all' è il jolly di CASL.
 */
export type SubjectName = 'Order';

/** Soggetto per tipo (`'Order'`) o per record (`subject('Order', order)`). */
export type AppSubject = SubjectName | ForcedSubject<SubjectName> | 'all';
