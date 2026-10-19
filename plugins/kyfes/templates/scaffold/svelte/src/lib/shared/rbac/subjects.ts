import type { ForcedSubject } from '@casl/ability';

/** CASL actions of the app: guards, `can()`, `<Can>` and mocks reference these, never a string. */
export const Action = {
	Create: 'create',
	Read: 'read',
	Update: 'update',
	Delete: 'delete',
	Manage: 'manage'
} as const;
export type Actions = (typeof Action)[keyof typeof Action];
export const ACTIONS: readonly Actions[] = Object.values(Action);

/**
 * Registry of the CASL subjects. Each feature exposes its subject in features/<f>/permissions.ts
 * (taken from here) and the name is registered only here (shared never imports features).
 */
export const Subject = {
	Order: 'Order'
} as const;
export type SubjectType = (typeof Subject)[keyof typeof Subject];
export const SUBJECT_TYPES: readonly SubjectType[] = Object.values(Subject);

/** A subject name, a record tagged with subject() (conditions on the record) or 'all'. */
export type Subjects = SubjectType | ForcedSubject<SubjectType> | 'all';
