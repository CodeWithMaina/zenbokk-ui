import type { ReactNode } from 'react'
import { useStorefront } from '../../../lib/storefront'
import { storefrontHref } from '../../../lib/tenant'
import { StorefrontRenderer } from '../StorefrontBlocksNew'
import { pageForKind } from '../site/nav'

/**
 * Lets a designed page take over from the built-in production page.
 *
 * When the published configuration carries a page of this `kind` with its own
 * hero or sections, the canonical renderer draws that page (its own hero + its
 * own sections, never the home page's). Otherwise the existing production page
 * renders unchanged — so a business that never touched the builder, and a page
 * the builder has nothing to say about, both keep the page they already had.
 */
export function StorefrontPageHost({ kind, children }: { kind: string; children: ReactNode }) {
  const { storefront, business, can, canonicalSlug } = useStorefront()

  const page = storefront ? pageForKind(storefront, kind) : null
  const hasOwn =
    Boolean(page) &&
    ((page!.hero != null && page!.hero!.enabled !== false) || (page!.sections?.length ?? 0) > 0)

  if (!storefront || !page || !hasOwn) return <>{children}</>

  const resolveHref = (destination: string) => {
    const path =
      destination === 'book'
        ? '/book'
        : destination === 'services'
          ? '/services'
          : destination === 'contact'
            ? '/contact'
            : destination === 'reviews'
              ? '/reviews'
              : ''
    return storefrontHref(canonicalSlug, path)
  }

  return (
    <StorefrontRenderer
      config={storefront}
      business={business}
      can={can}
      pageKind={kind}
      canonicalSlug={canonicalSlug}
      pathname={`/${page.slug}`}
      resolveHref={resolveHref}
      logoVariants={storefront.headerLogoVariants ?? []}
    />
  )
}
