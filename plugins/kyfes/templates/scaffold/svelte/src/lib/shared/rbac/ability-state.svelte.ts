import { getContext, setContext, untrack } from 'svelte';
import { buildAbility, toCaslRules, type AppAbility } from './ability';
import type { RawRule } from './rules.schema';

const ABILITY_KEY = Symbol('kyfes.ability');

/**
 * Reactive wrapper of the CASL ability: `can()` re-runs in templates/$derived
 * whenever the rules change (CASL itself is not reactive).
 */
export class AbilityState {
	readonly ability: AppAbility;
	#version = $state(0);

	constructor(rules: readonly RawRule[] = []) {
		this.ability = buildAbility(rules);
		this.ability.on('updated', () => {
			this.#version += 1;
		});
	}

	/** Safe inside effects: the version bump is not tracked as a dependency of the caller. */
	update(rules: readonly RawRule[]): void {
		untrack(() => this.ability.update(toCaslRules(rules)));
	}

	can = (...args: Parameters<AppAbility['can']>): boolean => {
		void this.#version;
		return this.ability.can(...args);
	};

	cannot = (...args: Parameters<AppAbility['cannot']>): boolean => !this.can(...args);
}

export function setAbilityContext(state: AbilityState): AbilityState {
	return setContext(ABILITY_KEY, state);
}

/** Current ability (from AbilityProvider). Use `useAbility().can(...)` in components. */
export function useAbility(): AbilityState {
	const state = getContext<AbilityState | undefined>(ABILITY_KEY);
	if (!state)
		throw new Error('useAbility() needs <AbilityProvider> (shared/rbac) above in the tree');
	return state;
}
