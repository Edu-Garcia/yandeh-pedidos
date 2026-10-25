import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'seller-select', component: () => import('@/pages/SellerSelectPage.vue') },
    { path: '/clientes', name: 'clients', component: () => import('@/pages/ClientsPage.vue') },
    {
      path: '/clientes/:clientId/pedido',
      name: 'order',
      component: () => import('@/pages/OrderPage.vue'),
      props: true,
    },
    {
      path: '/supervisor',
      name: 'approvals',
      component: () => import('@/pages/ApprovalsPage.vue'),
    },
  ],
})
