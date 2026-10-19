import { Directive, input } from '@angular/core';
import { DEFAULT_CURRENCY } from '@shared/i18n';
import { CHART_VALUE_FORMAT, type ChartSeries, type ChartValueFormat } from './chart-options';

/** Input comuni dei grafici cartesiani (BarChart, LineChart). */
@Directive()
export abstract class CartesianChart {
  /** Titolo già tradotto (aria-label + didascalia della tabella alternativa). */
  readonly title = input.required<string>();
  readonly categories = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly valueFormat = input<ChartValueFormat>(CHART_VALUE_FORMAT.number);
  readonly currency = input(DEFAULT_CURRENCY);
}
