import type { Seller, Supervisor } from '@yandeh/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const SESSION_STORAGE_KEY = 'yandeh.session'

export type SessionActor =
  { kind: 'seller'; seller: Seller } | { kind: 'supervisor'; supervisor: Supervisor }

function readPersistedActor(): SessionActor | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as SessionActor
}

function writePersistedActor(actor: SessionActor | null): void {
  if (actor) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(actor))
    return
  }
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

/** Login simulado (A1): persiste o vendedor ou supervisor escolhido. */
export const useSessionStore = defineStore('session', () => {
  const actor = ref<SessionActor | null>(readPersistedActor())

  const hasSession = computed(() => actor.value !== null)
  const role = computed(() => actor.value?.kind ?? null)
  const sellerId = computed(() => (actor.value?.kind === 'seller' ? actor.value.seller.id : null))
  const supervisorId = computed(() =>
    actor.value?.kind === 'supervisor' ? actor.value.supervisor.id : null,
  )
  const homeRouteName = computed(() => (role.value === 'supervisor' ? 'approvals' : 'clients'))

  function signInSeller(seller: Seller): void {
    actor.value = { kind: 'seller', seller }
    writePersistedActor(actor.value)
  }

  function signInSupervisor(supervisor: Supervisor): void {
    actor.value = { kind: 'supervisor', supervisor }
    writePersistedActor(actor.value)
  }

  function signOut(): void {
    actor.value = null
    writePersistedActor(null)
  }

  return {
    actor,
    hasSession,
    role,
    sellerId,
    supervisorId,
    homeRouteName,
    signInSeller,
    signInSupervisor,
    signOut,
  }
})
