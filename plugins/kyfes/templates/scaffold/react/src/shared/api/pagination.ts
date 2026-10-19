import { z } from 'zod';

/** Cursor page (same contract as kybes): `{ items, nextCursor, limit }`. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    limit: z.number().int().positive(),
  });
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  limit: number;
}

export interface PageParams {
  limit: number;
  cursor?: string | undefined;
  sort?: string | undefined;
}

export const DEFAULT_PAGE_SIZE = 20;

/** `getNextPageParam` for `infiniteQueryOptions`: `undefined` = no more pages. */
export function getNextCursor<T>(lastPage: Page<T>): string | undefined {
  return lastPage.nextCursor ?? undefined;
}
