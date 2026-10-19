import { Link } from 'react-router';
import { useTranslation } from '@/shared/i18n';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="page state">
      <title>{t('notFound.title')}</title>
      <h1 className="state__title">{t('notFound.title')}</h1>
      <p>{t('notFound.message')}</p>
      <Link to="/">{t('notFound.home')}</Link>
    </div>
  );
}
