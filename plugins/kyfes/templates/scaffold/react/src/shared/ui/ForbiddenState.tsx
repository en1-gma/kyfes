import { useTranslation } from '@/shared/i18n';

export function ForbiddenState() {
  const { t } = useTranslation();
  return (
    <section className="state state--forbidden" aria-labelledby="forbidden-title">
      <h1 id="forbidden-title" className="state__title">
        {t('forbidden.title')}
      </h1>
      <p>{t('forbidden.message')}</p>
    </section>
  );
}
