import { z } from 'zod';

/** Raw CASL rule as packed by the server (`/auth/me` → `rules`). */
export const RawRuleSchema = z.object({
  action: z.union([z.string(), z.array(z.string())]),
  subject: z.union([z.string(), z.array(z.string())]).optional(),
  fields: z.union([z.string(), z.array(z.string())]).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  inverted: z.boolean().optional(),
  reason: z.string().optional(),
});

export const SessionSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
  }),
  rules: z.array(RawRuleSchema),
  locale: z.string().optional(),
});

export type RawRule = z.infer<typeof RawRuleSchema>;
export type Session = z.infer<typeof SessionSchema>;
