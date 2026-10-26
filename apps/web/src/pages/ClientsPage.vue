<script setup lang="ts">
import { formatBRL, type SellerCustomer } from '@yandeh/shared'
import { onMounted, ref } from 'vue'
import { fetchSellerCustomers } from '@/api'
import SessionBar from '@/components/SessionBar.vue'
import { useSessionStore } from '@/stores/session'
import { formatCityUf, isCreditBelowMinimum } from '@/wallet'

const session = useSessionStore()

const customers = ref<SellerCustomer[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function loadWallet(): Promise<void> {
  const sellerId = session.sellerId
  if (!sellerId) {
    customers.value = []
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  try {
    customers.value = await fetchSellerCustomers(sellerId)
  } catch {
    error.value = 'Não deu para carregar a carteira. Confira a API e tente de novo.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadWallet()
})
</script>

<template>
  <div class="min-h-dvh">
    <SessionBar />
    <section class="px-4 py-6">
      <h1 class="font-display text-3xl text-counter">Minha carteira</h1>
      <p class="mt-3 max-w-prose font-sans text-base text-steel">
        Clientes desta rota, com a tabela efetiva e o crédito disponível.
      </p>

      <p v-if="loading" class="mt-8 font-sans text-base text-counter">Carregando a carteira…</p>

      <div v-else-if="error" class="mt-8 space-y-3">
        <p class="font-sans text-base text-counter">{{ error }}</p>
        <button
          type="button"
          class="min-h-12 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
          @click="loadWallet"
        >
          Tentar de novo
        </button>
      </div>

      <p v-else-if="customers.length === 0" class="mt-8 font-sans text-base text-counter">
        Nenhum cliente nesta carteira.
      </p>

      <ul v-else class="mt-8 divide-y divide-steel/40 border-y border-steel/40">
        <li
          v-for="customer in customers"
          :key="customer.id"
          :data-customer-id="customer.id"
          :data-below-minimum="isCreditBelowMinimum(customer.availableCredit) ? 'true' : 'false'"
        >
          <RouterLink
            :to="{ name: 'order', params: { clientId: customer.id } }"
            :aria-label="`Pedido de ${customer.tradeName}`"
            class="flex min-h-20 items-start justify-between gap-3 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
            :class="
              isCreditBelowMinimum(customer.availableCredit)
                ? '-mx-4 border-l-4 border-safety bg-safety/20 px-4'
                : ''
            "
          >
            <span class="min-w-0">
              <span class="block font-display text-xl leading-tight text-counter">
                {{ customer.tradeName }}
              </span>
              <span class="mt-1 block font-sans text-sm text-steel">
                {{ customer.id }}, {{ formatCityUf(customer.city, customer.uf) }}
              </span>
              <span class="mt-1 block font-sans text-sm text-steel">
                {{ customer.priceTableName }}
              </span>
              <span
                v-if="customer.isFallback"
                class="mt-2 inline-block border border-produce px-2 py-0.5 font-sans text-sm text-produce"
              >
                Padrão (fallback)
              </span>
              <span
                v-if="isCreditBelowMinimum(customer.availableCredit)"
                class="mt-2 block font-sans text-sm text-counter"
              >
                Crédito abaixo do mínimo
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="block font-display text-xl leading-tight text-counter">
                {{ formatBRL(customer.availableCredit) }}
              </span>
              <span class="mt-1 block font-sans text-sm text-steel">disponível</span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
