import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { take } from 'rxjs';

/** Il `title` delle rotte è una chiave i18n (es. `common.nav.orders`). */
@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    if (!key) return;
    this.transloco
      .selectTranslate(key)
      .pipe(take(1))
      .subscribe((page: string) => {
        this.title.setTitle(this.transloco.translate('common.app.pageTitle', { page }));
      });
  }
}
