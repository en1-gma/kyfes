import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarChart, LineChart } from './index';

const data = [
  { label: 'gen 2026', value: 1200 },
  { label: 'feb 2026', value: 900 },
];

describe.each([
  ['BarChart', BarChart],
  ['LineChart', LineChart],
])('%s', (_name, Chart) => {
  it('is an accessible image with a data table alternative', async () => {
    render(
      <Chart
        title="Totals"
        description="Two months"
        seriesLabel="Total"
        data={data}
        formatValue={(v) => `€${v}`}
      />,
    );
    const img = await screen.findByRole('img', { name: 'Totals' });
    expect(img).toHaveAccessibleDescription('Two months');
    expect(screen.getByRole('rowheader', { name: 'gen 2026' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '€1200' })).toBeInTheDocument();
  });
});
