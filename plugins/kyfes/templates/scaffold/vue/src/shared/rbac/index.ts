import { subject } from '@casl/ability'

export { Can } from '@casl/vue'
export {
  ACTION,
  ACTIONS,
  SUBJECT,
  SUBJECTS,
  buildAbility,
  updateAbility,
  type Actions,
  type SubjectName,
  type Subjects,
  type AppAbility,
} from './ability'
export { createRbacPlugin, useAbility, type RbacPlugin } from './rbac-plugin'
export { createPermissionGuard, FORBIDDEN_ROUTE, type RoutePermission } from './permission-guard'

/** Tags a record with its subject type for conditional rules: `can(ACTION.update, subject(SUBJECT.Order, order))`. */
export { subject }
