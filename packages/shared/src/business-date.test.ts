import { describe, expect, it } from 'vitest'
import { DEFAULT_BUSINESS_TIMEZONE, businessDate } from './business-date.js'

describe('businessDate', () => {
  const timeZone = DEFAULT_BUSINESS_TIMEZONE

  it('mantém o dia civil em Fortaleza quando UTC ainda é o mesmo dia (23:30Z)', () => {
    expect(businessDate(new Date('2026-10-26T23:30:00.000Z'), timeZone)).toBe('2026-10-26')
  })

  it('ainda é o dia anterior em Fortaleza às 02:30Z (23:30 local)', () => {
    expect(businessDate(new Date('2026-10-27T02:30:00.000Z'), timeZone)).toBe('2026-10-26')
  })

  it('vira o dia em Fortaleza à meia-noite local (03:00Z)', () => {
    expect(businessDate(new Date('2026-10-27T03:00:00.000Z'), timeZone)).toBe('2026-10-27')
  })

  it('não usa o calendário UTC do instante (o bug de toISOString)', () => {
    const now = new Date('2026-10-27T02:30:00.000Z')
    expect(now.toISOString().slice(0, 10)).toBe('2026-10-27')
    expect(businessDate(now, timeZone)).toBe('2026-10-26')
  })
})
