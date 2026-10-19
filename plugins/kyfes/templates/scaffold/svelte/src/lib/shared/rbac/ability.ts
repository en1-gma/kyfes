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

export function toCaslRules(rules: readonly RawRule[]): RawRuleOf<AppAbility>[] {
	return rules.map((rule) => ({ ...rule, conditions: rule.conditions as MongoQuery | undefined }));
}

export { subject } from '@casl/ability';
