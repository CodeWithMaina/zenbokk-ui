import { StorefrontHero } from './StorefrontHero'

/**
 * A business's storefront home.
 *
 * The home page is the hero and nothing else. Services, the team, about and
 * contact are each their own page (see `./pages`), reached from the navigation
 * or from the hero's own actions — so the landing screen stays a single,
 * uninterrupted statement of who the business is, and every other destination
 * has a real, linkable address.
 */
export function StorefrontHome() {
  return <StorefrontHero />
}


