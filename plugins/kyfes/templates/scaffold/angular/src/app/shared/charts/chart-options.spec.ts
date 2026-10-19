import { buildCartesianOptions, buildTooltipContent } from './chart-options';

describe('buildCartesianOptions', () => {
  it('applica palette, formatter Intl e tipo di serie', () => {
    const options = buildCartesianOptions(
      'bar',
      { categories: ['2026-01'], series: [{ name: 'Totale', values: [10] }] },
      ['#000'],
      (v) => `€${v}`,
    ) as {
      color: string[];
      series: { type: string }[];
      tooltip: { className: string; formatter: (p: unknown) => HTMLElement };
    };
    expect(options.color).toEqual(['#000']);
    expect(options.series[0]?.type).toBe('bar');
    expect(options.tooltip.className).toBe('chart-tooltip');
    const content = options.tooltip.formatter([
      { seriesIndex: 0, seriesName: 'Totale', axisValueLabel: 'gen', value: 5 },
    ]);
    expect(content.textContent).toContain('€5');
  });
});

describe('buildTooltipContent', () => {
  it('costruisce il tooltip con classi CSS e senza style inline (CSP)', () => {
    const content = buildTooltipContent(
      [
        { seriesIndex: 0, seriesName: 'Totale', axisValueLabel: 'gen 2026', value: 1200 },
        { seriesIndex: 7, seriesName: '<b>x</b>', axisValueLabel: 'gen 2026', value: 3 },
      ],
      (v) => `€ ${v}`,
      6,
    );
    expect(content.outerHTML).not.toContain('style=');
    expect(content.querySelector('.chart-tooltip__title')?.textContent).toBe('gen 2026');
    expect(content.querySelectorAll('.chart-tooltip__row')).toHaveLength(2);
    expect(content.querySelector('.chart-tooltip__marker--2')).not.toBeNull();
    // Testo, non HTML: i nomi delle serie non diventano markup.
    expect(content.querySelector('b')).toBeNull();
    expect(content.textContent).toContain('€ 1200');
  });
});
