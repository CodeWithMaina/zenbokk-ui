import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * The shared MSW server.
 *
 * Started/stopped by `src/test/setup.ts` for every test file. Handlers declared
 * here are the default happy path; a test narrows or overrides them with
 * `server.use(...)` and `afterEach` resets back to this set.
 */
export const server = setupServer(...handlers)
