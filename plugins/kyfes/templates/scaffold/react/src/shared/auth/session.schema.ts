import { z } from 'zod';

/**
 * Raw CASL rule as packed by the server (`/auth/me` → `rules`). Actions and subjects are plain
 * strings here: unknown ones simply never match in the Ability built by shared/rbac.
 */
export const RawRuleSchema = z.object({
  action: z.union([z.string(), z.array(z.string())]),
  subject: z.union([z.string(), z.array(z.string())]).optional(),
  fields: z.union([z.string(), z.array(z.string())]).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  inverted: z.boolean().optional(),
  reason: z.string().optional(),
});
export type RawRule = z.infer<typeof RawRuleSchema>;

export const SessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const SessionSchema = z.object({
  user: SessionUserSchema,
  rules: z.array(RawRuleSchema),
  // Unknown or null locale: ignored (the UI keeps the browser/default language), never a broken session.
  locale: z.string().optional().catch(undefined),
});
export type Session = z.infer<typeof SessionSchema>;
