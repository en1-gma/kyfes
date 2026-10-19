import {
  createMongoAbility,
  type ForcedSubject,
  type MongoAbility,
  type RawRuleOf,
} from '@casl/ability';
import type { RawRule } from '@/shared/auth';
import { ACTION, SUBJECT } from '@/shared/config/constants';

/** CASL actions and subject registry: defined in shared/config/constants. */
export { ACTION, SUBJECT };
export type Actions = (typeof ACTION)[keyof typeof ACTION];
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
