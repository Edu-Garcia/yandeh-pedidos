import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from '@/stores/session'
import { NOT_FOUND_NAME, registerSessionGuard, routes } from './index'

const carlos = {
  id: 'V01',
  name: 'Carlos Menezes',
  supervisorId: 'S01',
  discountAuthorityPercent: 5,
}

const marta = { id: 'S01', name: 'Marta Fernandes' }

async function mountRouter() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes })
  registerSessionGuard(router)
  const app = createApp({ template: '<div />' })
  app.use(pinia)
  app.use(router)
  await router.push('/')
  await router.isReady()
  return { router }
}

describe('session route guard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('permite a tela de seleção sem sessão', async () => {
    const { router } = await mountRouter()
    await router.push({ name: 'seller-select' })
    expect(router.currentRoute.value.name).toBe('seller-select')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('redireciona /clientes para a seleção quando não há sessão', async () => {
    const { router } = await mountRouter()
    await router.push('/clientes')
    expect(router.currentRoute.value.name).toBe('seller-select')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('redireciona URL inexistente para a seleção quando não há sessão', async () => {
    const { router } = await mountRouter()
    await router.push('/nao-existe')
    expect(router.currentRoute.value.name).toBe('seller-select')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('permite /clientes com sessão de vendedor', async () => {
    const { router } = await mountRouter()
    useSessionStore().signInSeller(carlos)
    await router.push('/clientes')
    expect(router.currentRoute.value.name).toBe('clients')
    expect(router.currentRoute.value.path).toBe('/clientes')
  })

  it('permite /supervisor com sessão de supervisor', async () => {
    const { router } = await mountRouter()
    useSessionStore().signInSupervisor(marta)
    await router.push('/supervisor')
    expect(router.currentRoute.value.name).toBe('approvals')
    expect(router.currentRoute.value.path).toBe('/supervisor')
  })

  it('vendedor em /supervisor vê 404 e mantém a URL', async () => {
    const { router } = await mountRouter()
    useSessionStore().signInSeller(carlos)
    await router.push('/supervisor')
    expect(router.currentRoute.value.name).toBe(NOT_FOUND_NAME)
    expect(router.currentRoute.value.path).toBe('/supervisor')
  })

  it('supervisor em /clientes vê 404 e mantém a URL', async () => {
    const { router } = await mountRouter()
    useSessionStore().signInSupervisor(marta)
    await router.push('/clientes')
    expect(router.currentRoute.value.name).toBe(NOT_FOUND_NAME)
    expect(router.currentRoute.value.path).toBe('/clientes')
  })

  it('vendedor em URL inexistente vê o mesmo 404', async () => {
    const { router } = await mountRouter()
    useSessionStore().signInSeller(carlos)
    await router.push('/nao-existe')
    expect(router.currentRoute.value.name).toBe(NOT_FOUND_NAME)
    expect(router.currentRoute.value.path).toBe('/nao-existe')
  })
})
