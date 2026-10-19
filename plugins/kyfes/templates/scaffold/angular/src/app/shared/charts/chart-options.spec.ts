import { buildCartesianOptions } from './chart-options';

describe('buildCartesianOptions', () => {
  it('applica palette, formatter Intl e tipo di serie', () => {
    const options = buildCartesianOptions(
      'bar',
      { categories: ['2026-01'], series: [{ name: 'Totale', values: [10] }] },
      ['#000'],
      (v) => `€${v}`,
    ) as { color: string[]; series: { type: string }[]; tooltip: { valueFormatter: (v: unknown) => string } };
    expect(options.color).toEqual(['#000']);
    expect(options.series[0]?.type).toBe('bar');
    expect(options.tooltip.valueFormatter(5)).toBe('€5');
  });
});
