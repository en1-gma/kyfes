import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http as mswHttp, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { errorHandlers } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { sessions } from '@/mocks/data';
import { createQueryClient, http } from '@/shared/api';
import { buildAbility } from '@/shared/rbac';
import { invalidateSession, useSession } from './session';
import { SessionSchema } from './session.schema';

/** Same wiring as app/providers.tsx: a 403 invalidates the session. */
function setup() {
  const queryClient = createQueryClient({
    onForbidden: () => void invalidateSession(queryClient),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('session query', () => {
  it('a 403 on /auth/me does not invalidate the session in a loop', async () => {
    let calls = 0;
    server.use(
      mswHttp.get('/api/auth/me', () => {
        calls += 1;
        return HttpResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(calls).toBeGreaterThanOrEqual(1);
    expect(calls).toBeLessThanOrEqual(2);
  });

  it('a 403 elsewhere still invalidates the session (permissions may have changed)', async () => {
    let calls = 0;
    server.use(
      mswHttp.get('/api/auth/me', () => {
        calls += 1;
        return HttpResponse.json(sessions.manager);
      }),
    );
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    server.use(errorHandlers.ordersForbidden);
    await queryClient
      .fetchQuery({ queryKey: ['orders-probe'], queryFn: () => http.get('/orders') })
      .catch(() => undefined);
    await waitFor(() => expect(calls).toBe(2));
  });

  it('returns null (anonymous) on 401 when the refresh fails', async () => {
    server.use(mswHttp.get('/api/auth/me', () => HttpResponse.json({}, { status: 401 })));
    const { wrapper } = setup();
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe('SessionSchema', () => {
  const base = sessions.manager;

  it.each(['fr', null, 42])('turns an unknown or null locale (%s) into undefined', (locale) => {
    const parsed = SessionSchema.parse({ ...base, locale });
    expect(parsed.locale).toBeUndefined();
    expect(parsed.user.id).toBe(base.user.id);
  });

  it('keeps a supported locale', () => {
    expect(SessionSchema.parse({ ...base, locale: 'en' }).locale).toBe('en');
  });

  it('accepts rules with unknown subjects/actions: they simply never match', () => {
    const parsed = SessionSchema.parse({
      ...base,
      rules: [
        { action: 'approve', subject: 'Invoice' },
        { action: 'read', subject: 'Order' },
      ],
    });
    const ability = buildAbility(parsed.rules);
    expect(ability.can('read', 'Order')).toBe(true);
    expect(ability.can('update', 'Order')).toBe(false);
  });
});
