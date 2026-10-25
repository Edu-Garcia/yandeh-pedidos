import { buildApp } from './app.js'
import { env } from './env.js'

const app = buildApp()
await app.listen({ port: env.API_PORT, host: env.HOST })
