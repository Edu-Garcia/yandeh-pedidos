import { defineStore } from 'pinia'
import { ref } from 'vue'

export function readNavigatorOnline(): boolean {
  return navigator.onLine
}

/** Conexão do aparelho via `navigator.onLine` + eventos online/offline (T-27). */
export const useOnlineStore = defineStore('online', () => {
  const online = ref(readNavigatorOnline())

  function setOnline(value: boolean): void {
    online.value = value
  }

  function syncFromNavigator(): void {
    online.value = readNavigatorOnline()
  }

  function listen(): () => void {
    const onOnline = (): void => {
      setOnline(true)
    }
    const onOffline = (): void => {
      setOnline(false)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    syncFromNavigator()
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }

  return { online, setOnline, syncFromNavigator, listen }
})
