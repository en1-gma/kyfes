import { lazy, Suspense } from 'react';
import { Spinner } from '@/shared/ui';
import type { ChartProps } from './types';

// Recharts is loaded only when a chart is rendered (separate chunk, kyfes §7).
const LazyCartesian = lazy(() => import('./CartesianChart'));

export function BarChart(props: ChartProps) {
  return (
    <Suspense fallback={<Spinner />}>
      <LazyCartesian variant="bar" {...props} />
    </Suspense>
  );
}

export function LineChart(props: ChartProps) {
  return (
    <Suspense fallback={<Spinner />}>
      <LazyCartesian variant="line" {...props} />
    </Suspense>
  );
}
