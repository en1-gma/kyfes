import * as z from 'zod';

const StringOrList = z.union([z.string(), z.array(z.string())]);

/** Regola CASL "impacchettata" così come arriva dal server (trasformata in Ability da shared/rbac). */
export const RawRuleSchema = z.object({
  action: StringOrList,
  subject: StringOrList.optional(),
  fields: StringOrList.optional(),
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
  locale: z.string(),
});

export type RawRule = z.infer<typeof RawRuleSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionUser = Session['user'];
