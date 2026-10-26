<script setup lang="ts">
import type { Seller, Supervisor } from '@yandeh/shared'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSellers, fetchSupervisors } from '@/api'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()

const sellers = ref<Seller[]>([])
const supervisors = ref<Supervisor[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function loadTeam(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [sellerRows, supervisorRows] = await Promise.all([fetchSellers(), fetchSupervisors()])
    sellers.value = sellerRows
    supervisors.value = supervisorRows
  } catch {
    error.value = 'Não deu para carregar a equipe. Confira a API e tente de novo.'
  } finally {
    loading.value = false
  }
}

function chooseSeller(seller: Seller): void {
  session.signInSeller(seller)
  void router.push({ name: 'clients' })
}

function chooseSupervisor(supervisor: Supervisor): void {
  session.signInSupervisor(supervisor)
  void router.push({ name: 'approvals' })
}

onMounted(() => {
  void loadTeam()
})
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="bg-counter px-5 pb-10 pt-8 text-receipt">
      <p class="font-sans text-sm text-safety">Yandeh</p>
      <h1 class="mt-3 font-display text-4xl leading-none text-balance">Quem é você?</h1>
      <p class="mt-4 max-w-xs font-sans text-base text-receipt/80">
        Escolha quem está com o celular. Não tem senha, é o login do exercício.
      </p>
    </header>

    <main class="flex-1 px-4 py-6">
      <p v-if="loading" class="font-sans text-base text-counter">Carregando a equipe…</p>

      <div v-else-if="error" class="space-y-3">
        <p class="font-sans text-base text-counter">{{ error }}</p>
        <button
          type="button"
          class="min-h-12 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
          @click="loadTeam"
        >
          Tentar de novo
        </button>
      </div>

      <div v-else class="space-y-8">
        <section>
          <h2 class="mb-2 font-sans text-sm text-steel">Vendedores</h2>
          <ul class="divide-y divide-steel/40 border-y border-steel/40">
            <li v-for="seller in sellers" :key="seller.id">
              <button
                type="button"
                class="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
                @click="chooseSeller(seller)"
              >
                <span class="min-w-0">
                  <span class="block font-display text-xl text-counter">{{ seller.name }}</span>
                  <span class="block font-sans text-sm text-steel">
                    {{ seller.id }}, desconto até {{ seller.discountAuthorityPercent }}%
                  </span>
                </span>
                <span class="font-sans text-sm text-produce">Entrar</span>
              </button>
            </li>
          </ul>
        </section>

        <section>
          <h2 class="mb-2 font-sans text-sm text-steel">Supervisor</h2>
          <ul class="border-l-4 border-safety bg-counter/95 text-receipt">
            <li v-for="supervisor in supervisors" :key="supervisor.id">
              <button
                type="button"
                class="flex min-h-16 w-full items-center justify-between gap-3 px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
                @click="chooseSupervisor(supervisor)"
              >
                <span class="min-w-0">
                  <span class="block font-display text-xl">{{ supervisor.name }}</span>
                  <span class="block font-sans text-sm text-receipt/70">
                    {{ supervisor.id }}, aprova pedidos
                  </span>
                </span>
                <span class="font-sans text-sm text-safety">Entrar</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </main>
  </div>
</template>
