import { Directive, TemplateRef, ViewContainerRef, computed, effect, inject, input } from '@angular/core';
import { injectCan } from './ability';
import type { Actions, AppSubject } from './subjects';

/**
 * Mostra il contenuto solo se l'utente ha il permesso.
 * `<button *appCan="Action.Create; on: ORDER_SUBJECT">…` · `*appCan="Action.Update; on: orderSubject(o); field: ORDER_FIELDS.status"`
 */
@Directive({ selector: '[appCan]' })
export class CanDirective {
  readonly appCan = input.required<Actions>();
  readonly appCanOn = input.required<AppSubject>();
  readonly appCanField = input<string>();

  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private readonly can = injectCan();
  private readonly allowed = computed(() => this.can(this.appCan(), this.appCanOn(), this.appCanField()));
  private rendered = false;

  constructor() {
    effect(() => {
      const allowed = this.allowed();
      if (allowed && !this.rendered) {
        this.container.createEmbeddedView(this.template);
        this.rendered = true;
      } else if (!allowed && this.rendered) {
        this.container.clear();
        this.rendered = false;
      }
    });
  }
}
