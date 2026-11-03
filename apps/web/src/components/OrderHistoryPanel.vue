<script setup lang="ts">
import { formatBRL } from '@yandeh/shared'
import { nextTick, onUnmounted, ref, watch } from 'vue'
import type { CustomerOrderDetail } from '@/api'
import { formatCivilDate } from '@/order-history'

const TITLE_ID = 'order-history-title'
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const props = defineProps<{
  open: boolean
  date: string
  status: string
  order: CustomerOrderDetail | null
  loading: boolean
  error: string | null
  canRepeat: boolean
}>()

const emit = defineEmits<{
  close: []
  retry: []
  repeat: []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)

function focusableElements(): HTMLElement[] {
  if (!dialogRef.value) return []
  return [...dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'Tab') return
  const nodes = focusableElements()
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
      await nextTick()
      closeButtonRef.value?.focus()
      return
    }
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  },
  { immediate: true },
)

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50">
    <div
      data-testid="order-history-backdrop"
      class="absolute inset-0 bg-counter/55"
      @click="emit('close')"
    />
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="TITLE_ID"
      data-testid="order-history-panel"
      class="absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col border-t-4 border-counter bg-receipt"
    >
      <header class="flex shrink-0 items-start justify-between gap-3 px-4 pt-4">
        <div class="min-w-0">
          <h2
            :id="TITLE_ID"
            data-testid="order-history-title"
            class="font-display text-3xl leading-tight text-counter"
          >
            {{ formatCivilDate(date) }}
          </h2>
          <p data-testid="order-history-status" class="mt-1 font-sans text-base text-steel">
            {{ status }}
          </p>
        </div>
        <button
          ref="closeButtonRef"
          type="button"
          data-testid="order-history-close"
          class="min-h-12 shrink-0 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
          @click="emit('close')"
        >
          Fechar
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-4">
        <p
          v-if="loading"
          data-testid="order-history-loading"
          class="mt-6 font-sans text-base text-counter"
        >
          Carregando o pedido…
        </p>

        <div v-else-if="error" data-testid="order-history-error" class="mt-6 space-y-3">
          <p class="font-sans text-base text-counter">{{ error }}</p>
          <button
            type="button"
            data-testid="order-history-retry"
            class="min-h-12 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
            @click="emit('retry')"
          >
            Tentar de novo
          </button>
        </div>

        <ul v-else-if="order" class="mt-4 divide-y divide-steel/40 border-y border-steel/40">
          <li
            v-for="item in order.items"
            :key="item.productId"
            :data-product-id="item.productId"
            data-testid="order-history-item"
            class="py-4"
          >
            <p class="font-display text-xl leading-tight text-counter">
              {{ item.description }}
            </p>
            <p class="mt-1 font-sans text-sm text-steel">{{ item.ean }}</p>
            <dl class="mt-3 space-y-1">
              <div class="flex items-baseline justify-between gap-3">
                <dt class="font-sans text-sm text-steel">Quantidade</dt>
                <dd data-testid="order-history-item-qty" class="font-sans text-base text-counter">
                  {{ item.quantity }} un
                </dd>
              </div>
              <div class="flex items-baseline justify-between gap-3">
                <dt class="font-sans text-sm text-steel">Preço unitário</dt>
                <dd data-testid="order-history-item-price" class="font-sans text-base text-counter">
                  {{ formatBRL(item.unitPrice) }}
                </dd>
              </div>
              <div class="flex items-baseline justify-between gap-3">
                <dt class="font-sans text-sm text-steel">Desconto</dt>
                <dd
                  data-testid="order-history-item-discount"
                  class="font-sans text-base text-counter"
                >
                  {{ item.discountPercent }}%
                </dd>
              </div>
              <div class="flex items-baseline justify-between gap-3">
                <dt class="font-sans text-sm text-steel">Líquido</dt>
                <dd data-testid="order-history-item-net" class="font-display text-lg text-counter">
                  {{ formatBRL(item.totals.net) }}
                </dd>
              </div>
            </dl>
          </li>
        </ul>
      </div>

      <footer
        v-if="order && !loading && !error"
        class="shrink-0 border-t-4 border-counter px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
      >
        <dl class="space-y-1" data-testid="order-history-totals">
          <div class="flex items-baseline justify-between gap-3">
            <dt class="font-sans text-sm text-steel">Bruto</dt>
            <dd data-testid="order-history-gross" class="font-display text-lg text-counter">
              {{ formatBRL(order.totals.gross) }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <dt class="font-sans text-sm text-steel">Desconto</dt>
            <dd data-testid="order-history-discount" class="font-display text-lg text-counter">
              {{ formatBRL(order.totals.discount) }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <dt class="font-sans text-base text-counter">Líquido</dt>
            <dd
              data-testid="order-history-net"
              class="font-display text-3xl leading-none text-counter"
            >
              {{ formatBRL(order.totals.net) }}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          data-testid="order-history-repeat"
          :disabled="!canRepeat"
          class="mt-3 min-h-12 border-b-2 px-1 font-sans text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety disabled:border-steel disabled:text-steel"
          :class="canRepeat ? 'border-produce text-produce' : 'border-steel text-steel'"
          @click="emit('repeat')"
        >
          Repetir pedido
        </button>
      </footer>
    </div>
  </div>
</template>
