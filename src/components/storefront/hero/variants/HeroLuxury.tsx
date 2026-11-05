import { ResponsiveImage } from '../../../ui/responsive-image'
import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Luxury Hero
 * 
 * Premium, sophisticated aesthetic with full-width image, refined typography,
 * and subtle elegant interactions. Perfect for upscale, high-end brands.
 */
export function HeroLuxury({ config, onNavigate, heroImageUrl, heroImageVariants = [] }: HeroVariantProps) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: config.height || '100vh',
      }}
    >
      {/* Premium Background Image - Full bleed */}
      {heroImageUrl && heroImageVariants?.length > 0 ? (
        <ResponsiveImage
          variants={heroImageVariants}
          src={heroImageUrl}
          alt=""
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: config.backgroundColor || '#1a1a1a',
            backgroundImage: config.backgroundStyle === 'gradient'
              ? `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`
              : undefined,
          }}
        />
      )}

      {/* Elegant overlay - subtle gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"
        style={{
          opacity: 0.4,
        }}
      />

      {/* Premium content positioning */}
      <div className="relative z-10 h-full w-full flex flex-col justify-end" style={{ padding: config.sectionPadding || '4rem 2rem 6rem' }}>
        <div
          className="mx-auto"
          style={{
            maxWidth: config.contentMaxWidth || '700px',
            textAlign: config.textAlign as any,
          }}
        >
          {/* Refined eyebrow */}
          {config.eyebrow && (
            <p
              className="mb-6 text-xs font-light uppercase tracking-widest"
              style={{
                color: config.headingColor || 'white',
                opacity: 0.8,
                letterSpacing: '0.2em',
              }}
            >
              {config.eyebrow}
            </p>
          )}

          {/* Elegant heading */}
          <h1
            className="mb-6 leading-tight"
            style={{
              color: config.headingColor || 'white',
              fontFamily: config.headingFont || 'serif',
              fontSize: config.headingSize || 'clamp(2.5rem, 8vw, 4.5rem)',
              fontWeight: config.headingWeight ?? 400,
              lineHeight: config.lineHeight || '1.15',
              letterSpacing: config.letterSpacing || '0.02em',
            }}
          >
            {config.heading}
          </h1>

          {/* Sophisticated description */}
          {config.description && (
            <p
              className="mb-10 leading-relaxed max-w-md"
              style={{
                color: config.bodyColor || 'rgba(255, 255, 255, 0.85)',
                fontFamily: config.bodyFont,
                fontSize: config.bodySize || '1.125rem',
                lineHeight: config.lineHeight || '1.75',
                fontWeight: 300,
                letterSpacing: config.letterSpacing || '0.01em',
              }}
            >
              {config.description}
            </p>
          )}

          {/* Premium CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-6 items-start"
            style={{
              justifyContent: config.buttonAlignment === 'left' ? 'flex-start' : config.buttonAlignment === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            {config.primaryCtaVisible && config.primaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.primaryCtaDestination || '')}
                className="px-12 py-3 text-sm font-light uppercase tracking-widest transition-all duration-500 relative overflow-hidden group"
                style={{
                  backgroundColor: config.buttonColor || '#fff',
                  color: config.buttonTextColor || '#000',
                  borderRadius: config.buttonBorderRadius || '0',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.15em',
                }}
              >
                <span className="relative z-10">{config.primaryCtaLabel}</span>
                <div
                  className="absolute inset-0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{
                    backgroundColor: config.buttonTextColor || '#000',
                    opacity: 0.1,
                  }}
                />
              </button>
            )}

            {config.secondaryCtaVisible && config.secondaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.secondaryCtaDestination || '')}
                className="px-12 py-3 text-sm font-light uppercase tracking-widest border-b-2 transition-all duration-500"
                style={{
                  borderColor: config.buttonColor || 'white',
                  color: config.buttonTextColor || 'white',
                  backgroundColor: 'transparent',
                  borderRadius: '0',
                  cursor: 'pointer',
                  letterSpacing: '0.15em',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as HTMLButtonElement
                  target.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                  target.style.color = 'rgba(255, 255, 255, 0.7)'
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget as HTMLButtonElement
                  target.style.borderColor = config.buttonColor || 'white'
                  target.style.color = config.buttonTextColor || 'white'
                }}
              >
                {config.secondaryCtaLabel}
              </button>
            )}
          </div>

          {/* Luxury flourish - decorative text */}
          {config.decorativeText && (
            <p
              className="mt-12 text-xs opacity-60"
              style={{
                color: config.bodyColor || 'white',
                letterSpacing: '0.1em',
              }}
            >
              {config.decorativeText}
            </p>
          )}
        </div>
      </div>

      {/* Subtle corner accent */}
      <div
        className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 opacity-30"
        style={{
          borderColor: config.headingColor || 'white',
        }}
      />
    </section>
  )
}










