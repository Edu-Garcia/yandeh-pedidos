import { DEFAULT_BUSINESS_TIMEZONE } from '@yandeh/shared'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().default('postgres://yandeh:yandeh@localhost:5432/yandeh'),
  API_PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  BUSINESS_TIMEZONE: z.string().default(DEFAULT_BUSINESS_TIMEZONE),
})

export const env = schema.parse(process.env)
