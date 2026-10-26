import { buildApp } from './app.js'
import { db } from './db/client.js'
import { env } from './env.js'

const app = buildApp(db)
await app.listen({ port: env.API_PORT, host: env.HOST })
