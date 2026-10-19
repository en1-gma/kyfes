import {
  createMongoAbility,
  type ForcedSubject,
  type MongoAbility,
  type RawRuleOf,
} from '@casl/ability';
import type { RawRule } from '@/shared/auth';

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';

/**
 * Registry of the CASL subjects of every feature (one singular PascalCase noun each).
 * A new feature declares its subject in `features/<f>/permissions.ts` and adds it here.
 */
export const SUBJECTS = ['Order'] as const;
export type SubjectName = (typeof SUBJECTS)[number];

/** A record tagged with `subject('Order', order)` for condition checks. */
export type SubjectRecord = ForcedSubject<SubjectName>;

export type Subjects = SubjectName | SubjectRecord | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;
export type AppRawRule = RawRuleOf<AppAbility>;

/** Builds the Ability from the rules sent by the server (never from role names). */
export function buildAbility(rules: readonly RawRule[] = []): AppAbility {
  return createMongoAbility<AppAbility>(rules as AppRawRule[]);
}
