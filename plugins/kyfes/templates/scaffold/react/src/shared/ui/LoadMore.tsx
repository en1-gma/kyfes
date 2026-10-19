import { useTranslation } from '@/shared/i18n';
import { Button } from './Button';

interface LoadMoreProps {
  /** Already translated "N items loaded" text, announced to screen readers. */
  summary: string;
  query: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => Promise<unknown> };
}

/** Footer of a cursor-paginated list: loaded count + "load more" while `nextCursor` is present. */
export function LoadMore({ summary, query }: LoadMoreProps) {
  const { t } = useTranslation();
  return (
    <>
      <p className="muted" aria-live="polite">
        {summary}
      </p>
      {query.hasNextPage && (
        <Button busy={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t('actions.loadMore')}
        </Button>
      )}
    </>
  );
}
