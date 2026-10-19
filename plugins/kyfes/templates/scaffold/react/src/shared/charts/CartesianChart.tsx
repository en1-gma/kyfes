import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber } from '@/shared/i18n';
import { ChartFigure } from './ChartFigure';
import {
  CHART_COLORS,
  CHART_DATUM_KEY,
  CHART_VARIANT,
  type CartesianVariant,
  type ChartProps,
} from './types';

/** Single Recharts implementation behind BarChart and LineChart (same axes, grid, tooltip). */
export default function CartesianChart({ variant, ...props }: ChartProps & { variant: CartesianVariant }) {
  const format = props.formatValue ?? ((v: number) => formatNumber(v));
  return (
    <ChartFigure {...props} formatValue={format}>
      <ComposedChart
        responsive
        data={[...props.data]}
        style={{ width: '100%', height: '100%' }}
        accessibilityLayer={false}
      >
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey={CHART_DATUM_KEY.label} stroke="var(--color-text-muted)" tickLine={false} />
        <YAxis stroke="var(--color-text-muted)" tickFormatter={format} width={88} />
        <Tooltip formatter={(value) => [format(Number(value)), props.seriesLabel]} />
        {variant === CHART_VARIANT.bar ? (
          <Bar
            dataKey={CHART_DATUM_KEY.value}
            name={props.seriesLabel}
            fill={CHART_COLORS[0]}
            radius={[4, 4, 0, 0]}
          />
        ) : (
          <Line
            type="monotone"
            dataKey={CHART_DATUM_KEY.value}
            name={props.seriesLabel}
            stroke={CHART_COLORS[1]}
            strokeWidth={2}
            dot
          />
        )}
      </ComposedChart>
    </ChartFigure>
  );
}
