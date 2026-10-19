import type { ForcedSubject } from '@casl/ability';

export const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;
export type Actions = (typeof ACTIONS)[number];

/**
 * Registry of the CASL subjects. Each feature declares its subject in
 * features/<f>/permissions.ts and registers the name here (shared never imports features).
 */
export const SUBJECT_TYPES = ['Order'] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

/** A subject name, a record tagged with subject() (conditions on the record) or 'all'. */
export type Subjects = SubjectType | ForcedSubject<SubjectType> | 'all';
