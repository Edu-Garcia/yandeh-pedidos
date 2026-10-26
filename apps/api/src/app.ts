import cors from '@fastify/cors'
import Fastify from 'fastify'
import type { Db } from './db/client.js'
import { registerCustomerRoutes } from './routes/customers.js'
import { registerIdentityRoutes } from './routes/identity.js'
import { registerOrderRoutes, type OrderRouteDeps } from './routes/orders.js'

export type AppDeps = OrderRouteDeps

export function buildApp(database: Db, deps: AppDeps = {}) {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
  app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))
  registerIdentityRoutes(app, database)
  registerCustomerRoutes(app, database)
  registerOrderRoutes(app, database, deps)

  // TODO (ver PRD.md §8): rotas de aprovações do supervisor.
  return app
}
