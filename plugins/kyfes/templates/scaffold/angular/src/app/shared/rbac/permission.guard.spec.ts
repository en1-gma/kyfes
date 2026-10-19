import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, RedirectCommand, type RouterStateSnapshot } from '@angular/router';
import { useMockUser } from '../../../mocks/handlers';
import { provideTestApp } from '../../../testing/providers';
import { FORBIDDEN_PATH, permissionGuard } from './permission.guard';
import { Action, type Actions, Subject } from './subjects';

function runGuard(action: Actions) {
  TestBed.configureTestingModule({ providers: provideTestApp() });
  return TestBed.runInInjectionContext(() =>
    permissionGuard(action, Subject.Order)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('permissionGuard', () => {
  it('consente la rotta con il permesso', async () => {
    useMockUser('viewer');
    await expect(runGuard(Action.Read)).resolves.toBe(true);
  });

  it('senza permesso mostra la pagina 403 mantenendo l’URL', async () => {
    useMockUser('viewer');
    const result = await runGuard(Action.Create);
    expect(result).toBeInstanceOf(RedirectCommand);
    const command = result as RedirectCommand;
    expect(command.redirectTo.toString()).toBe(FORBIDDEN_PATH);
    expect(command.navigationBehaviorOptions?.skipLocationChange).toBe(true);
  });
});
