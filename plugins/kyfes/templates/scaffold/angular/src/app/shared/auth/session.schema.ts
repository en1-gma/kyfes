import * as z from 'zod';
import { SUPPORTED_LOCALES } from '@shared/config/constants';

const StringOrList = z.union([z.string(), z.array(z.string())]);

/**
 * Regola CASL "impacchettata" così come arriva dal server (trasformata in Ability da shared/rbac).
 * Azioni e soggetti restano stringhe libere: una regola per un soggetto/azione che il client non
 * conosce (es. `approve Invoice`) non fa fallire la sessione, semplicemente non fa match.
 */
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
  /** Lingua non supportata, `null` o assente → `undefined` (vale la lingua corrente). */
  locale: z.enum(SUPPORTED_LOCALES).optional().catch(undefined),
});

export type RawRule = z.infer<typeof RawRuleSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionUser = Session['user'];
