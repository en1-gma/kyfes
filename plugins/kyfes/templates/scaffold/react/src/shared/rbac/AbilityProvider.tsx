import { AbilityProvider as CaslAbilityProvider } from '@casl/react';
import { useMemo, type ReactNode } from 'react';
import { useCurrentSession } from '@/shared/auth';
import { buildAbility, type AppAbility } from './ability';

const NO_RULES: [] = [];

/**
 * Feeds the CASL context from the session query: when `/auth/me` is refetched (login, 403,
 * permission change) a new Ability is built and every `<Can>` / `useAbility()` re-renders.
 * `ability` overrides the session (tests, storybook).
 */
export function AbilityProvider({ children, ability }: { children: ReactNode; ability?: AppAbility }) {
  const session = useCurrentSession();
  const rules = session?.rules ?? NO_RULES;
  const fromSession = useMemo(() => buildAbility(rules), [rules]);
  return <CaslAbilityProvider value={ability ?? fromSession}>{children}</CaslAbilityProvider>;
}
