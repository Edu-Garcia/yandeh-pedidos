import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DATABASE_URL,
  databaseNameFromUrl,
  maintenanceDatabaseUrl,
  resolveE2eDatabaseUrl,
  resolveTestDatabaseUrl,
  withoutTestSuffix,
  withE2eDatabaseSuffix,
  withTestDatabaseSuffix,
} from './test-database-url.js'

describe('test database URL', () => {
  it('acrescenta _test ao banco do DATABASE_URL', () => {
    expect(withTestDatabaseSuffix(DEFAULT_DATABASE_URL)).toBe(
      'postgres://yandeh:yandeh@localhost:5432/yandeh_test',
    )
    expect(databaseNameFromUrl(withTestDatabaseSuffix(DEFAULT_DATABASE_URL))).toBe('yandeh_test')
  })

  it('não duplica o sufixo _test', () => {
    const already = 'postgres://yandeh:yandeh@localhost:5432/yandeh_test'
    expect(withTestDatabaseSuffix(already)).toBe(already)
  })

  it('preserva usuário, senha, host e query', () => {
    expect(
      withTestDatabaseSuffix('postgresql://app:s3cret@db.internal:6543/pedidos?sslmode=disable'),
    ).toBe('postgresql://app:s3cret@db.internal:6543/pedidos_test?sslmode=disable')
  })

  it('TEST_DATABASE_URL tem prioridade sobre o sufixo', () => {
    expect(
      resolveTestDatabaseUrl({
        DATABASE_URL: DEFAULT_DATABASE_URL,
        TEST_DATABASE_URL: 'postgres://yandeh:yandeh@localhost:5432/custom_test',
      }),
    ).toBe('postgres://yandeh:yandeh@localhost:5432/custom_test')
  })

  it('usa o default yandeh_test quando não há DATABASE_URL', () => {
    expect(resolveTestDatabaseUrl({})).toBe('postgres://yandeh:yandeh@localhost:5432/yandeh_test')
  })

  it('aponta o banco de manutenção para postgres no mesmo host', () => {
    expect(maintenanceDatabaseUrl(DEFAULT_DATABASE_URL)).toBe(
      'postgres://yandeh:yandeh@localhost:5432/postgres',
    )
  })

  it('remove o sufixo _test para o banco de desenvolvimento', () => {
    expect(withoutTestSuffix('postgres://yandeh:yandeh@localhost:5432/yandeh_test')).toBe(
      'postgres://yandeh:yandeh@localhost:5432/yandeh',
    )
  })

  it('acrescenta _e2e ao banco do DATABASE_URL', () => {
    expect(withE2eDatabaseSuffix(DEFAULT_DATABASE_URL)).toBe(
      'postgres://yandeh:yandeh@localhost:5432/yandeh_e2e',
    )
  })

  it('não empilha _e2e em cima de _test', () => {
    expect(withE2eDatabaseSuffix('postgres://yandeh:yandeh@localhost:5432/yandeh_test')).toBe(
      'postgres://yandeh:yandeh@localhost:5432/yandeh_e2e',
    )
  })

  it('não duplica o sufixo _e2e', () => {
    const already = 'postgres://yandeh:yandeh@localhost:5432/yandeh_e2e'
    expect(withE2eDatabaseSuffix(already)).toBe(already)
  })

  it('E2E_DATABASE_URL tem prioridade sobre o sufixo', () => {
    expect(
      resolveE2eDatabaseUrl({
        DATABASE_URL: DEFAULT_DATABASE_URL,
        E2E_DATABASE_URL: 'postgres://yandeh:yandeh@localhost:5432/custom_e2e',
      }),
    ).toBe('postgres://yandeh:yandeh@localhost:5432/custom_e2e')
  })

  it('usa o default yandeh_e2e quando não há DATABASE_URL', () => {
    expect(resolveE2eDatabaseUrl({})).toBe('postgres://yandeh:yandeh@localhost:5432/yandeh_e2e')
  })
})
