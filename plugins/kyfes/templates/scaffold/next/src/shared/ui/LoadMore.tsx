'use client';

import { useTranslations } from '@/shared/i18n';
import { Button } from './Button';
import styles from './ui.module.css';

export interface LoadMoreProps {
  /** Already translated "N items loaded" text, announced to screen readers. */
  summary: string;
  query: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => Promise<unknown>;
  };
}

/** Footer of a cursor-paginated list: loaded count + "load more" while `nextCursor` is present. */
export function LoadMore({ summary, query }: LoadMoreProps) {
  const t = useTranslations('common');
  return (
    <div className={styles.loadMore}>
      <p className={styles.muted} aria-live="polite">
        {summary}
      </p>
      {query.hasNextPage ? (
        <Button
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          aria-busy={query.isFetchingNextPage || undefined}
        >
          {t('actions.loadMore')}
        </Button>
      ) : null}
    </div>
  );
}
