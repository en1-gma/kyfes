import { Can as CaslCan, useAbility as useCaslAbility, type CanProps } from '@casl/react';
import type { ReactNode } from 'react';
import type { AppAbility } from './ability';

/** `<Can I="update" this={subject('Order', order)} field="status">…</Can>` typed on AppAbility. */
export const Can = CaslCan as (props: CanProps<AppAbility>) => ReactNode;

/** Current Ability (re-renders when rules change). */
export function useAbility(): AppAbility {
  return useCaslAbility<AppAbility>();
}

/** Shortcut: `const can = useCan(); can('delete', subject('Order', order))`. */
export function useCan(): AppAbility['can'] {
  const ability = useAbility();
  return ability.can.bind(ability);
}
