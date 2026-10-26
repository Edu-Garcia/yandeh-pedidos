<script setup lang="ts">
import {
  formatBRL,
  statusForDiscount,
  type CustomerProduct,
  type SellerCustomer,
  type ValidationIssue,
} from '@yandeh/shared'
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  ApiError,
  createOrder,
  fetchCustomerProducts,
  fetchSellerCustomers,
  isHiddenResourceError,
  type CreatedOrder,
} from '@/api'
import CartLine from '@/components/CartLine.vue'
import SessionBar from '@/components/SessionBar.vue'
import { PRODUCT_SEARCH_DEBOUNCE_MS } from '@/product-search'
import { useOrderDraftStore } from '@/stores/order-draft'
import { useSessionStore } from '@/stores/session'
import NotFoundPage from './NotFoundPage.vue'

const props = defineProps<{ clientId: string }>()
const session = useSessionStore()
const draft = useOrderDraftStore()

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

const sending = ref(false)
const submitError = ref<string | null>(null)
const submitIssues = ref<ValidationIssue[]>([])
const submitted = ref<CreatedOrder | null>(null)

const cartLines = computed(() => draft.linesOf(props.clientId))
const cartTotals = computed(() => draft.draftTotals(props.clientId))
const issues = computed(() =>
  customer.value ? draft.draftIssues(props.clientId, customer.value.availableCredit) : [],
)
const hasInlineErrors = computed(() => draft.hasInlineErrors(props.clientId))
const authorityPercent = computed(() => {
  const actor = session.actor
  return actor?.kind === 'seller' ? actor.seller.discountAuthorityPercent : 0
})
const needsApproval = computed(
  () =>
    draft.pricedLinesOf(props.clientId).length > 0 &&
    statusForDiscount(draft.pricedLinesOf(props.clientId), authorityPercent.value) ===
      'Aguardando aprovação',
)
const canSend = computed(
  () => !sending.value && issues.value.length === 0 && !hasInlineErrors.value,
)

let debounceHandle: ReturnType<typeof setTimeout> | undefined
let searchSeq = 0

function resetSubmitState(): void {
  sending.value = false
  submitError.value = null
  submitIssues.value = []
  submitted.value = null
}

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

function addProduct(product: CustomerProduct): void {
  draft.addProduct(props.clientId, product)
}

async function submitOrder(): Promise<void> {
  if (!canSend.value || !customer.value) return

  sending.value = true
  submitError.value = null
  submitIssues.value = []

  const key = draft.ensureIdempotencyKey(props.clientId)
  const items = draft.linesOf(props.clientId).map((line) => ({
    productId: line.product.id,
    quantity: line.quantityUnits,
    discountPercent: line.discountPercent,
  }))

  try {
    const order = await createOrder({ customerId: props.clientId, items }, key)
    submitted.value = order
    draft.clearDraft(props.clientId)
  } catch (error) {
    if (isHiddenResourceError(error)) {
      notFound.value = true
      return
    }
    if (error instanceof ApiError && error.status === 422 && error.issues !== null) {
      submitIssues.value = error.issues
      return
    }
    submitError.value =
      error instanceof ApiError && error.message
        ? error.message
        : 'Não deu para enviar o pedido. Confira a API e tente de novo.'
  } finally {
    sending.value = false
  }
}

function startNewOrder(): void {
  resetSubmitState()
}

watch(
  () => props.clientId,
  () => {
    query.value = ''
    products.value = []
    searchError.value = null
    hasSearched.value = false
    lastQuery.value = ''
    resetSubmitState()
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
  <div v-else class="flex min-h-dvh flex-col">
    <SessionBar />
    <section class="flex-1 px-4 py-6">
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

      <section
        v-else-if="customer && submitted"
        data-testid="order-result"
        :data-order-status="submitted.status"
        class="mt-6"
      >
        <h1 class="font-display text-3xl text-counter">{{ customer.tradeName }}</h1>
        <p class="mt-6 font-sans text-sm text-steel">Pedido enviado</p>
        <h2 class="mt-2 font-display text-4xl leading-none text-balance text-counter">
          {{ submitted.status }}
        </h2>
        <p class="mt-4 max-w-prose font-sans text-base text-steel">
          {{
            submitted.status === 'Aguardando aprovação'
              ? 'O maior desconto passou da alçada. Este pedido precisará de aprovação.'
              : 'O pedido foi enviado.'
          }}
        </p>
        <p class="mt-6 font-display text-3xl text-counter">
          {{ formatBRL(submitted.totals.net) }}
        </p>
        <button
          type="button"
          data-testid="new-order"
          class="mt-8 min-h-12 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
          @click="startNewOrder"
        >
          Novo pedido
        </button>
      </section>

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
            class="py-4"
          >
            <div class="flex items-start justify-between gap-3">
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
            </div>
            <button
              type="button"
              data-testid="add-product"
              :disabled="draft.hasProduct(customer.id, product.id)"
              class="mt-3 min-h-12 border-b-2 px-1 font-sans text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety disabled:border-steel disabled:text-steel"
              :class="
                draft.hasProduct(customer.id, product.id)
                  ? 'border-steel text-steel'
                  : 'border-produce text-produce'
              "
              @click="addProduct(product)"
            >
              {{ draft.hasProduct(customer.id, product.id) ? 'No carrinho' : 'Adicionar' }}
            </button>
          </li>
        </ul>

        <p v-else class="mt-8 font-sans text-base text-steel">
          Digite o nome ou o EAN para ver o preço da tabela.
        </p>

        <section data-testid="cart" class="mt-10">
          <h2 class="font-display text-2xl text-counter">Itens do pedido</h2>
          <p
            v-if="cartLines.length === 0"
            data-testid="cart-empty"
            class="mt-4 font-sans text-base text-steel"
          >
            Nenhum item no pedido.
          </p>
          <ul v-else class="mt-4 space-y-3">
            <CartLine
              v-for="line in cartLines"
              :key="line.product.id"
              :customer-id="customer.id"
              :line="line"
            />
          </ul>
        </section>
      </template>
    </section>

    <footer
      v-if="customer && !submitted && !customerLoading && !customerError"
      data-testid="order-totals"
      class="sticky bottom-0 z-10 border-t-4 border-counter bg-receipt px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
    >
      <dl class="space-y-1">
        <div class="flex items-baseline justify-between gap-3">
          <dt class="font-sans text-sm text-steel">Bruto</dt>
          <dd data-testid="order-gross" class="font-display text-lg text-counter">
            {{ formatBRL(cartTotals.gross) }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="font-sans text-sm text-steel">Desconto</dt>
          <dd data-testid="order-discount" class="font-display text-lg text-counter">
            {{ formatBRL(cartTotals.discount) }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="font-sans text-base text-counter">Líquido</dt>
          <dd data-testid="order-net" class="font-display text-3xl leading-none text-counter">
            {{ formatBRL(cartTotals.net) }}
          </dd>
        </div>
      </dl>

      <ul v-if="issues.length > 0" data-testid="order-blocks" class="mt-3 space-y-2">
        <li
          v-for="(issue, index) in issues"
          :key="`${issue.code}-${index}`"
          :data-issue-code="issue.code"
          data-testid="order-block"
          class="-mx-4 border-l-4 border-safety bg-safety/20 px-4 py-2 font-sans text-sm text-counter"
        >
          {{ issue.message }}
        </li>
      </ul>

      <p
        v-if="needsApproval"
        data-testid="approval-warning"
        class="-mx-4 mt-3 border-l-4 border-safety bg-safety/20 px-4 py-2 font-sans text-sm text-counter"
      >
        Este pedido precisará de aprovação.
      </p>

      <div
        v-if="submitIssues.length > 0 || submitError"
        data-testid="submit-error"
        class="-mx-4 mt-3 border-l-4 border-safety bg-safety/20 px-4 py-2 font-sans text-sm text-counter"
      >
        <ul v-if="submitIssues.length > 0" class="space-y-1">
          <li
            v-for="(issue, index) in submitIssues"
            :key="`${issue.code}-${index}`"
            :data-issue-code="issue.code"
          >
            {{ issue.message }}
          </li>
        </ul>
        <p v-else>{{ submitError }}</p>
      </div>

      <button
        type="button"
        data-testid="send-order"
        :disabled="!canSend"
        class="mt-3 min-h-12 w-full border-2 px-3 font-sans text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety disabled:border-steel disabled:bg-floor disabled:text-steel"
        :class="canSend ? 'border-produce bg-produce text-receipt' : 'border-steel bg-floor'"
        @click="submitOrder"
      >
        {{ sending ? 'Enviando…' : 'Enviar' }}
      </button>
    </footer>
  </div>
</template>
