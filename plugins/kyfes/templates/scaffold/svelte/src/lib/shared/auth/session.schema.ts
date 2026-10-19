import { z } from 'zod';
import { locales, type Locale } from '$lib/shared/i18n';
import { RawRuleSchema } from '$lib/shared/rbac/rules.schema';

const isSupportedLocale = (value: unknown): value is Locale =>
	locales.some((locale) => locale === value);

/**
 * GET /api/auth/me → { user, rules, locale }: the single source of truth for user and permissions.
 * Robust on purpose: an unknown or null `locale` becomes `undefined` (the app falls back to
 * cookie/navigator/default) instead of failing the whole session.
 */
export const SessionSchema = z.object({
	user: z.object({
		id: z.string(),
		name: z.string(),
		email: z.email()
	}),
	rules: z.array(RawRuleSchema),
	locale: z
		.unknown()
		.optional()
		.transform((value) => (isSupportedLocale(value) ? value : undefined))
});

export type Session = z.infer<typeof SessionSchema>;
export type SessionUser = Session['user'];
