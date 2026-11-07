import { StorefrontHero } from './StorefrontHero'
import { StorefrontRenderer as StorefrontRendererNew } from './StorefrontBlocksNew'
import { useStorefront } from '../../lib/storefront'
import { storefrontHref } from '../../lib/tenant'

/**
 * A business's storefront home.
 *
 * When the owner has published a Storefront Builder configuration, the home page
 * is rendered using the new three-component architecture (navigation, hero, footer).
 * A business still on the legacy simple landing page keeps the original hero-only home.
 */
export function StorefrontHome() {
  const { storefront, business, can, canonicalSlug } = useStorefront()

  if (!storefront) return <StorefrontHero />

  const resolveHref = (kind: string) => {
    const path =
      kind === 'book'
        ? '/book'
        : kind === 'services'
          ? '/services'
          : kind === 'contact'
            ? '/contact'
            : kind === 'reviews'
              ? '/reviews'
              : ''
    return storefrontHref(canonicalSlug, path)
  }

  return (
    <StorefrontRendererNew
      config={storefront}
      business={business}
      can={can}
      heroVariants={storefront.heroBackgroundVariants ?? []}
      heroCarouselVariants={storefront.heroCarouselVariants ?? []}
      logoVariants={storefront.headerLogoVariants ?? []}
      resolveHref={resolveHref}
    />
  )
}


