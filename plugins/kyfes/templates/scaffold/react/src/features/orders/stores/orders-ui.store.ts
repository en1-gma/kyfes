import { create } from 'zustand';
import type { OrderListFilters, OrderStatus } from '../model/orders.schema';

/** UI-only state of the orders list (filters): never copies of server data (kyfes §4.2). */
interface OrdersUiState {
  status: OrderStatus | undefined;
  sort: NonNullable<OrderListFilters['sort']>;
  setStatus: (status: OrderStatus | undefined) => void;
  setSort: (sort: NonNullable<OrderListFilters['sort']>) => void;
  reset: () => void;
}

const initial = { status: undefined, sort: 'createdAt:desc' } as const;

export const useOrdersUiStore = create<OrdersUiState>()((set) => ({
  ...initial,
  setStatus: (status) => {
    set({ status });
  },
  setSort: (sort) => {
    set({ sort });
  },
  reset: () => {
    set(initial);
  },
}));
