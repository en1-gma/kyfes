import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ordersMessages } from '@/features/orders';
import { COMMON_NS, I18nNamespaces, getTranslations } from '@/shared/i18n/server';
import { OrdersGuard } from './OrdersGuard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations(COMMON_NS);
  return { title: t('nav.orders') };
}

/** Orders section: lazy `orders` namespace + guard (auth + read Order). */
export default function OrdersLayout({ children }: { children: ReactNode }) {
  return (
    <I18nNamespaces loaders={[ordersMessages]}>
      <OrdersGuard>{children}</OrdersGuard>
    </I18nNamespaces>
  );
}
