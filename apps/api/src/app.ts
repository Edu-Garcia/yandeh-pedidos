import cors from '@fastify/cors'
import Fastify from 'fastify'

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
  app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))

  // TODO (ver PRD.md §8): rotas de vendedores, clientes, produtos, pedidos e aprovações.
  return app
}
