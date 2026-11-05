import { StorefrontHero } from './StorefrontHero'
import { StorefrontRenderer } from './StorefrontBlocks'
import { useStorefront } from '../../lib/storefront'
import { storefrontHref } from '../../lib/tenant'

/**
 * A business's storefront home.
 *
 * When the owner has published a Storefront Builder configuration, the home page
 * is the ordered sequence of sections they composed — rendered by the same
 * schema-driven renderer the builder previews with. A business still on the
 * legacy simple landing page keeps the original hero-only home, so nothing about
 * an un-migrated storefront changes.
 */
export function StorefrontHome() {
  const { storefront, business, can, canonicalSlug, landingPage } = useStorefront()

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
    <StorefrontRenderer
      config={storefront}
      business={business}
      can={can}
      heroVariants={
        storefront.heroBackgroundVariants.length > 0
          ? storefront.heroBackgroundVariants
          : landingPage.heroBackgroundVariants
      }
      heroCarouselVariants={storefront.heroCarouselVariants}
      resolveHref={resolveHref}
    />
  )
}


