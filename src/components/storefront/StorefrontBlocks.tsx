import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, ChevronRight, Clock, Mail, MapPin, Phone, Play, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  ImageVariant,
  PublicBusinessProfile,
  StorefrontConfig,
  StorefrontHero,
  StorefrontSection,
} from '../../lib/api/types'
import { queryKeys } from '../../lib/api/query-client'
import type { CapabilityKey } from '../../lib/entitlements'
import { pickVariant } from '../../lib/media'
import { storefrontApi } from '../../lib/storefront'
import { useStorefrontGallery, useStorefrontOpeningHours } from '../../lib/storefront/use-storefront-public'
import { useStorefrontServices, useStorefrontTeam } from '../../lib/storefront/use-storefront-catalog'
import { heroFacts, heroHeadline } from '../../lib/storefront/hero'
import { ResponsiveImage } from '../ui/responsive-image'
import { StorefrontThemeStyle } from './StorefrontThemeStyle'

/**
 * The schema-driven public storefront renderer.
 *
 * One component tree renders every template and every section variant, driven
 * entirely by the owner's configuration. It is used by the public home page AND
 * by the builder's live preview (which passes `onSelectSection` to make the
 * preview clickable), so what the owner previews is exactly what visitors see.
 *
 * Domain data (services, staff, gallery, reviews, hours) is fetched from the
 * existing public APIs — nothing is duplicated into the configuration.
 */

export type StorefrontRendererProps = {
  config: StorefrontConfig
  business: PublicBusinessProfile
  can: (capability: CapabilityKey) => boolean
  heroVariants?: ImageVariant[]
  /** Resolved carousel slides for the `carousel` hero variant, in order. */
  heroCarouselVariants?: ImageVariant[][]
  /** Maps a CTA destination kind (`book`, `services`, `contact`…) to a URL. */
  resolveHref?: (kind: string) => string
  /** Editor preview: makes sections clickable and highlights the selection. */
  onSelectSection?: (id: string) => void
  selectedSectionId?: string | null
  /** Render the footer inside the renderer (the editor preview does). */
  includeFooter?: boolean
  footer?: ReactNode
}

const FALLBACK_HREF = (kind: string) =>
  kind === 'book' ? '#book' : kind === 'services' ? '#services' : kind === 'contact' ? '#contact' : '#'

export function StorefrontRenderer({
  config,
  business,
  can,
  heroVariants,
  heroCarouselVariants,
  resolveHref = FALLBACK_HREF,
  onSelectSection,
  selectedSectionId,
  includeFooter,
  footer,
}: StorefrontRendererProps) {
  return (
    <StorefrontThemeStyle theme={config.theme}>
      <div className="sf-page-root">
        {config.hero.enabled ? (
          <HeroBlock
            hero={config.hero}
            business={business}
            variants={heroVariants}
            carouselVariants={heroCarouselVariants}
            resolveHref={resolveHref}
          />
        ) : null}
        <StorefrontSections
          config={config}
          business={business}
          can={can}
          resolveHref={resolveHref}
          selectedSectionId={selectedSectionId}
          onSelectSection={onSelectSection}
        />
        {includeFooter ? footer : null}
      </div>
    </StorefrontThemeStyle>
  )
}

/**
 * The owner-configured content sections, in display order.
 *
 * Extracted so the public storefront and the builder preview render exactly the
 * same section list — the preview passes `onSelectSection` to make each one
 * clickable. A disabled section is skipped, and a section whose backing module
 * the business is not entitled to renders nothing (each block gates itself on
 * `can`).
 */
export function StorefrontSections({
  config,
  business,
  can,
  resolveHref = FALLBACK_HREF,
  selectedSectionId,
  onSelectSection,
  sections: overrideSections,
  themeAnimation = 'up',
}: {
  config: StorefrontConfig
  business: PublicBusinessProfile
  can: (capability: CapabilityKey) => boolean
  resolveHref?: (kind: string) => string
  selectedSectionId?: string | null
  onSelectSection?: (id: string) => void
  /** An explicit list (a non-home page's own sections); defaults to the config's. */
  sections?: StorefrontSection[]
  /** The theme's default entrance, used when a section says `inherit`. */
  themeAnimation?: string
}) {
  const sections = (overrideSections ?? config.sections ?? [])
    .filter((section) => section.enabled !== false)
    .slice()
    .sort((a, b) => a.order - b.order)

  return (
    <>
      {sections.map((section) => {
        const own = section.animation && section.animation !== 'inherit' ? section.animation : themeAnimation
        return (
          <SectionBlock
            key={section.id}
            section={section}
            business={business}
            can={can}
            resolveHref={resolveHref}
            animation={own}
            selected={selectedSectionId === section.id}
            onSelect={onSelectSection}
          />
        )
      })}
    </>
  )
}

// ── shared bits ──────────────────────────────────────────────────────────────

function SectionShell({
  section,
  selected,
  onSelect,
  animation,
  children,
}: {
  section: StorefrontSection
  selected?: boolean
  onSelect?: (id: string) => void
  animation?: string | null
  children: ReactNode
}) {
  const clickable = Boolean(onSelect)
  const anim = animation && animation !== 'none' ? animation : null
  const className = [
    'sf-section',
    `sf-${section.key}`,
    `is-${section.variant}`,
    selected ? 'is-selected' : '',
    clickable ? 'is-clickable' : '',
    anim ? `sf-anim-${anim}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <section
      id={section.id}
      data-sf-section={section.key}
      data-sf-variant={section.variant}
      data-bg={section.background ?? 'default'}
      data-pad={section.padding ?? 'normal'}
      data-align={section.alignment ?? 'left'}
      data-anim={anim ?? 'none'}
      onClick={clickable ? () => onSelect!(section.id) : undefined}
      className={className}
    >
      {children}
    </section>
  )
}

function SectionHeading({
  title,
  description,
  align,
}: {
  title?: string | null
  description?: string | null
  align?: 'center' | 'left'
}) {
  if (!title && !description) return null
  return (
    <header className={align === 'center' ? 'sf-sec-head is-center' : 'sf-sec-head'}>
      {title ? <h2 className="sf-heading sf-sec-title">{title}</h2> : null}
      {description ? <p className="sf-lead sf-sec-lead">{description}</p> : null}
    </header>
  )
}

/** Parses a `key | value` multi-line setting into rows. */
function lines(value: string | undefined): string[][] {
  if (!value) return []
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((part) => part.trim()))
}

// ── hero ─────────────────────────────────────────────────────────────────────

function HeroBlock({
  hero,
  business,
  variants,
  carouselVariants,
  resolveHref,
}: {
  hero: StorefrontHero
  business: PublicBusinessProfile
  variants?: ImageVariant[]
  carouselVariants?: ImageVariant[][]
  resolveHref: (kind: string) => string
}) {
  const media = pickVariant(variants ?? [])
  const slides = (carouselVariants ?? [])
    .map((set) => pickVariant(set))
    .filter((variant): variant is ImageVariant => Boolean(variant))
  const headline = heroHeadline(hero.heading || business.name)
  const facts = hero.showFacts
    ? heroFacts([business.location, business.category, business.phoneNumber])
    : []
  const scrim = { opacity: Math.min(Math.max(hero.overlayOpacity, 0), 100) / 100 }

  const isCarousel = hero.variant === 'carousel' && slides.length > 1
  const [slide, setSlide] = useState(0)

  // A carousel only advances itself when the visitor has not asked for reduced
  // motion; otherwise the first slide simply stays put.
  useEffect(() => {
    if (!isCarousel) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 5200)
    return () => window.clearInterval(timer)
  }, [isCarousel, slides.length])

  const actions = (
    <div className="sf-hero-actions">
      <a href={resolveHref(hero.primaryCtaType)} className="sf-btn is-solid">{hero.primaryCtaLabel}</a>
      <a href={resolveHref(hero.secondaryCtaType)} className="sf-btn is-outline">{hero.secondaryCtaLabel}</a>
    </div>
  )

  const copy = (
    <div className="sf-hero-copy">
      {hero.showLogo && business.logoUrl ? (
        <img src={business.logoUrl} alt="" className="sf-hero-logo" />
      ) : null}
      <p className="sf-eyebrow">{hero.eyebrow ?? business.category ?? 'Welcome'}</p>
      <h1 className="sf-hero-title">
        {headline.lead}
        {headline.emphasis ? <em> {headline.emphasis}</em> : null}
      </h1>
      {hero.subheading ? <p className="sf-hero-sub">{hero.subheading}</p> : null}
      {hero.description ? <p className="sf-hero-lead">{hero.description}</p> : null}
      {actions}
    </div>
  )

  const fullBleedMedia = media ? (
    <ResponsiveImage
      variants={variants ?? []}
      src={media.url}
      alt=""
      sizes="100vw"
      loading="eager"
      fetchPriority="high"
      className="sf-hero-media"
    />
  ) : null

  const factsStrip = facts.length > 0 ? (
    <div className="sf-hero-facts">
      <div className="sf-container">
        <ul>{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
      </div>
    </div>
  ) : null

  const sectionClass = `sf-hero is-${hero.variant} h-${hero.height} align-${hero.textAlign}`

  // ── split: media beside the copy ───────────────────────────────────────────
  if (hero.variant === 'split') {
    return (
      <section className={sectionClass} style={{ background: hero.backgroundColor }}>
        <div className="sf-hero-split">
          <div className="sf-hero-split-media">
            {media ? (
              <ResponsiveImage variants={variants ?? []} src={media.url} alt="" sizes="50vw" loading="eager" />
            ) : null}
          </div>
          <div className="sf-container">{copy}</div>
        </div>
        {factsStrip}
      </section>
    )
  }

  // ── minimal: text-first, no image ──────────────────────────────────────────
  if (hero.variant === 'minimal') {
    return (
      <section className={sectionClass} style={{ background: hero.backgroundColor }}>
        <div className="sf-container sf-hero-body is-bare">
          <span className="sf-hero-rule" aria-hidden="true" />
          {copy}
        </div>
        {factsStrip}
      </section>
    )
  }

  // ── editorial: asymmetric — copy beside an offset image column ─────────────
  if (hero.variant === 'editorial') {
    return (
      <section className={sectionClass} style={{ background: hero.backgroundColor }}>
        <div className="sf-container sf-hero-editorial">
          {copy}
          <div className="sf-hero-editorial-media">{fullBleedMedia}</div>
        </div>
        {factsStrip}
      </section>
    )
  }

  // ── gradient: token gradient, no image ─────────────────────────────────────
  if (hero.variant === 'gradient') {
    return (
      <section className={sectionClass} style={{ background: hero.backgroundColor }}>
        <div className="sf-hero-gradient" aria-hidden="true" />
        <div className="sf-container sf-hero-body">{copy}</div>
        {factsStrip}
      </section>
    )
  }

  // ── carousel: crossfading slides ───────────────────────────────────────────
  if (hero.variant === 'carousel' && slides.length > 0) {
    const current = slide % slides.length
    return (
      <section className={sectionClass} style={{ background: hero.backgroundColor }}>
        <div className="sf-hero-slides" aria-hidden="true">
          {slides.map((variant, index) => (
            <img
              key={variant.url}
              src={variant.url}
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              className={index === current ? 'sf-hero-slide is-on' : 'sf-hero-slide'}
            />
          ))}
        </div>
        <div className="sf-hero-scrim" style={scrim} aria-hidden="true" />
        <div className="sf-container sf-hero-body">{copy}</div>
        {slides.length > 1 ? (
          <div className="sf-hero-dots">
            {slides.map((variant, index) => (
              <button
                key={variant.url}
                type="button"
                aria-label={`Show image ${index + 1}`}
                aria-current={index === current}
                className={index === current ? 'sf-hero-dot is-on' : 'sf-hero-dot'}
                onClick={() => setSlide(index)}
              />
            ))}
          </div>
        ) : null}
        {factsStrip}
      </section>
    )
  }

  // ── full-image / centered / premium / video ────────────────────────────────
  // Full-bleed media (or a background video when one is supplied) with a scrim.
  const videoUrl = hero.variant === 'video' ? hero.videoUrl : null
  return (
    <section className={sectionClass} style={{ background: hero.backgroundColor }}>
      {videoUrl ? (
        <video className="sf-hero-video" autoPlay muted loop playsInline preload="metadata" poster={media?.url}>
          <source src={videoUrl} />
        </video>
      ) : (
        fullBleedMedia
      )}
      <div className="sf-hero-scrim" style={scrim} aria-hidden="true" />
      <div className="sf-container sf-hero-body">
        {hero.variant === 'premium' ? <span className="sf-hero-rule is-premium" aria-hidden="true" /> : null}
        {copy}
      </div>
      {hero.variant === 'video' && !videoUrl ? (
        <span className="sf-hero-play" aria-hidden="true">
          <Play className="size-[1.1rem]" />
        </span>
      ) : null}
      {factsStrip}
    </section>
  )
}

// ── dispatcher ───────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  business,
  can,
  resolveHref,
  selected,
  onSelect,
  animation,
}: {
  section: StorefrontSection
  business: PublicBusinessProfile
  can: (capability: CapabilityKey) => boolean
  resolveHref: (kind: string) => string
  selected?: boolean
  onSelect?: (id: string) => void
  animation?: string | null
}) {
  const shell = (children: ReactNode) => (
    <SectionShell section={section} selected={selected} onSelect={onSelect} animation={animation}>
      {children}
    </SectionShell>
  )

  switch (section.key) {
    case 'services':
      return shell(<ServicesSection section={section} business={business} can={can} resolveHref={resolveHref} />)
    case 'about':
      return shell(<AboutSection section={section} business={business} />)
    case 'team':
      return shell(<TeamSection section={section} business={business} />)
    case 'gallery':
      return shell(<GallerySection section={section} business={business} can={can} />)
    case 'testimonials':
      return shell(<TestimonialsSection section={section} business={business} can={can} />)
    case 'booking':
      return shell(<BookingSection section={section} business={business} can={can} resolveHref={resolveHref} />)
    case 'stats':
      return shell(<StatsSection section={section} />)
    case 'hours':
      return shell(<HoursSection section={section} business={business} />)
    case 'contact':
      return shell(<ContactSection section={section} business={business} />)
    case 'faq':
      return shell(<FaqSection section={section} />)
    case 'promotions':
      return shell(<PromotionsSection section={section} />)
    case 'loyalty':
      return shell(<LoyaltySection section={section} business={business} can={can} />)
    case 'social':
      return shell(<SocialSection section={section} />)
    case 'newsletter':
      return shell(<NewsletterSection section={section} />)
    case 'richtext':
      return shell(<RichTextSection section={section} />)
    case 'announcement':
      return shell(<AnnouncementSection section={section} />)
    case 'embed':
      return shell(<EmbedSection section={section} />)
    default:
      return null
  }
}

// ── services ─────────────────────────────────────────────────────────────────

function ServiceCard({ service, variant }: { service: { id: string; name: string; description: string | null; durationMinutes: number; price: number; imageVariants: ImageVariant[] }; variant: string }) {
  const image = pickVariant(service.imageVariants)
  return (
    <a href="#services" className={`sf-service-card is-${variant}`}>
      {variant !== 'list' && image ? (
        <div className="sf-service-media">
          <ResponsiveImage variants={service.imageVariants} src={image.url} alt="" sizes="(max-width: 700px) 90vw, 22rem" />
        </div>
      ) : null}
      <div className="sf-service-body">
        <h3 className="sf-service-name">{service.name}</h3>
        {service.description ? <p className="sf-service-desc">{service.description}</p> : null}
        <div className="sf-service-meta">
          <span className="sf-service-price">
            {service.price > 0 ? `KSh ${service.price.toLocaleString()}` : 'Free'}
          </span>
          {service.durationMinutes > 0 ? (
            <span className="sf-service-duration">{service.durationMinutes} min</span>
          ) : null}
          <ChevronRight className="sf-service-arrow" aria-hidden="true" />
        </div>
      </div>
    </a>
  )
}

function ServicesSection({
  section,
  business,
  can,
  resolveHref,
}: {
  section: StorefrontSection
  business: PublicBusinessProfile
  can: (capability: CapabilityKey) => boolean
  resolveHref: (kind: string) => string
}) {
  const services = useStorefrontServices(business.id, can('services'))
  const list = services.services

  if (!can('services')) return null

  const layoutClass =
    section.variant === 'list'
      ? 'sf-services is-list'
      : section.variant === 'scroller'
        ? 'sf-services is-scroller'
        : section.variant === 'featured'
          ? 'sf-services is-featured'
          : 'sf-services is-grid'

  const items =
    section.variant === 'featured'
      ? [...list].sort((a, b) => Number(b.showcase) - Number(a.showcase)).slice(0, 3)
      : section.variant === 'scroller'
        ? list.slice(0, 10)
        : list.slice(0, 9)

  return (
    <div className="sf-container">
      <SectionHeading title={section.title} description={section.description} />
      {services.isLoading ? (
        <div className={layoutClass}>
          {[0, 1, 2].map((i) => <div key={i} className="sf-service-card is-skeleton" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="sf-empty">Services will appear here once they are published.</p>
      ) : (
        <div className={layoutClass}>
          {items.map((service) => (
            <ServiceCard key={service.id} service={service} variant={section.variant} />
          ))}
        </div>
      )}
      <div className="sf-sec-foot">
        <a href={resolveHref('services')} className="sf-link">
          View all services <ChevronRight className="size-[0.9rem]" aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}

// ── about ────────────────────────────────────────────────────────────────────

function AboutSection({ section, business }: { section: StorefrontSection; business: PublicBusinessProfile }) {
  const body = section.settings.body ?? business.description ?? null
  const media = section.settings.imageMediaId ? null : business.logoUrl

  return (
    <div className="sf-container">
      <div className={`sf-about is-${section.variant}`}>
        {section.variant === 'image-right' || section.variant === 'editorial' ? null : (
          <div className="sf-about-media">{media ? <img src={media} alt="" /> : <div className="sf-about-media-fill" />}</div>
        )}
        <div className="sf-about-copy">
          <SectionHeading title={section.title} align={section.variant === 'centered' ? 'center' : 'left'} />
          {body ? <p className="sf-body">{body}</p> : null}
          {section.settings.mission ? <p className="sf-body sf-about-mission">{section.settings.mission}</p> : null}
        </div>
        {section.variant === 'image-right' || section.variant === 'editorial' ? (
          <div className="sf-about-media">{media ? <img src={media} alt="" /> : <div className="sf-about-media-fill" />}</div>
        ) : null}
      </div>
    </div>
  )
}

// ── team ─────────────────────────────────────────────────────────────────────

function TeamSection({ section, business }: { section: StorefrontSection; business: PublicBusinessProfile }) {
  const team = useStorefrontTeam(business.id)
  const members = team.data ?? []

  // A business with no roster shows no team section rather than an empty frame.
  if (team.isLoading || members.length === 0) return null

  return (
    <div className="sf-container">
      <SectionHeading title={section.title} description={section.description} />
      <ul className={`sf-team is-${section.variant}`}>
        {members.map((member) => (
          <li key={member.userId} className="sf-team-member">
            <div className="sf-team-avatar">
              {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <span>{member.fullName.charAt(0)}</span>}
            </div>
            <p className="sf-team-name">{member.fullName}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── gallery ──────────────────────────────────────────────────────────────────

function GallerySection({
  section,
  business,
  can,
}: {
  section: StorefrontSection
  business: PublicBusinessProfile
  can: (capability: CapabilityKey) => boolean
}) {
  const gallery = useStorefrontGallery(business.id, can('gallery'))
  const images = (gallery.data?.images ?? []).filter((image) => image.variants.length > 0)

  if (!can('gallery')) return null
  if (gallery.isLoading) {
    return <div className="sf-container"><div className="sf-gallery is-skeleton" /></div>
  }
  if (images.length === 0) return null

  const variant = section.variant
  return (
    <div className="sf-container">
      <SectionHeading title={section.title} description={section.description} />
      <ul className={`sf-gallery is-${variant}`}>
        {images.slice(0, variant === 'full-width' ? 1 : 8).map((image) => {
          const best = pickVariant(image.variants)
          return (
            <li key={image.mediaId} className="sf-gallery-item">
              {best ? (
                <ResponsiveImage
                  variants={image.variants}
                  src={best.url}
                  alt={image.caption ?? ''}
                  sizes="(max-width: 700px) 90vw, 30vw"
                />
              ) : null}
              {image.caption ? <span className="sf-gallery-caption">{image.caption}</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── testimonials ─────────────────────────────────────────────────────────────

function useReviews(businessId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.storefront(businessId), 'reviews'] as const,
    queryFn: () => storefrontApi.reviews(businessId, 1, 6),
    enabled,
  })
}

function TestimonialsSection({
  section,
  business,
  can,
}: {
  section: StorefrontSection
  business: PublicBusinessProfile
  can: (capability: CapabilityKey) => boolean
}) {
  const reviews = useReviews(business.id, can('galleryReviews'))
  const items = reviews.data?.items ?? []

  if (!can('galleryReviews')) return null
  // Real reviews only — a business with none shows no testimonial section.
  if (reviews.isLoading || items.length === 0) return null

  const variant = section.variant
  const shown = variant === 'quote' || variant === 'carousel' ? items.slice(0, 1) : items.slice(0, 6)

  return (
    <div className="sf-container">
      <SectionHeading
        title={section.title}
        description={section.description}
        align={variant === 'quote' ? 'center' : 'left'}
      />
      <ul className={`sf-testimonials is-${variant}`}>
        {shown.map((review) => (
          <li key={review.id} className="sf-testimonial">
            <div className="sf-testimonial-stars" aria-label={`${review.rating} out of 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={i < review.rating ? 'is-on' : ''} aria-hidden="true" />
              ))}
            </div>
            {review.comment ? <blockquote className="sf-testimonial-quote">{review.comment}</blockquote> : null}
            <p className="sf-testimonial-author">{review.reviewerDisplayName ?? 'Verified client'}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── booking ──────────────────────────────────────────────────────────────────

function BookingSection({
  section,
  business,
  can,
  resolveHref,
}: {
  section: StorefrontSection
  business: PublicBusinessProfile
  can: (capability: CapabilityKey) => boolean
  resolveHref: (kind: string) => string
}) {
  if (!can('appointments')) return null
  const cta = section.settings.ctaLabel ?? 'Book an appointment'

  return (
    <div className="sf-container">
      <div className={`sf-booking is-${section.variant}`}>
        <div className="sf-booking-copy">
          <p className="sf-eyebrow">Booking</p>
          <h2 className="sf-heading">{section.title ?? 'Book your visit'}</h2>
          {section.description ? <p className="sf-lead">{section.description}</p> : null}
        </div>
        <div className="sf-booking-actions">
          <a href={resolveHref('book')} className="sf-btn is-solid">
            <CalendarPlus className="size-[1rem]" aria-hidden="true" />
            {cta}
          </a>
          {business.phoneNumber ? (
            <a href={`tel:${business.phoneNumber}`} className="sf-btn is-outline">
              <Phone className="size-[1rem]" aria-hidden="true" />
              {business.phoneNumber}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── hours ────────────────────────────────────────────────────────────────────

function HoursSection({ section, business }: { section: StorefrontSection; business: PublicBusinessProfile }) {
  const hours = useStorefrontOpeningHours(business.id)
  const days = hours.data?.days ?? []
  if (hours.isLoading || days.length === 0) return null

  return (
    <div className="sf-container">
      <SectionHeading title={section.title} description={section.description} />
      <ul className={`sf-hours is-${section.variant}`}>
        {days.map((day) => (
          <li key={day.day} className={day.isClosed ? 'is-closed' : ''}>
            <span className="sf-hours-day">{day.day}</span>
            <span className="sf-hours-time">
              {day.isClosed || day.periods.length === 0
                ? 'Closed'
                : day.periods.map((period) => `${period.opensAt}–${period.closesAt}`).join(', ')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── contact ──────────────────────────────────────────────────────────────────

function ContactSection({ section, business }: { section: StorefrontSection; business: PublicBusinessProfile }) {
  return (
    <div className="sf-container">
      <SectionHeading title={section.title} description={section.description} />
      <div className={`sf-contact is-${section.variant}`}>
        <ul className="sf-contact-list">
          {business.location ? (
            <li>
              <MapPin className="sf-contact-icon" aria-hidden="true" />
              <span>{business.location}</span>
            </li>
          ) : null}
          {business.phoneNumber ? (
            <li>
              <Phone className="sf-contact-icon" aria-hidden="true" />
              <a href={`tel:${business.phoneNumber}`} className="link">{business.phoneNumber}</a>
            </li>
          ) : null}
          {business.email ? (
            <li>
              <Mail className="sf-contact-icon" aria-hidden="true" />
              <a href={`mailto:${business.email}`} className="link">{business.email}</a>
            </li>
          ) : null}
          {section.settings.note ? (
            <li>
              <Clock className="sf-contact-icon" aria-hidden="true" />
              <span>{section.settings.note}</span>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}

// ── settings-driven sections ─────────────────────────────────────────────────

function StatsSection({ section }: { section: StorefrontSection }) {
  const items = lines(section.settings.items)
  if (items.length === 0) return null
  return (
    <div className="sf-container">
      <SectionHeading title={section.title} description={section.description} />
      <ul className={`sf-stats is-${section.variant}`}>
        {items.map(([value, label]) => (
          <li key={`${value}-${label}`}>
            <span className="sf-stats-value">{value}</span>
            <span className="sf-stats-label">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FaqSection({ section }: { section: StorefrontSection }) {
  const items = lines(section.settings.items)
  if (items.length === 0) return null
  return (
    <div className="sf-container">
      <SectionHeading title={section.title} description={section.description} />
      <div className={`sf-faq is-${section.variant}`}>
        {items.map(([question, answer]) => (
          <details key={question} className="sf-faq-item">
            <summary>{question}</summary>
            {answer ? <p>{answer}</p> : null}
          </details>
        ))}
      </div>
    </div>
  )
}

function PromotionsSection({ section }: { section: StorefrontSection }) {
  const items = lines(section.settings.items)
  if (items.length === 0) return null
  return (
    <div className="sf-container">
      <SectionHeading title={section.title} description={section.description} />
      <ul className={`sf-promos is-${section.variant}`}>
        {items.map(([title, description]) => (
          <li key={title} className="sf-promo">
            <h3 className="sf-promo-title">{title}</h3>
            {description ? <p className="sf-promo-desc">{description}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function LoyaltySection({
  section,
  business,
  can,
}: {
  section: StorefrontSection
  business: PublicBusinessProfile
  can: (capability: CapabilityKey) => boolean
}) {
  const program = business.loyaltyProgram
  if (!can('loyalty') || !program) return null
  return (
    <div className="sf-container">
      <div className={`sf-loyalty is-${section.variant}`}>
        <div>
          <SectionHeading title={section.title ?? program.name} description={section.description} />
          <p className="sf-body">{program.rewardDescription}</p>
        </div>
        <div className="sf-loyalty-badge">
          <span className="sf-loyalty-count">{program.stampsRequired}</span>
          <span className="sf-loyalty-unit">stamps to reward</span>
        </div>
      </div>
    </div>
  )
}

function SocialSection({ section }: { section: StorefrontSection }) {
  const items = lines(section.settings.items)
  if (items.length === 0) return null
  return (
    <div className="sf-container">
      <SectionHeading title={section.title} description={section.description} align="center" />
      <ul className={`sf-social is-${section.variant}`}>
        {items.map(([label, href]) => (
          <li key={`${label}-${href}`}>
            <a href={href} target="_blank" rel="noreferrer noopener" className="sf-social-link">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NewsletterSection({ section }: { section: StorefrontSection }) {
  return (
    <div className="sf-container">
      <div className={`sf-newsletter is-${section.variant}`}>
        <div>
          <h2 className="sf-heading">{section.title ?? 'Stay in the loop'}</h2>
          {section.description ? <p className="sf-lead">{section.description}</p> : null}
        </div>
        <form className="sf-newsletter-form" onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor={`nl-${section.id}`}>Email address</label>
          <input id={`nl-${section.id}`} type="email" required placeholder="you@example.com" className="sf-input" />
          <button type="submit" className="sf-btn is-solid">Subscribe</button>
        </form>
      </div>
    </div>
  )
}

function RichTextSection({ section }: { section: StorefrontSection }) {
  const body = section.settings.body ?? ''
  if (!body && !section.title) return null
  const image = section.settings.imageUrl ?? null
  return (
    <div className="sf-container">
      <div className={`sf-richtext is-${section.variant}`}>
        {image && section.variant !== 'text' ? <div className="sf-richtext-media"><img src={image} alt="" /></div> : null}
        <div className="sf-richtext-copy">
          {section.title ? <h2 className="sf-heading">{section.title}</h2> : null}
          {body ? <p className="sf-body">{body}</p> : null}
        </div>
      </div>
    </div>
  )
}

function AnnouncementSection({ section }: { section: StorefrontSection }) {
  const message = section.settings.message ?? section.title
  if (!message) return null
  return (
    <div className="sf-container">
      <div className={`sf-announcement is-${section.variant}`}>{message}</div>
    </div>
  )
}

function EmbedSection({ section }: { section: StorefrontSection }) {
  const html = section.settings.html ?? ''
  if (!html) return null
  // Rendered inside a sandboxed iframe so embedded markup can never reach the
  // storefront's origin, cookies or DOM (no script/allow-same-origin).
  return (
    <div className="sf-container">
      <iframe
        title={section.title ?? 'Embedded content'}
        className="sf-embed"
        sandbox=""
        srcDoc={html}
        loading="lazy"
      />
    </div>
  )
}
