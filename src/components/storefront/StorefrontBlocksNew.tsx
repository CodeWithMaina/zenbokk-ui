import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type {
  ImageVariant,
  PublicBusinessProfile,
  StorefrontConfig,
  StorefrontPage,
} from '../../lib/api/types'
import type { CapabilityKey } from '../../lib/entitlements'
import { pickVariant } from '../../lib/media'
import { storefrontHref } from '../../lib/tenant'
import { cn } from '../../lib/cn'
import { StorefrontThemeStyle } from './StorefrontThemeStyle'
import { StorefrontSections } from './StorefrontBlocks'
import { SiteFooter } from './site/SiteFooter'
import { SiteHeader } from './site/SiteHeader'
import { SiteHero, type HeroFact } from './site/SiteHero'
import { pageForKind, resolveNavigation, safeExternalUrl } from './site/nav'
import './site/site.css'

/**
 * The canonical storefront renderer.
 *
 * One component draws the whole site — header, hero, the owner's sections and the
 * footer — for **both** the public storefront and the builder preview, so a
 * published configuration cannot render differently from the preview the owner
 * approved. The three framing regions use the prototype's `.nv` / `.hro` / `.ftr`
 * visual system (`site/site.css`); the body reuses the established
 * `StorefrontSections` renderer so services, staff, reviews, gallery, hours and
 * booking keep reading their own real data.
 *
 * Per-page content follows one rule: the **home** page uses the storefront-wide
 * hero and sections; every other page uses its own, and never inherits home's.
 */

export type StorefrontRendererProps = {
  config: StorefrontConfig
  business: PublicBusinessProfile
  can?: (capability: CapabilityKey) => boolean
  heroVariants?: ImageVariant[]
  /** Resolved carousel slides, for the `collage` hero. */
  heroCarouselVariants?: ImageVariant[][]
  logoVariants?: ImageVariant[]
  /** Which page to draw. `home` uses the storefront-wide hero + sections. */
  pageKind?: string
  resolveHref?: (kind: string) => string
  onSelectSection?: (id: string) => void
  selectedSectionId?: string | null
  includeFooter?: boolean
  footer?: ReactNode
  pathname?: string
  canonicalSlug?: string
  teamCount?: number
  bookingCount?: number
  hours?: { label: string; value: string }[]
  onNavigate?: (href: string) => void
}

const FALLBACK_HREF = (kind: string) =>
  kind === 'book' ? '#book' : kind === 'services' ? '#services' : kind === 'contact' ? '#contact' : '#'

export function StorefrontRenderer({
  config,
  business,
  can = () => true,
  heroVariants = [],
  heroCarouselVariants = [],
  logoVariants = [],
  pageKind = 'home',
  resolveHref = FALLBACK_HREF,
  onSelectSection,
  selectedSectionId,
  includeFooter = true,
  footer,
  pathname = '/',
  canonicalSlug,
  teamCount = 0,
  bookingCount = 0,
  hours = [],
  onNavigate,
}: StorefrontRendererProps) {
  const theme = config.theme
  const slug = canonicalSlug ?? business.slug ?? ''
  const rootRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

  const page: StorefrontPage | null = pageKind === 'home' ? null : pageForKind(config, pageKind)

  const hero = page ? (page.hero && page.hero.enabled !== false ? page.hero : null) : config.hero
  const sections = useMemo(() => {
    if (!page) return config.sections ?? []
    return page.sections && page.sections.length > 0 ? page.sections : []
  }, [page, config.sections])

  const toHref = useMemo(
    () => (target: StorefrontPage) => storefrontHref(slug, target.kind === 'home' ? '' : `/${target.slug}`),
    [slug],
  )
  const currentHref = storefrontHref(slug, pathname === '/' ? '' : pathname)
  const nav = useMemo(
    () => resolveNavigation(config, toHref, (href) => href === currentHref),
    [config, toHref, currentHref],
  )

  const heroImageUrl = pickVariant(heroVariants)?.url ?? null
  const logoUrl = pickVariant(logoVariants)?.url ?? null
  const collageImages = heroCarouselVariants
    .map((slide) => pickVariant(slide)?.url)
    .filter((url): url is string => Boolean(url))
  if (collageImages.length === 0 && heroImageUrl) collageImages.push(heroImageUrl)

  const facts = useMemo(() => {
    const list: HeroFact[] = []
    if (teamCount > 0) list.push({ value: String(teamCount), label: teamCount === 1 ? 'Specialist' : 'Specialists' })
    if (business.category) list.push({ value: business.category, label: 'What we do' })
    if (business.location) list.push({ value: business.location, label: 'Where to find us' })
    if (bookingCount > 0) list.push({ value: String(bookingCount), label: 'Booked this month' })
    return list
  }, [teamCount, bookingCount, business.category, business.location])

  // Play the entrance once mounted, so the hero animates rather than appearing
  // already-settled.
  useEffect(() => {
    setPlaying(true)
  }, [])

  // Sections reveal as they scroll into view, so a long page never animates
  // off-screen (and never blocks interaction while it runs).
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (typeof IntersectionObserver === 'undefined') {
      root.querySelectorAll('[data-sf-section]').forEach((node) => node.classList.add('is-in'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    )
    root.querySelectorAll('[data-sf-section]').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [sections])

  const siteStyle = {
    '--sf-header-bg': config.header.background || 'var(--sf-bg)',
    '--sf-header-text': config.header.textColor || 'var(--sf-text)',
    '--sf-footer-bg': config.footer.backgroundColor,
    '--sf-footer-text': config.footer.textColor,
  } as CSSProperties

  const legal = (config.footer.legalLinks ?? []).map((link) => {
    const match = config.pages.find((candidate) => candidate.id === link.href || candidate.slug === link.href)
    return { label: link.label, href: match ? toHref(match) : safeExternalUrl(link.href) }
  })

  return (
    <StorefrontThemeStyle theme={theme}>
      <div
        ref={rootRef}
        className={cn(
          'sf-site',
          `sf-hx-${theme.animation || 'up'}`,
          `sf-hov-${theme.hoverEffect || 'lift'}`,
          theme.pageTransition && theme.pageTransition !== 'none' && `is-pt-${theme.pageTransition}`,
          onSelectSection && 'is-clickable',
          playing && 'is-play',
        )}
        style={siteStyle}
        data-sf-page={pageKind}
      >
        <SiteHeader
          config={config}
          business={business}
          nav={nav}
          logoUrl={logoUrl}
          activeHref={currentHref}
          onNavigate={onNavigate}
          ctaHref={resolveHref(config.header.ctaType)}
        />

        {hero ? (
          <SiteHero
            config={config}
            business={business}
            hero={hero}
            imageUrl={heroImageUrl}
            collageImages={collageImages}
            facts={facts}
            primaryHref={resolveHref(hero.primaryCtaType)}
            secondaryHref={resolveHref(hero.secondaryCtaType)}
            onNavigate={onNavigate}
          />
        ) : null}

        <StorefrontSections
          config={config}
          business={business}
          can={can}
          resolveHref={resolveHref}
          sections={sections}
          themeAnimation={theme.animation || 'up'}
          selectedSectionId={selectedSectionId}
          onSelectSection={onSelectSection}
        />

        {includeFooter
          ? footer ?? (
              <SiteFooter
                config={config}
                business={business}
                nav={nav}
                logoUrl={logoUrl}
                socials={config.footer.socials}
                hours={hours}
                legal={legal}
                onNavigate={onNavigate}
              />
            )
          : null}
      </div>
    </StorefrontThemeStyle>
  )
}
