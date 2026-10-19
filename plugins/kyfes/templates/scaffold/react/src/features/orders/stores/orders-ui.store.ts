import { create } from 'zustand';
import { DEFAULT_ORDER_SORT, type OrderSort, type OrderStatus } from '../constants';

/** UI-only state of the orders list (filters): never copies of server data (kyfes §4.2). */
interface OrdersUiState {
  status: OrderStatus | undefined;
  sort: OrderSort;
  setStatus: (status: OrderStatus | undefined) => void;
  setSort: (sort: OrderSort) => void;
  reset: () => void;
}

const initial = { status: undefined, sort: DEFAULT_ORDER_SORT };

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
