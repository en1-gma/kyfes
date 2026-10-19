import { create } from 'zustand';
import type { OrderStatus } from '../model/orders.schema';

/** UI-only state of the orders list (filters). Never a copy of server data. */
interface OrdersUiState {
  status: OrderStatus | undefined;
  setStatus: (status: OrderStatus | undefined) => void;
}

export const useOrdersUiStore = create<OrdersUiState>()((set) => ({
  status: undefined,
  setStatus: (status) => set({ status }),
}));
