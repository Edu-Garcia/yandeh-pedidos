import { eq } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { supervisores } from '../db/schema.js'

export type SupervisorRow = {
  id: string
  name: string
}

export async function findSupervisor(
  database: Pick<Db, 'select'>,
  supervisorId: string,
): Promise<SupervisorRow | null> {
  const [supervisor] = await database
    .select({
      id: supervisores.id,
      name: supervisores.nome,
    })
    .from(supervisores)
    .where(eq(supervisores.id, supervisorId))
    .limit(1)

  return supervisor ?? null
}
