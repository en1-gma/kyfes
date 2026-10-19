import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import * as z from 'zod';
import { ApiClient } from './api-client';
import { ApiError } from './api-error';
import { ApiEvents } from './api-events';
import { provideApi } from './http';

function setup(options: Parameters<typeof provideApi>[0] = {}) {
  TestBed.configureTestingModule({ providers: [provideApi(options), provideHttpClientTesting()] });
  return {
    api: TestBed.inject(ApiClient),
    http: TestBed.inject(HttpClient),
    events: TestBed.inject(ApiEvents),
    backend: TestBed.inject(HttpTestingController),
  };
}

const Item = z.object({ id: z.string() });

describe('client HTTP (shared/api)', () => {
  afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('usa baseURL /api, withCredentials, Accept JSON e timeout', async () => {
    const { api, backend } = setup();
    const promise = api.get('/orders/1', Item);
    const req = backend.expectOne('/api/orders/1');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('Accept')).toBe('application/json');
    expect(req.request.timeout).toBeGreaterThan(0);
    req.flush({ id: '1' });
    await expect(promise).resolves.toEqual({ id: '1' });
  });

  it('invia X-XSRF-TOKEN dal cookie XSRF-TOKEN solo sui metodi non sicuri della stessa origine', async () => {
    const { http, backend } = setup();
    document.cookie = 'XSRF-TOKEN=tok123; path=/';

    const post = firstValueFrom(http.post('/api/orders', {}));
    const postReq = backend.expectOne('/api/orders');
    expect(postReq.request.headers.get('X-XSRF-TOKEN')).toBe('tok123');
    postReq.flush({});
    await post;

    const get = firstValueFrom(http.get('/api/orders'));
    const getReq = backend.expectOne('/api/orders');
    expect(getReq.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    getReq.flush({});
    await get;

    const cross = firstValueFrom(http.post('https://other.example.com/x', {}));
    const crossReq = backend.expectOne('https://other.example.com/x');
    expect(crossReq.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    crossReq.flush({});
    await cross;
  });

  it('normalizza gli errori in ApiError con correlationId', async () => {
    const { api, backend } = setup();
    const promise = api.get('/orders', Item);
    backend
      .expectOne('/api/orders')
      .flush(
        { code: 'INTERNAL', message: 'Boom', correlationId: 'corr-42' },
        { status: 500, statusText: 'Server Error' },
      );
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, code: 'INTERNAL', correlationId: 'corr-42' });
  });

  it('una risposta che non rispetta lo schema diventa ApiError INVALID_RESPONSE', async () => {
    const { api, backend } = setup();
    const promise = api.get('/orders/1', Item);
    backend.expectOne('/api/orders/1').flush({ wrong: true });
    await expect(promise).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('su 401 chiama la callback onUnauthorized', async () => {
    const { api, events, backend } = setup();
    const onUnauthorized = vi.fn();
    events.onUnauthorized(onUnauthorized);
    const promise = api.get('/orders', Item);
    backend
      .expectOne('/api/orders')
      .flush({ code: 'UNAUTHENTICATED', message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    await expect(promise).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('con refreshSession: un solo refresh per più 401 e ripetizione una sola volta', async () => {
    const { api, events, backend } = setup({ refreshSession: true });
    const onUnauthorized = vi.fn();
    events.onUnauthorized(onUnauthorized);
    const a = api.get('/a', Item);
    const b = api.get('/b', Item);
    backend.expectOne('/api/a').flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/b').flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/auth/refresh').flush(null);
    backend.expectOne('/api/a').flush({ id: 'a' });
    backend.expectOne('/api/b').flush({ id: 'b' });
    await expect(Promise.all([a, b])).resolves.toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('su 403 emette onForbidden', async () => {
    const { api, events, backend } = setup();
    const onForbidden = vi.fn();
    events.onForbidden(onForbidden);
    const promise = api.get('/orders', Item);
    backend
      .expectOne('/api/orders')
      .flush({ code: 'FORBIDDEN', message: 'x' }, { status: 403, statusText: 'Forbidden' });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    expect(onForbidden).toHaveBeenCalledTimes(1);
  });
});
