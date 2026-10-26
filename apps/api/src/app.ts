import cors from '@fastify/cors'
import Fastify from 'fastify'
import type { Db } from './db/client.js'
import { registerIdentityRoutes } from './routes/identity.js'

export function buildApp(database: Db) {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
  app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))
  registerIdentityRoutes(app, database)

  // TODO (ver PRD.md §8): rotas de clientes, produtos, pedidos e aprovações.
  return app
}
