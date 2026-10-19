import type { ForcedSubject } from '@casl/ability';
import { Action, Subject } from '$lib/shared/config/constants';

/** Actions and subjects are defined in shared/config/constants.ts; this module types them. */
export { Action, Subject };

export type Actions = (typeof Action)[keyof typeof Action];
export const ACTIONS: readonly Actions[] = Object.values(Action);

export type SubjectType = (typeof Subject)[keyof typeof Subject];
export const SUBJECT_TYPES: readonly SubjectType[] = Object.values(Subject);

/** A subject name, a record tagged with subject() (conditions on the record) or 'all'. */
export type Subjects = SubjectType | ForcedSubject<SubjectType> | 'all';
