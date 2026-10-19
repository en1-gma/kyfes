import { z } from 'zod';
import { LOCALES } from '@/shared/config/env';

/**
 * Raw CASL rule as packed by the server (`/auth/me` → `rules`). Actions and subjects stay plain
 * strings: an unknown one (newer backend) simply never matches, it does not break the session.
 */
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
  /** Unknown or `null` locale → `undefined` (the app keeps its own default). */
  locale: z.enum(LOCALES).optional().catch(undefined),
});

export type RawRule = z.infer<typeof RawRuleSchema>;
export type Session = z.infer<typeof SessionSchema>;
