import * as z from 'zod';

/** Pagina a cursore (stesso contratto di kybes): `{ items, nextCursor, limit }`. */
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
  cursor?: string;
  sort?: string;
}

export const DEFAULT_PAGE_SIZE = 20;
