'use client';

import dynamic from 'next/dynamic';
import { useFormatters } from '@/shared/i18n';
import { Spinner } from '@/shared/ui';
import { ChartFrame } from './ChartFrame';
import type { ChartCanvasProps, ChartProps } from './types';

// Recharts is code-split and client-only (no SSR markup with inline styles under the CSP).
const ChartCanvas = dynamic<ChartCanvasProps>(() => import('./ChartCanvas'), {
  ssr: false,
  loading: () => <Spinner />,
});

const DEFAULT_HEIGHT = 280;

function Chart({ kind, ...props }: ChartProps & { kind: ChartCanvasProps['kind'] }) {
  const { formatNumber } = useFormatters();
  const formatX = props.formatX ?? ((v: string | number) => String(v));
  const formatValue = props.formatValue ?? ((v: number) => formatNumber(v));
  return (
    <ChartFrame {...props} formatX={formatX} formatValue={formatValue}>
      <ChartCanvas
        kind={kind}
        data={props.data}
        xKey={props.xKey}
        series={props.series}
        formatX={formatX}
        formatValue={formatValue}
        height={props.height ?? DEFAULT_HEIGHT}
      />
    </ChartFrame>
  );
}

/** Accessible, lazily-loaded bar chart (palette from CSS tokens, Intl formatting). */
export function BarChart(props: ChartProps) {
  return <Chart kind="bar" {...props} />;
}

/** Accessible, lazily-loaded line / time-series chart. */
export function LineChart(props: ChartProps) {
  return <Chart kind="line" {...props} />;
}
