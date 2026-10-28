import { prepareE2eDatabase } from './db'

export default function globalSetup(): void {
  prepareE2eDatabase()
}
