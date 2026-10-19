import { OrderDetail } from '@/features/orders';

export default async function OrderDetailPage({ params }: PageProps<'/orders/[id]'>) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
