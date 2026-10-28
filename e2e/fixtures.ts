import { test as base } from '@playwright/test'
import { resetE2eDatabase } from './db'

export const test = base.extend<{ seed: void }>({
  seed: [
    async ({ page: _page }, use) => {
      resetE2eDatabase()
      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
