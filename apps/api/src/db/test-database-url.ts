export const DEFAULT_DATABASE_URL = 'postgres://yandeh:yandeh@localhost:5432/yandeh'

export function databaseNameFromUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl)
  const name = decodeURIComponent(url.pathname.replace(/^\//, ''))
  return name || 'yandeh'
}

export function withTestDatabaseSuffix(databaseUrl: string): string {
  const url = new URL(databaseUrl)
  const name = databaseNameFromUrl(databaseUrl)
  if (name.endsWith('_test')) {
    return databaseUrl
  }
  url.pathname = `/${name}_test`
  return url.toString()
}

export function resolveTestDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const override = env.TEST_DATABASE_URL?.trim()
  if (override) {
    return override
  }
  const base = env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL
  return withTestDatabaseSuffix(base)
}

export function maintenanceDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl)
  url.pathname = '/postgres'
  return url.toString()
}

export function withoutTestSuffix(databaseUrl: string): string {
  const url = new URL(databaseUrl)
  const name = databaseNameFromUrl(databaseUrl)
  if (!name.endsWith('_test')) {
    return databaseUrl
  }
  const baseName = name.slice(0, -'_test'.length) || 'yandeh'
  url.pathname = `/${baseName}`
  return url.toString()
}
