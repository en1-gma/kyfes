import {
  createMongoAbility,
  type ForcedSubject,
  type MongoAbility,
  type RawRuleOf,
} from '@casl/ability';
import type { RawRule } from '@/shared/auth';

/** CASL actions: the only place their names are written (`ACTION.update`, never `'update'`). */
export const ACTION = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
} as const;
export type Actions = (typeof ACTION)[keyof typeof ACTION];

/**
 * Registry of the CASL subjects of every feature (one singular PascalCase noun each).
 * A new feature adds its subject here and re-exports it from `features/<f>/permissions.ts`.
 */
export const SUBJECT = {
  Order: 'Order',
} as const;
export type SubjectName = (typeof SUBJECT)[keyof typeof SUBJECT];
export const SUBJECTS: readonly SubjectName[] = Object.values(SUBJECT);

/** A record tagged with `subject('Order', order)` for condition checks. */
export type SubjectRecord = ForcedSubject<SubjectName>;

export type Subjects = SubjectName | SubjectRecord | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;
export type AppRawRule = RawRuleOf<AppAbility>;

/** Builds the Ability from the rules sent by the server (never from role names). */
export function buildAbility(rules: readonly RawRule[] = []): AppAbility {
  return createMongoAbility<AppAbility>(rules as AppRawRule[]);
}
