import { z } from 'zod';
import { ACTIONS, SUBJECT_TYPES } from './subjects';

const ActionSchema = z.enum(ACTIONS);
const SubjectTypeSchema = z.enum([...SUBJECT_TYPES, 'all']);

/** A packed CASL rule as sent by GET /api/auth/me. Unknown subjects/actions are rejected. */
export const RawRuleSchema = z.object({
	action: z.union([ActionSchema, z.array(ActionSchema)]),
	subject: z.union([SubjectTypeSchema, z.array(SubjectTypeSchema)]),
	fields: z.union([z.string(), z.array(z.string())]).optional(),
	conditions: z.record(z.string(), z.unknown()).optional(),
	inverted: z.boolean().optional(),
	reason: z.string().optional()
});

export type RawRule = z.infer<typeof RawRuleSchema>;
