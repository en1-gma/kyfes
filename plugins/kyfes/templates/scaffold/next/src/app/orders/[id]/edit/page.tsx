import { EditOrder } from '@/features/orders';
import { OrderEditGuard } from './OrderEditGuard';

export default async function EditOrderPage({ params }: PageProps<'/orders/[id]/edit'>) {
  const { id } = await params;
  return (
    <OrderEditGuard>
      <EditOrder id={id} />
    </OrderEditGuard>
  );
}
