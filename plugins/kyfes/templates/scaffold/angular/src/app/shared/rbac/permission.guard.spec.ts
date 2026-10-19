import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, RedirectCommand, type RouterStateSnapshot } from '@angular/router';
import { useMockUser } from '../../../mocks/handlers';
import { provideTestApp } from '../../../testing/providers';
import { permissionGuard } from './permission.guard';

function runGuard(action: 'read' | 'create') {
  TestBed.configureTestingModule({ providers: provideTestApp() });
  return TestBed.runInInjectionContext(() =>
    permissionGuard(action, 'Order')({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('permissionGuard', () => {
  it('consente la rotta con il permesso', async () => {
    useMockUser('viewer');
    await expect(runGuard('read')).resolves.toBe(true);
  });

  it('senza permesso mostra la pagina 403 mantenendo l’URL', async () => {
    useMockUser('viewer');
    const result = await runGuard('create');
    expect(result).toBeInstanceOf(RedirectCommand);
    const command = result as RedirectCommand;
    expect(command.redirectTo.toString()).toBe('/forbidden');
    expect(command.navigationBehaviorOptions?.skipLocationChange).toBe(true);
  });
});
