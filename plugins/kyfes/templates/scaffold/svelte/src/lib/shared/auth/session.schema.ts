import { z } from 'zod';
import { RawRuleSchema } from '$lib/shared/rbac/rules.schema';

/** GET /api/auth/me → { user, rules, locale }: the single source of truth for user and permissions. */
export const SessionSchema = z.object({
	user: z.object({
		id: z.string(),
		name: z.string(),
		email: z.email()
	}),
	rules: z.array(RawRuleSchema),
	locale: z.string().nullable().optional()
});

export type Session = z.infer<typeof SessionSchema>;
export type SessionUser = Session['user'];
