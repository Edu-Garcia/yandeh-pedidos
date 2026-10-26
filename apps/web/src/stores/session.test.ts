import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEY, useSessionStore } from './session'

const carlos = {
  id: 'V01',
  name: 'Carlos Menezes',
  supervisorId: 'S01',
  discountAuthorityPercent: 5,
}

const marta = { id: 'S01', name: 'Marta Fernandes' }

describe('session store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('começa sem sessão', () => {
    const session = useSessionStore()
    expect(session.hasSession).toBe(false)
    expect(session.sellerId).toBeNull()
    expect(session.actor).toBeNull()
  })

  it('persiste V01 e restaura depois de um reload', () => {
    const session = useSessionStore()
    session.signInSeller(carlos)

    expect(session.hasSession).toBe(true)
    expect(session.role).toBe('seller')
    expect(session.sellerId).toBe('V01')
    expect(session.homeRouteName).toBe('clients')
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toContain('V01')

    setActivePinia(createPinia())
    const restored = useSessionStore()
    expect(restored.hasSession).toBe(true)
    expect(restored.sellerId).toBe('V01')
    expect(restored.actor).toEqual({ kind: 'seller', seller: carlos })
  })

  it('persiste S01 sem enviar X-Seller-Id (sellerId nulo)', () => {
    const session = useSessionStore()
    session.signInSupervisor(marta)

    expect(session.hasSession).toBe(true)
    expect(session.role).toBe('supervisor')
    expect(session.sellerId).toBeNull()
    expect(session.homeRouteName).toBe('approvals')
    expect(session.actor).toEqual({ kind: 'supervisor', supervisor: marta })

    setActivePinia(createPinia())
    const restored = useSessionStore()
    expect(restored.actor).toEqual({ kind: 'supervisor', supervisor: marta })
    expect(restored.sellerId).toBeNull()
  })

  it('signOut limpa a persistência', () => {
    const session = useSessionStore()
    session.signInSeller(carlos)
    session.signOut()

    expect(session.hasSession).toBe(false)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})
