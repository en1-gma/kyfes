import { createMongoAbility, type ForcedSubject, type MongoAbility, type RawRuleOf } from '@casl/ability'
import type { RawRule } from '@/shared/auth'
import type { Actions, SubjectName } from '@/shared/config/constants'

/** Actions and the subject registry live in shared/config/constants.ts. */
export { ACTION, ACTIONS, SUBJECT, SUBJECTS, type Actions, type SubjectName } from '@/shared/config/constants'

/** A subject name, a record tagged with `subject(SUBJECT.Order, order)`, or 'all'. */
export type Subjects = SubjectName | ForcedSubject<SubjectName> | 'all'

export type AppAbility = MongoAbility<[Actions, Subjects]>

/**
 * Rules come from the server (/auth/me). Unknown actions/subjects simply never match,
 * so the structural cast from the validated session schema is safe.
 */
export function buildAbility(rules: readonly RawRule[] = []): AppAbility {
  return createMongoAbility<AppAbility>(rules as RawRuleOf<AppAbility>[])
}

export function updateAbility(ability: AppAbility, rules: readonly RawRule[]): void {
  ability.update(rules as RawRuleOf<AppAbility>[])
}
