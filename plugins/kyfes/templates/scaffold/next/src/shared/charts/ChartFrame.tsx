'use client';

import { useId, type ReactNode } from 'react';
import { useTranslations } from '@/shared/i18n';
import type { ChartDatum, ChartSeries } from './types';
import styles from './charts.module.css';

interface ChartFrameProps {
  title: string;
  summary?: string;
  data: readonly ChartDatum[];
  xKey: string;
  series: readonly ChartSeries[];
  formatX: (value: string | number) => string;
  formatValue: (value: number) => string;
  children: ReactNode;
}

/**
 * Accessible frame shared by all charts: role="img" + aria-label on the graphic,
 * visible caption, optional summary and a data table alternative.
 */
export function ChartFrame({
  title,
  summary,
  data,
  xKey,
  series,
  formatX,
  formatValue,
  children,
}: ChartFrameProps) {
  const t = useTranslations('common');
  const captionId = useId();
  return (
    <figure className={styles.figure} aria-labelledby={captionId}>
      <figcaption id={captionId} className={styles.caption}>
        {title}
      </figcaption>
      <div role="img" aria-label={title} className={styles.canvas}>
        {children}
      </div>
      {summary ? <p>{summary}</p> : null}
      <details>
        <summary>{t('charts.showData')}</summary>
        <table className={styles.table}>
          <caption className="visually-hidden">{title}</caption>
          <thead>
            <tr>
              <th scope="col">{t('charts.label')}</th>
              {series.map((s) => (
                <th key={s.key} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const x = row[xKey];
              return (
                <tr key={`${String(x)}-${i}`}>
                  <th scope="row">{x === undefined ? '' : formatX(x)}</th>
                  {series.map((s) => {
                    const v = row[s.key];
                    return (
                      <td key={s.key}>{typeof v === 'number' ? formatValue(v) : (v ?? '')}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
