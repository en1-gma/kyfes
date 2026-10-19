import { z } from 'zod';

const oneOrMany = z.union([z.string(), z.array(z.string())]);

/**
 * A packed CASL rule as sent by GET /api/auth/me. Rules are computed by the server: actions and
 * subjects unknown to this app (`export`, `Invoice`) stay plain strings and simply never match,
 * they do not invalidate the whole session.
 */
export const RawRuleSchema = z.object({
	action: oneOrMany,
	subject: oneOrMany,
	fields: oneOrMany.optional(),
	conditions: z.record(z.string(), z.unknown()).optional(),
	inverted: z.boolean().optional(),
	reason: z.string().optional()
});

export type RawRule = z.infer<typeof RawRuleSchema>;
