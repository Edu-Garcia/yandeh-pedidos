import { createRouter, createWebHistory, type RouteRecordRaw, type Router } from 'vue-router'
import { useSessionStore } from '@/stores/session'

export const NOT_FOUND_NAME = 'not-found'

export function pathMatchParams(path: string): string[] {
  return path.split('/').filter(Boolean)
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'seller-select',
    component: () => import('@/pages/SellerSelectPage.vue'),
    meta: { public: true },
  },
  {
    path: '/clientes',
    name: 'clients',
    component: () => import('@/pages/ClientsPage.vue'),
    meta: { role: 'seller' },
  },
  {
    path: '/clientes/:clientId/pedido',
    name: 'order',
    component: () => import('@/pages/OrderPage.vue'),
    props: true,
    meta: { role: 'seller' },
  },
  {
    path: '/supervisor',
    name: 'approvals',
    component: () => import('@/pages/ApprovalsPage.vue'),
    meta: { role: 'supervisor' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: NOT_FOUND_NAME,
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]

export function registerSessionGuard(router: Router): void {
  router.beforeEach((to) => {
    const session = useSessionStore()

    if (!session.hasSession) {
      if (to.meta.public) return true
      return { name: 'seller-select', replace: true }
    }

    if (to.meta.public) return true

    const required = to.meta.role
    if (required && required !== session.role) {
      return {
        name: NOT_FOUND_NAME,
        params: { pathMatch: pathMatchParams(to.path) },
        replace: true,
      }
    }

    return true
  })
}

export function createAppRouter(): Router {
  const router = createRouter({
    history: createWebHistory(),
    routes,
  })
  registerSessionGuard(router)
  return router
}
