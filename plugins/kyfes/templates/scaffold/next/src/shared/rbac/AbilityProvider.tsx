'use client';

import { useMemo, type ReactNode } from 'react';
import {
  AbilityProvider as CaslAbilityProvider,
  Can as CaslCan,
  useAbility as useCaslAbility,
  type CanProps,
} from '@casl/react';
import { useSession } from '@/shared/auth';
import { buildAbility, type AppAbility } from './ability';

const EMPTY_RULES: [] = [];

/** Ability fed by the session query: rebuilt whenever the session (rules) changes. */
export function AbilityProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const rules = session?.rules ?? EMPTY_RULES;
  const ability = useMemo(() => buildAbility(rules), [rules]);
  return <CaslAbilityProvider value={ability}>{children}</CaslAbilityProvider>;
}

/** Same as CASL's provider but with an explicit ability (tests, storybook). */
export function StaticAbilityProvider({
  ability,
  children,
}: {
  ability: AppAbility;
  children: ReactNode;
}) {
  return <CaslAbilityProvider value={ability}>{children}</CaslAbilityProvider>;
}

export function useAbility(): AppAbility {
  return useCaslAbility<AppAbility>();
}

/** `<Can I="update" this={subject('Order', order)}>…</Can>` typed on AppAbility. */
export const Can = CaslCan as (props: CanProps<AppAbility>) => ReactNode;
