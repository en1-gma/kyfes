import {
	createMongoAbility,
	type MongoAbility,
	type MongoQuery,
	type RawRuleOf
} from '@casl/ability';
import type { RawRule } from './rules.schema';
import type { Actions, Subjects } from './subjects';

export type AppAbility = MongoAbility<[Actions, Subjects], MongoQuery>;

export function buildAbility(rules: readonly RawRule[] = []): AppAbility {
	return createMongoAbility<AppAbility>(toCaslRules(rules));
}

type CaslRule = RawRuleOf<AppAbility>;

/**
 * Server rules may name actions/subjects this app does not know: CASL compares strings, so they
 * are kept as they are and simply never match a `can()` of the app.
 */
export function toCaslRules(rules: readonly RawRule[]): CaslRule[] {
	return rules.map((rule) => ({
		...rule,
		action: rule.action as CaslRule['action'],
		subject: rule.subject as CaslRule['subject'],
		conditions: rule.conditions as MongoQuery | undefined
	}));
}

export { subject } from '@casl/ability';
