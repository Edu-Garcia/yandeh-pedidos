<script setup lang="ts">
import { formatBRL } from '@yandeh/shared'
import { computed } from 'vue'
import { useOrderDraftStore, type DraftLine } from '@/stores/order-draft'

const props = defineProps<{ customerId: string; line: DraftLine }>()
const draft = useOrderDraftStore()
const view = computed(() => draft.viewOf(props.line))
const quantityErrorId = computed(() => `quantity-error-${props.line.product.id}`)
const discountErrorId = computed(() => `discount-error-${props.line.product.id}`)

function onUnits(event: Event): void {
  draft.setUnits(props.customerId, props.line.product.id, (event.target as HTMLInputElement).value)
}

function onLots(event: Event): void {
  draft.setLots(props.customerId, props.line.product.id, (event.target as HTMLInputElement).value)
}

function onDiscount(event: Event): void {
  draft.setDiscount(
    props.customerId,
    props.line.product.id,
    (event.target as HTMLInputElement).value,
  )
}

function remove(): void {
  draft.removeLine(props.customerId, props.line.product.id)
}
</script>

<template>
  <li
    :data-product-id="line.product.id"
    data-testid="cart-line"
    class="border-y border-steel/40 bg-receipt px-3 py-4"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-display text-xl leading-tight text-counter">
          {{ line.product.description }}
        </p>
        <p class="mt-1 font-sans text-sm text-steel">{{ line.product.ean }}</p>
      </div>
      <p class="shrink-0 text-right font-display text-xl leading-tight text-counter">
        {{ formatBRL(line.product.unitPrice) }}
      </p>
    </div>

    <div class="mt-4 grid gap-3" :class="view.hasLot ? 'grid-cols-2' : 'grid-cols-1'">
      <label class="block">
        <span class="font-sans text-sm text-steel">Unidades</span>
        <input
          :value="view.unitsText"
          :readonly="view.unitsReadOnly"
          inputmode="numeric"
          autocomplete="off"
          data-testid="cart-units"
          :aria-invalid="view.quantityError ? true : undefined"
          :aria-describedby="view.quantityError ? quantityErrorId : undefined"
          class="mt-1 min-h-12 w-full border-0 border-b-2 border-counter px-3 font-sans text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
          :class="view.unitsReadOnly ? 'bg-floor text-steel' : 'bg-receipt text-counter'"
          @input="onUnits"
        />
      </label>

      <label v-if="view.hasLot" class="block">
        <span class="font-sans text-sm text-steel">Lote {{ view.lotLabel }}</span>
        <input
          :value="view.lotsText"
          inputmode="numeric"
          autocomplete="off"
          data-testid="cart-lots"
          :aria-invalid="view.quantityError ? true : undefined"
          :aria-describedby="view.quantityError ? quantityErrorId : undefined"
          class="mt-1 min-h-12 w-full border-0 border-b-2 border-counter bg-receipt px-3 font-sans text-base text-counter focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
          @input="onLots"
        />
      </label>
    </div>

    <p
      v-if="view.quantityError"
      :id="quantityErrorId"
      data-testid="cart-quantity-error"
      class="-mx-3 mt-2 border-l-4 border-safety bg-safety/20 px-3 py-2 font-sans text-sm text-counter"
    >
      {{ view.quantityError }}
    </p>

    <label class="mt-4 block">
      <span class="font-sans text-sm text-steel">Desconto %</span>
      <input
        :value="view.discountText"
        inputmode="decimal"
        autocomplete="off"
        data-testid="cart-discount"
        :aria-invalid="view.discountError ? true : undefined"
        :aria-describedby="view.discountError ? discountErrorId : undefined"
        class="mt-1 min-h-12 w-full border-0 border-b-2 border-counter bg-receipt px-3 font-sans text-base text-counter focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
        @input="onDiscount"
      />
    </label>

    <p
      v-if="view.discountError"
      :id="discountErrorId"
      data-testid="cart-discount-error"
      class="-mx-3 mt-2 border-l-4 border-safety bg-safety/20 px-3 py-2 font-sans text-sm text-counter"
    >
      {{ view.discountError }}
    </p>

    <div class="mt-4 flex items-end justify-between gap-3">
      <p data-testid="cart-line-total" class="font-display text-2xl text-counter">
        {{ view.totals ? formatBRL(view.totals.net) : '—' }}
      </p>
      <button
        type="button"
        data-testid="remove-line"
        class="min-h-12 border-b-2 border-produce px-1 font-sans text-base text-produce focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safety"
        @click="remove"
      >
        Remover
      </button>
    </div>
  </li>
</template>
