import { Directive, input } from '@angular/core';
import type { ChartSeries, ChartValueFormat } from './chart-options';

/** Input comuni dei grafici cartesiani (BarChart, LineChart). */
@Directive()
export abstract class CartesianChart {
  /** Titolo già tradotto (aria-label + didascalia della tabella alternativa). */
  readonly title = input.required<string>();
  readonly categories = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly valueFormat = input<ChartValueFormat>('number');
  readonly currency = input('EUR');
}
