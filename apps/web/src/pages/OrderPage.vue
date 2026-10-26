<script setup lang="ts">
import { formatBRL, type CustomerProduct, type SellerCustomer } from '@yandeh/shared'
import { onUnmounted, ref, watch } from 'vue'
import { fetchCustomerProducts, fetchSellerCustomers, isHiddenResourceError } from '@/api'
import SessionBar from '@/components/SessionBar.vue'
import { PRODUCT_SEARCH_DEBOUNCE_MS } from '@/product-search'
import { useSessionStore } from '@/stores/session'
import NotFoundPage from './NotFoundPage.vue'

const props = defineProps<{ clientId: string }>()
const session = useSessionStore()

const customer = ref<SellerCustomer | null>(null)
const customerLoading = ref(true)
const customerError = ref<string | null>(null)
const notFound = ref(false)

const query = ref('')
const products = ref<CustomerProduct[]>([])
const searching = ref(false)
const searchError = ref<string | null>(null)
const hasSearched = ref(false)
const lastQuery = ref('')

let debounceHandle: ReturnType<typeof setTimeout> | undefined
let searchSeq = 0

async function loadCustomer(): Promise<void> {
  const sellerId = session.sellerId
  if (!sellerId) {
    customer.value = null
    customerLoading.value = false
    return
  }

  customerLoading.value = true
  customerError.value = null
  notFound.value = false
  customer.value = null
  try {
    const wallet = await fetchSellerCustomers(sellerId)
    const found = wallet.find((row) => row.id === props.clientId)
    if (!found) {
      notFound.value = true
      return
    }
    customer.value = found
  } catch (error) {
    if (isHiddenResourceError(error)) {
      notFound.value = true
      return
    }
    customerError.value = 'Não deu para carregar o pedido. Confira a API e tente de novo.'
  } finally {
    customerLoading.value = false
  }
}

async function runSearch(rawQuery: string): Promise<void> {
  const q = rawQuery.trim()
  lastQuery.value = q
  if (!q) {
    searchSeq += 1
    products.value = []
    searching.value = false
    searchError.value = null
    hasSearched.value = false
    return
  }

  const seq = ++searchSeq
  searching.value = true
  searchError.value = null
  hasSearched.value = false
  try {
    const results = await fetchCustomerProducts(props.clientId, q)
    if (seq !== searchSeq) return
    products.value = results
    hasSearched.value = true
  } catch (error) {
    if (seq !== searchSeq) return
    if (isHiddenResourceError(error)) {
      notFound.value = true
      return
    }
    searchError.value = 'Não deu para buscar os produtos. Confira a API e tente de novo.'
    products.value = []
    hasSearched.value = false
  } finally {
    if (seq === searchSeq) searching.value = false
  }
}

function retrySearch(): void {
  void runSearch(lastQuery.value || query.value)
}

function scheduleSearch(value: string): void {
  if (debounceHandle !== undefined) clearTimeout(debounceHandle)
  debounceHandle = setTimeout(() => {
    void runSearch(value)
  }, PRODUCT_SEARCH_DEBOUNCE_MS)
}

watch(
  () => props.clientId,
  () => {
    query.value = ''
    products.value = []
    searchError.value = null
    hasSearched.value = false
    lastQuery.value = ''
    if (debounceHandle !== undefined) clearTimeout(debounceHandle)
    searchSeq += 1
    void loadCustomer()
  },
  { immediate: true },
)

watch(query, (value) => {
  scheduleSearch(value)
})

onUnmounted(() => {
  if (debounceHandle !== undefined) clearTimeout(debounceHandle)
  searchSeq += 1
})
</script>

<template>
  <NotFoundPage v-if="notFound" />
  <div v-else class="min-h-dvh">
    <SessionBar />
    <section class="px-4 py-6">
      <RouterLink
        :to="{ name: 'clients' }"
        class="inline-block min-h-12 border-b-2 border-produce pt-2 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
      >
        Carteira
      </RouterLink>

      <p
        v-if="customerLoading"
        data-testid="customer-loading"
        class="mt-8 font-sans text-base text-counter"
      >
        Carregando o pedido…
      </p>

      <div v-else-if="customerError" class="mt-8 space-y-3">
        <p class="font-sans text-base text-counter">{{ customerError }}</p>
        <button
          type="button"
          class="min-h-12 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
          @click="loadCustomer"
        >
          Tentar de novo
        </button>
      </div>

      <template v-else-if="customer">
        <h1 class="mt-6 font-display text-3xl text-counter">{{ customer.tradeName }}</h1>
        <p class="mt-2 font-sans text-base text-steel">{{ customer.priceTableName }}</p>
        <p
          v-if="customer.isFallback"
          data-testid="fallback-warning"
          class="-mx-4 mt-4 border-l-4 border-safety bg-safety/20 px-4 py-3 font-sans text-base text-counter"
        >
          Cliente sem tabela — usando Tabela Padrão
        </p>

        <label class="mt-8 block">
          <span class="font-sans text-sm text-steel">Buscar produto</span>
          <input
            v-model="query"
            type="search"
            inputmode="search"
            autocomplete="off"
            enterkeyhint="search"
            placeholder="Nome ou EAN"
            data-testid="product-search"
            class="mt-2 min-h-12 w-full border-0 border-b-2 border-counter bg-receipt px-3 font-sans text-base text-counter placeholder:text-steel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
          />
        </label>

        <p
          v-if="searching"
          data-testid="search-loading"
          class="mt-8 font-sans text-base text-counter"
        >
          Buscando produtos…
        </p>

        <div v-else-if="searchError" data-testid="search-error" class="mt-8 space-y-3">
          <p class="font-sans text-base text-counter">{{ searchError }}</p>
          <button
            type="button"
            class="min-h-12 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
            @click="retrySearch"
          >
            Tentar de novo
          </button>
        </div>

        <p
          v-else-if="hasSearched && products.length === 0"
          data-testid="search-empty"
          class="mt-8 font-sans text-base text-counter"
        >
          Nenhum produto com esse nome ou EAN.
        </p>

        <ul
          v-else-if="products.length > 0"
          data-testid="search-results"
          class="mt-8 divide-y divide-steel/40 border-y border-steel/40"
        >
          <li
            v-for="product in products"
            :key="product.id"
            :data-product-id="product.id"
            class="flex min-h-20 items-start justify-between gap-3 py-4"
          >
            <span class="min-w-0">
              <span class="block font-display text-xl leading-tight text-counter">
                {{ product.description }}
              </span>
              <span class="mt-1 block font-sans text-sm text-steel">
                {{ product.ean }}
              </span>
            </span>
            <span class="shrink-0 text-right font-display text-xl leading-tight text-counter">
              {{ formatBRL(product.unitPrice) }}
            </span>
          </li>
        </ul>

        <p v-else class="mt-8 font-sans text-base text-steel">
          Digite o nome ou o EAN para ver o preço da tabela.
        </p>
      </template>
    </section>
  </div>
</template>
