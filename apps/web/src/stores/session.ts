import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Login simulado: guarda o vendedor (ou supervisor) escolhido. */
export const useSessionStore = defineStore('session', () => {
  const sellerId = ref<string | null>(null)
  return { sellerId }
})
