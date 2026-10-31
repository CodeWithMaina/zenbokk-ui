import { createFileRoute } from '@tanstack/react-router'
import { StorefrontHome } from '../components/storefront'

export const Route = createFileRoute('/$slug/')({
  component: StorefrontHome,
})

/**
 * The business's storefront home.
 *
 * The page itself lives in `src/components/storefront/StorefrontHome.tsx`: it is
 * assembled from the owner's landing-page configuration, so it is a composition
 * rather than a page, and it is also reachable from a business hostname (see
 * `src/routes/index.tsx`).
 */
