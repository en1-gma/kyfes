import { createMongoAbility, type ForcedSubject, type MongoAbility, type RawRuleOf } from '@casl/ability'
import type { RawRule } from '@/shared/auth'

/** CASL actions: always referenced as `ACTION.update`, never written as string literals. */
export const ACTION = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
} as const
export type Actions = (typeof ACTION)[keyof typeof ACTION]
export const ACTIONS: readonly Actions[] = Object.values(ACTION)

/**
 * Subject registry: one singular PascalCase noun per feature (re-exported by features/<f>/permissions.ts).
 * Adding a feature = adding its subject name here.
 */
export const SUBJECT = { Order: 'Order' } as const
export type SubjectName = (typeof SUBJECT)[keyof typeof SUBJECT]
export const SUBJECTS: readonly SubjectName[] = Object.values(SUBJECT)

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
