<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOnlineStore } from '@/stores/online'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const connection = useOnlineStore()
const router = useRouter()

const label = computed(() => {
  const actor = session.actor
  if (actor?.kind === 'seller') return `${actor.seller.id} ${actor.seller.name}`
  if (actor?.kind === 'supervisor') return `${actor.supervisor.id} ${actor.supervisor.name}`
  return ''
})

function changeUser(): void {
  session.signOut()
  void router.push({ name: 'seller-select' })
}
</script>

<template>
  <header class="flex items-center justify-between gap-3 bg-counter px-4 py-3 text-receipt">
    <div class="min-w-0">
      <p class="font-display text-sm tracking-wide text-safety">Yandeh</p>
      <p class="truncate font-sans text-base">{{ label }}</p>
      <p
        data-testid="connection-status"
        class="mt-0.5 font-sans text-sm"
        :class="connection.online ? 'text-receipt/75' : 'text-safety'"
      >
        {{ connection.online ? 'Online' : 'Sem conexão' }}
      </p>
    </div>
    <button
      type="button"
      class="shrink-0 rounded-sm border border-steel px-3 py-2 font-sans text-sm text-receipt hover:border-safety hover:text-safety focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
      @click="changeUser"
    >
      Trocar
    </button>
  </header>
</template>
