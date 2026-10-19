'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { readChartPalette } from './palette';
import { CHART_KIND, type ChartCanvasProps } from './types';

/** The only module importing Recharts (loaded lazily by ./Charts). */
export default function ChartCanvas({
  kind,
  data,
  xKey,
  series,
  formatX,
  formatValue,
  height,
}: ChartCanvasProps) {
  const [colors] = useState(readChartPalette);
  const color = (i: number) => colors[i % colors.length];
  const axes = [
    <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--color-border)" />,
    <XAxis key="x" dataKey={xKey} tickFormatter={formatX} />,
    <YAxis key="y" tickFormatter={formatValue} width={80} />,
    <Tooltip
      key="tooltip"
      formatter={(value) => (typeof value === 'number' ? formatValue(value) : String(value))}
      labelFormatter={(label) => formatX(label as string | number)}
    />,
    series.length > 1 ? <Legend key="legend" /> : null,
  ];
  const rows = [...data];

  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === CHART_KIND.bar ? (
        <BarChart data={rows} accessibilityLayer={false}>
          {axes}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={color(i)} />
          ))}
        </BarChart>
      ) : (
        <LineChart data={rows} accessibilityLayer={false}>
          {axes}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={color(i)}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
