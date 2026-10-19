import { createMongoAbility, type ForcedSubject, type MongoAbility, type RawRuleOf } from '@casl/ability'
import type { RawRule } from '@/shared/auth'

export const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const
export type Actions = (typeof ACTIONS)[number]

/**
 * Subject registry: one singular PascalCase noun per feature (declared in features/<f>/permissions.ts).
 * Adding a feature = adding its subject name here.
 */
export const SUBJECTS = ['Order'] as const
export type SubjectName = (typeof SUBJECTS)[number]

/** A subject name, a record tagged with `subject('Order', order)`, or 'all'. */
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
