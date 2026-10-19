import { subject } from '@casl/ability'

export { Can } from '@casl/vue'
export {
  ACTIONS,
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

/** Tags a record with its subject type for conditional rules: `can('update', subject('Order', order))`. */
export { subject }
