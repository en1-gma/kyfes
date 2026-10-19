import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CartesianChart } from './cartesian-chart';
import { ChartFrameComponent } from './chart-frame.component';

/** Da usare dentro un blocco `@defer`: ECharts viene caricato solo quando serve. */
@Component({
  selector: 'app-bar-chart',
  imports: [ChartFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-chart-frame
    kind="bar"
    [title]="title()"
    [categories]="categories()"
    [series]="series()"
    [valueFormat]="valueFormat()"
    [currency]="currency()"
  />`,
})
export class BarChartComponent extends CartesianChart {}
