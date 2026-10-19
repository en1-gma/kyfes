export { subject } from '@casl/ability';
export {
  buildAbility,
  injectAbility,
  injectCan,
  provideRbac,
  type AppAbility,
  type AppRawRule,
  type CanFn,
} from './ability';
export { CanDirective } from './can.directive';
export { FORBIDDEN_PATH, permissionGuard } from './permission.guard';
export { ACTIONS, type Actions, type AppSubject, type SubjectName } from './subjects';
