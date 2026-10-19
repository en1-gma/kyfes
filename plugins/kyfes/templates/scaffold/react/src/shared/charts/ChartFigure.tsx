import { useId, type ReactNode } from 'react';
import { formatNumber, useTranslation } from '@/shared/i18n';
import type { ChartProps } from './types';

/**
 * Accessible frame shared by every chart: the SVG is a single image with an accessible name,
 * the data are also available as a table (colours are never the only source of information).
 */
export function ChartFigure({
  title,
  description,
  seriesLabel,
  data,
  formatValue = (v) => formatNumber(v),
  height = 280,
  children,
}: ChartProps & { children: ReactNode }) {
  const { t } = useTranslation();
  const descriptionId = useId();
  return (
    <figure className="chart">
      <figcaption className="chart__title">{title}</figcaption>
      {description && (
        <p id={descriptionId} className="chart__description">
          {description}
        </p>
      )}
      <div
        className="chart__canvas"
        role="img"
        aria-label={title}
        aria-describedby={description ? descriptionId : undefined}
        style={{ height }}
      >
        {children}
      </div>
      <details className="chart__data">
        <summary>{t('charts.showData')}</summary>
        <table>
          <caption className="visually-hidden">{title}</caption>
          <thead>
            <tr>
              <th scope="col">{t('charts.category')}</th>
              <th scope="col">{seriesLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.label}</th>
                <td>{formatValue(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
