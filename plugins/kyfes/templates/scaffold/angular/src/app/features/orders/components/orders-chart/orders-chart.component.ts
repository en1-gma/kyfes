import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BarChartComponent } from '@shared/charts';
import { I18nService, TranslocoPipe, formatDate } from '@shared/i18n';
import { QueryStateComponent, SpinnerComponent } from '@shared/ui';
import { injectOrderStats } from '../../api/orders.queries';

/** Totali per mese. Il grafico (ECharts) è in un blocco @defer: chunk separato, caricato in lazy. */
@Component({
  selector: 'app-orders-chart',
  imports: [BarChartComponent, TranslocoPipe, QueryStateComponent, SpinnerComponent],
  templateUrl: './orders-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersChartComponent {
  private readonly i18n = inject(I18nService);
  protected readonly stats = injectOrderStats();

  protected readonly categories = computed(() => {
    const lang = this.i18n.lang();
    return (this.stats.data()?.categories ?? []).map((month) =>
      formatDate(`${month}-01T00:00:00Z`, lang, { month: 'short', year: 'numeric', timeZone: 'UTC' }),
    );
  });
  protected readonly values = computed(() => this.stats.data()?.values ?? []);
}
