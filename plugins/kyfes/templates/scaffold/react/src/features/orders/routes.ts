/** Paths of the feature, shared by the router (app) and the links of the components. */
export const orderPaths = {
  list: '/orders',
  new: '/orders/new',
  detail: (id: string) => `/orders/${encodeURIComponent(id)}`,
  edit: (id: string) => `/orders/${encodeURIComponent(id)}/edit`,
} as const;
