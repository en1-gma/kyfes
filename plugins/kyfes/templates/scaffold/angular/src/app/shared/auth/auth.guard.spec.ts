import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { errorHandlers } from '../../../mocks/handlers';
import { server } from '../../../mocks/node';
import { type FakeBrowserLocation, provideTestApp } from '../../../testing/providers';
import { authGuard } from './auth.guard';
import { BrowserLocation } from './auth.service';

@Component({ selector: 'app-dummy', template: '' })
class DummyComponent {}

describe('authGuard + onUnauthorized', () => {
  it('su 401 un solo redirect al login, con il returnTo della navigazione in corso', async () => {
    server.use(errorHandlers.unauthenticated);
    TestBed.configureTestingModule({
      providers: [
        ...provideTestApp(),
        provideRouter([{ path: 'orders', canActivate: [authGuard], component: DummyComponent }]),
      ],
    });
    const location = TestBed.inject(BrowserLocation) as unknown as FakeBrowserLocation;
    const navigated = await TestBed.inject(Router).navigateByUrl('/orders?status=draft');

    expect(navigated).toBe(false);
    expect(location.visited).toEqual([
      `/api/auth/login?returnTo=${encodeURIComponent('/orders?status=draft')}`,
    ]);
  });
});
