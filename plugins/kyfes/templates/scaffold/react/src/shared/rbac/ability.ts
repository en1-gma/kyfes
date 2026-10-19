import {
  createMongoAbility,
  subject,
  type ForcedSubject,
  type MongoAbility,
  type RawRuleOf,
} from '@casl/ability';
import type { RawRule } from '@/shared/auth';

/** CASL actions, written once: guards, `can()`, `<Can>` and mock rules reference these. */
export const ACTIONS = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
} as const;
export type Actions = (typeof ACTIONS)[keyof typeof ACTIONS];

/**
 * Registry of the CASL subjects of the features. Each feature registers its subject in its
 * `permissions.ts` through module augmentation, so shared/ never imports from features/:
 *
 *   declare module '@/shared/rbac/ability' {
 *     interface SubjectRegistry { Order: Order }
 *   }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SubjectRegistry {}

type SubjectName = Extract<keyof SubjectRegistry, string>;

/** Subject = name ('Order'), record tagged with `subject('Order', order)`, or 'all'. */
export type Subjects =
  'all' | { [K in SubjectName]: K | (SubjectRegistry[K] & ForcedSubject<K>) }[SubjectName];

export type AppAbility = MongoAbility<[Actions, Subjects]>;
export type AppRawRule = RawRuleOf<AppAbility>;

/**
 * Builds the Ability from the rules sent by the server. The server is the source of truth:
 * the UI only hides what is not allowed (kyfes §5).
 */
export function buildAbility(rules: readonly RawRule[] = []): AppAbility {
  // The session schema validates the shape; actions/subjects outside the registry never match.
  return createMongoAbility<AppAbility>(rules as AppRawRule[]);
}

export { subject };
