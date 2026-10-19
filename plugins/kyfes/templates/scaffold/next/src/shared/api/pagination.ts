import { z } from 'zod';

/** Cursor page, same contract as kybes: `{ items, nextCursor, limit }`. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    limit: z.number().int().positive(),
  });
}

export type Page<T> = { items: T[]; nextCursor: string | null; limit: number };

export interface PageParams {
  limit: number;
  cursor?: string;
  sort?: string;
}

export const DEFAULT_PAGE_SIZE = 20;

/** Query-string params without undefined values. */
export function toPageQuery(params: PageParams): Record<string, string | number> {
  const out: Record<string, string | number> = { limit: params.limit };
  if (params.cursor) out.cursor = params.cursor;
  if (params.sort) out.sort = params.sort;
  return out;
}
