import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input } from '@angular/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { I18nService, TranslocoPipe, formatCurrency, formatNumber } from '@shared/i18n';
import {
  type ChartKind,
  type ChartSeries,
  type ChartValueFormat,
  buildCartesianOptions,
  readPalette,
} from './chart-options';

/**
 * Cornice accessibile comune ai grafici: `role="img"` + `aria-label` sul disegno,
 * tabella alternativa (visivamente nascosta) con gli stessi dati.
 */
@Component({
  selector: 'app-chart-frame',
  imports: [NgxEchartsDirective, TranslocoPipe],
  providers: [provideEchartsCore({ echarts: () => import('./echarts-setup').then((m) => m.echarts) })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="chart">
      <div
        class="chart__canvas"
        role="img"
        [attr.aria-label]="title()"
        echarts
        [options]="options()"
        [autoResize]="true"
      ></div>
      <figcaption class="visually-hidden">
        <table>
          <caption>
            {{
              'common.chart.tableCaption' | transloco: { title: title() }
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'common.chart.category' | transloco }}</th>
              @for (s of series(); track s.name) {
                <th scope="col">{{ s.name }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (category of categories(); track category; let i = $index) {
              <tr>
                <th scope="row">{{ category }}</th>
                @for (s of series(); track s.name) {
                  <td>{{ format(s.values[i] ?? 0) }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </figcaption>
    </figure>
  `,
})
export class ChartFrameComponent {
  readonly kind = input.required<ChartKind>();
  /** Titolo già tradotto: diventa l'aria-label del grafico e la didascalia della tabella. */
  readonly title = input.required<string>();
  readonly categories = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly valueFormat = input<ChartValueFormat>('number');
  readonly currency = input('EUR');

  private readonly i18n = inject(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly format = (value: number): string =>
    this.valueFormat() === 'currency'
      ? formatCurrency(value, this.i18n.lang(), this.currency())
      : formatNumber(value, this.i18n.lang());

  protected readonly options = computed(() =>
    buildCartesianOptions(
      this.kind(),
      { categories: this.categories(), series: this.series() },
      readPalette(this.host.nativeElement as Element),
      (value) => this.format(value),
    ),
  );
}
