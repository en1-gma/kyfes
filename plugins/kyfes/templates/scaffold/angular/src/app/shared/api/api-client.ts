import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, firstValueFrom } from 'rxjs';
import type * as z from 'zod';
import { ABORT_EVENT, TEXT_RESPONSE } from '@shared/config/constants';
import { ApiError } from './api-error';
import { API_OPTIONS } from './http';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

function toParams(params: QueryParams = {}): HttpParams {
  let out = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') out = out.set(key, String(value));
  }
  return out;
}

function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw ApiError.invalidResponse();
  return result.data;
}

/** Opzioni per richiesta: `signal` è quello che TanStack Query passa a `queryFn`. */
export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * Una cancellazione NON è un errore di rete: HttpClient non emette errori quando ci si disiscrive
 * (la fetch viene interrotta), quindi su `abort` ci si disiscrive e si rigetta con `signal.reason`
 * così com'è, mai con un ApiError `NETWORK_ERROR`. TanStack Query la riconosce come CancelledError.
 */
function toPromise<T>(source: Observable<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return firstValueFrom(source);
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      subscription.unsubscribe();
      reject(signal.reason);
    };
    const done = () => signal.removeEventListener(ABORT_EVENT, onAbort);
    const subscription = source.subscribe({
      next: (value) => {
        done();
        resolve(value);
      },
      error: (error: unknown) => {
        done();
        reject(error);
      },
    });
    if (!subscription.closed) signal.addEventListener(ABORT_EVENT, onAbort, { once: true });
  });
}

/**
 * Unico client HTTP usato dalle feature (in `features/<f>/api`). Ogni risposta è validata
 * con lo schema Zod passato; ogni errore è un ApiError.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_OPTIONS).baseUrl;

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async get<S extends z.ZodType>(
    path: string,
    schema: S,
    params?: QueryParams,
    options: RequestOptions = {},
  ): Promise<z.output<S>> {
    const data = await toPromise(
      this.http.get<unknown>(this.url(path), { params: toParams(params) }),
      options.signal,
    );
    return parse(schema, data);
  }

  async post<S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.output<S>> {
    return parse(schema, await firstValueFrom(this.http.post<unknown>(this.url(path), body)));
  }

  async put<S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.output<S>> {
    return parse(schema, await firstValueFrom(this.http.put<unknown>(this.url(path), body)));
  }

  async patch<S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.output<S>> {
    return parse(schema, await firstValueFrom(this.http.patch<unknown>(this.url(path), body)));
  }

  /** POST senza corpo di risposta significativo (es. logout). */
  async send(path: string, body: unknown = null): Promise<void> {
    await firstValueFrom(this.http.post(this.url(path), body, TEXT_RESPONSE));
  }

  async delete(path: string): Promise<void> {
    await firstValueFrom(this.http.delete(this.url(path), TEXT_RESPONSE));
  }
}
