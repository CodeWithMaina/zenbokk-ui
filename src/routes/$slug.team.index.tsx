import { createFileRoute } from '@tanstack/react-router'
import { TeamPage } from '../components/storefront'

export const Route = createFileRoute('/$slug/team/')({
  component: TeamPage,
})

/**
 * The roster, path-based shape (`/nuru-studio/team`).
 *
 * The business hostname shape (`nuru-studio.zenbokk.com/team`) renders the same
 * page through `src/routes/team.index.tsx`.
 */

