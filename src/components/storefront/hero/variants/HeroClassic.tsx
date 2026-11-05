import { ArrowRight, Phone } from 'lucide-react'
import { pickVariant } from '../../../../lib/media'
import { storefrontHref } from '../../../../lib/tenant'
import { ResponsiveImage } from '../../../ui/responsive-image'
import { StorefrontHeroCanvas } from '../../StorefrontHeroCanvas'
import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Classic Hero Variant
 * 
 * Reproduces the existing StorefrontHero exactly, maintaining all visual
 * appearance, spacing, typography, layout, and image handling.
 */
export function HeroClassic({
  config,
  business,
  heroImageUrl,
  heroImageVariants = [],
  onNavigate,
}: HeroVariantProps) {
  const heroImage = pickVariant(heroImageVariants)
  const bookingHref = storefrontHref(business.slug || '', '/book')

  return (
    <section className="sf-hero min-h-svh relative">
      {/* Background Image or Canvas */}
      {heroImage && heroImageUrl ? (
        <ResponsiveImage
          variants={heroImageVariants}
          src={heroImageUrl}
          alt=""
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="sf-hero-media absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0">
          <StorefrontHeroCanvas />
        </div>
      )}

      {/* Overlay scrim */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          backgroundColor: config.overlayColor || 'rgba(0, 0, 0, 0)',
          opacity: config.overlayOpacity ?? 0.3,
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 sf-container min-h-svh flex flex-col items-center justify-center text-center px-[1rem] py-[2rem] gap-[1.5rem]">
        {/* Eyebrow */}
        {config.eyebrow && (
          <p
            className="sf-hero-kicker text-sm font-medium uppercase tracking-widest"
            style={{ color: config.headingColor || 'var(--premium-text)' }}
          >
            {config.eyebrow}
          </p>
        )}

        {/* Heading */}
        <h1
          className="sf-hero-title text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight max-w-2xl"
          style={{
            color: config.headingColor || 'var(--premium-text)',
            fontFamily: config.headingFont || 'var(--premium-font-heading)',
            fontSize: config.headingSize || 'inherit',
            fontWeight: config.headingWeight ?? 700,
          }}
        >
          {config.heading}
        </h1>

        {/* Description */}
        {config.description && (
          <p
            className="sf-hero-description text-lg sm:text-xl max-w-xl leading-relaxed"
            style={{
              color: config.bodyColor || 'var(--premium-muted-text)',
              fontFamily: config.bodyFont || 'var(--premium-font-body)',
              fontSize: config.bodySize || '1.125rem',
              lineHeight: config.lineHeight || '1.6',
            }}
          >
            {config.description}
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-[1rem] justify-center items-center mt-[1rem]">
          {config.primaryCtaVisible && config.primaryCtaLabel && (
            <a
              href={config.primaryCtaDestination || bookingHref}
              className="inline-flex items-center gap-[0.5rem] rounded px-[1.5rem] py-[0.75rem] font-medium transition-all hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: config.buttonColor || 'var(--premium-primary)',
                color: config.buttonTextColor || 'white',
                borderRadius: config.buttonBorderRadius || '0.375rem',
                fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
              }}
              onClick={(e) => {
                e.preventDefault()
                onNavigate?.(config.primaryCtaDestination || bookingHref)
              }}
            >
              {config.primaryCtaLabel}
              <ArrowRight className="w-4 h-4" />
            </a>
          )}

          {config.secondaryCtaVisible && config.secondaryCtaLabel && (
            <a
              href={config.secondaryCtaDestination || '#'}
              className="inline-flex items-center gap-[0.5rem] rounded px-[1.5rem] py-[0.75rem] font-medium transition-all hover:opacity-90 border-2"
              style={{
                borderColor: config.buttonColor || 'var(--premium-primary)',
                color: config.buttonColor || 'var(--premium-primary)',
                borderRadius: config.buttonBorderRadius || '0.375rem',
              }}
              onClick={(e) => {
                e.preventDefault()
                onNavigate?.(config.secondaryCtaDestination || '#')
              }}
            >
              {config.secondaryCtaLabel}
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Decorative text */}
        {config.decorativeText && (
          <p
            className="text-sm opacity-75 mt-[2rem]"
            style={{ color: config.bodyColor || 'var(--premium-muted-text)' }}
          >
            {config.decorativeText}
          </p>
        )}
      </div>
    </section>
  )
}





