import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useOnlineStore } from './online'

function stubNavigatorOnline(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => value,
  })
}

describe('online store', () => {
  let stop: (() => void) | undefined

  beforeEach(() => {
    stubNavigatorOnline(true)
    setActivePinia(createPinia())
  })

  afterEach(() => {
    stop?.()
    stop = undefined
    stubNavigatorOnline(true)
  })

  it('espelha navigator.onLine e os eventos online/offline', () => {
    const connection = useOnlineStore()
    stop = connection.listen()
    expect(connection.online).toBe(true)

    stubNavigatorOnline(false)
    window.dispatchEvent(new Event('offline'))
    expect(connection.online).toBe(false)

    stubNavigatorOnline(true)
    window.dispatchEvent(new Event('online'))
    expect(connection.online).toBe(true)
  })

  it('setOnline atualiza o indicador sem depender do evento', () => {
    const connection = useOnlineStore()
    connection.setOnline(false)
    expect(connection.online).toBe(false)
    connection.setOnline(true)
    expect(connection.online).toBe(true)
  })
})
