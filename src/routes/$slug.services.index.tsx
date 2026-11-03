import { createFileRoute } from '@tanstack/react-router'
import { ServicesPage } from '../components/storefront'

export const Route = createFileRoute('/$slug/services/')({
  component: ServicesPage,
})

/**
 * The service menu, path-based shape (`/nuru-studio/services`).
 *
 * The business hostname shape (`nuru-studio.zenbokk.com/services`) renders the
 * same page through `src/routes/services.index.tsx`. The page reads the tenant
 * from context and does its own navigation, so there is nothing for this file to
 * pass and the two shapes cannot drift.
 */

