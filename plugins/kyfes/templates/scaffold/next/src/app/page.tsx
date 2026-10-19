import { redirect } from 'next/navigation';
import { orderPaths } from '@/features/orders';

export default function HomePage() {
  redirect(orderPaths.list);
}
