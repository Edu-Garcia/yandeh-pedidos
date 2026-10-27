<script setup lang="ts">
import { formatBRL } from '@yandeh/shared'
import { onMounted, ref } from 'vue'
import {
  ApiError,
  approveSupervisorOrder,
  fetchPendingSupervisorOrders,
  rejectSupervisorOrder,
  type SupervisorOrder,
} from '@/api'
import { formatDiscountVsAuthority } from '@/approvals'
import SessionBar from '@/components/SessionBar.vue'
import { formatCivilDate } from '@/order-history'

type Decision = 'approve' | 'reject'

const orders = ref<SupervisorOrder[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const pendingDecision = ref<{ orderId: string; decision: Decision } | null>(null)
const decidingId = ref<string | null>(null)
const decisionErrorById = ref<Record<string, string>>({})

function confirmationText(order: SupervisorOrder, decision: Decision): string {
  const action = decision === 'approve' ? 'Aprovar' : 'Rejeitar'
  return `${action} o pedido de ${order.customer.tradeName} (${formatBRL(order.total)})?`
}

function isPending(orderId: string): boolean {
  return pendingDecision.value?.orderId === orderId
}

function confirmationFor(order: SupervisorOrder): string {
  const pending = pendingDecision.value
  if (!pending || pending.orderId !== order.id) return ''
  return confirmationText(order, pending.decision)
}

function confirmBusyLabel(): string {
  return pendingDecision.value?.decision === 'approve' ? 'Aprovando…' : 'Rejeitando…'
}

function requestDecision(orderId: string, decision: Decision): void {
  if (decidingId.value) return
  pendingDecision.value = { orderId, decision }
}

function cancelDecision(): void {
  if (decidingId.value) return
  pendingDecision.value = null
}

async function loadPendings(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    orders.value = await fetchPendingSupervisorOrders()
    pendingDecision.value = null
    decisionErrorById.value = {}
  } catch {
    error.value = 'Não deu para carregar as aprovações. Confira a API e tente de novo.'
  } finally {
    loading.value = false
  }
}

function decisionMessage(caught: unknown): string {
  if (caught instanceof ApiError && caught.message) {
    return caught.message
  }
  return 'Não deu para registrar a decisão. Tente de novo.'
}

async function confirmDecision(): Promise<void> {
  const pending = pendingDecision.value
  if (!pending || decidingId.value) return

  decidingId.value = pending.orderId
  const nextErrors = { ...decisionErrorById.value }
  delete nextErrors[pending.orderId]
  decisionErrorById.value = nextErrors

  try {
    if (pending.decision === 'approve') {
      await approveSupervisorOrder(pending.orderId)
    } else {
      await rejectSupervisorOrder(pending.orderId)
    }
    orders.value = orders.value.filter((order) => order.id !== pending.orderId)
    pendingDecision.value = null
  } catch (caught) {
    decisionErrorById.value = {
      ...decisionErrorById.value,
      [pending.orderId]: decisionMessage(caught),
    }
    pendingDecision.value = null
  } finally {
    decidingId.value = null
  }
}

onMounted(() => {
  void loadPendings()
})
</script>

<template>
  <div class="min-h-dvh">
    <SessionBar />
    <section class="px-4 py-6">
      <h1 class="font-display text-3xl text-counter">Aprovações</h1>
      <p class="mt-3 max-w-prose font-sans text-base text-steel">
        Pedidos com desconto acima da alçada. Aprove ou rejeite um a um.
      </p>

      <p v-if="loading" class="mt-8 font-sans text-base text-counter">Carregando as aprovações…</p>

      <div v-else-if="error" class="mt-8 space-y-3">
        <p class="font-sans text-base text-counter">{{ error }}</p>
        <button
          type="button"
          class="min-h-12 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
          @click="loadPendings"
        >
          Tentar de novo
        </button>
      </div>

      <p v-else-if="orders.length === 0" class="mt-8 font-sans text-base text-counter">
        Nenhum pedido aguardando aprovação.
      </p>

      <ul v-else class="mt-8 divide-y divide-steel/40 border-y border-steel/40">
        <li
          v-for="order in orders"
          :key="order.id"
          :data-order-id="order.id"
          :data-customer-id="order.customer.id"
          :data-seller-id="order.seller.id"
          class="py-5"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="font-display text-xl leading-tight text-counter">
                {{ order.customer.tradeName }}
              </h2>
              <p class="mt-1 font-sans text-sm text-steel">
                {{ order.seller.name }} · {{ formatCivilDate(order.date) }}
              </p>
            </div>
            <p class="shrink-0 text-right">
              <span class="block font-display text-xl leading-tight text-counter">
                {{ formatBRL(order.total) }}
              </span>
              <span class="mt-1 block font-sans text-sm text-steel">líquido</span>
            </p>
          </div>

          <p
            data-testid="discount-vs-authority"
            class="-mx-4 mt-3 border-l-4 border-safety bg-safety/20 px-4 py-2 font-sans text-sm text-counter"
          >
            {{
              formatDiscountVsAuthority(order.maxDiscount, order.seller.discountAuthorityPercent)
            }}
          </p>

          <p
            v-if="decisionErrorById[order.id]"
            data-testid="decision-error"
            class="-mx-4 mt-3 border-l-4 border-safety bg-safety/20 px-4 py-2 font-sans text-sm text-counter"
          >
            {{ decisionErrorById[order.id] }}
          </p>

          <div
            v-if="isPending(order.id)"
            data-testid="decision-confirm"
            class="-mx-4 mt-4 border-l-4 border-safety bg-safety/20 px-4 py-3"
          >
            <p class="font-sans text-base text-counter">{{ confirmationFor(order) }}</p>
            <div class="mt-3 flex flex-wrap gap-4">
              <button
                type="button"
                data-testid="decision-cancel"
                :disabled="decidingId !== null"
                class="min-h-12 border-b-2 border-steel px-1 font-sans text-base text-steel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety disabled:opacity-50"
                @click="cancelDecision"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="decision-accept"
                :disabled="decidingId !== null"
                class="min-h-12 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety disabled:border-steel disabled:text-steel"
                @click="confirmDecision"
              >
                {{ decidingId === order.id ? confirmBusyLabel() : 'Confirmar' }}
              </button>
            </div>
          </div>

          <div v-else class="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="reject-order"
              :disabled="decidingId !== null"
              class="min-h-12 border-2 border-steel bg-floor px-3 font-sans text-base text-counter focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety disabled:text-steel"
              @click="requestDecision(order.id, 'reject')"
            >
              Rejeitar
            </button>
            <button
              type="button"
              data-testid="approve-order"
              :disabled="decidingId !== null"
              class="min-h-12 border-2 border-produce bg-produce px-3 font-sans text-base text-receipt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety disabled:border-steel disabled:bg-floor disabled:text-steel"
              @click="requestDecision(order.id, 'approve')"
            >
              Aprovar
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
