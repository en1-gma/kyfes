import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@shared/i18n';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink, TranslocoPipe, ButtonComponent],
  templateUrl: './forbidden-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPageComponent {}
