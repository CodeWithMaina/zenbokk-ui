import { ResponsiveImage } from '../../../ui/responsive-image'
import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Editorial Hero
 * 
 * Oversized typography with asymmetric layout. Bold, editorial style
 * that demands attention with strong visual hierarchy and dynamic positioning.
 */
export function HeroEditorial({ config, onNavigate, heroImageUrl, heroImageVariants = [] }: HeroVariantProps) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: config.height || '120vh',
        backgroundColor: config.backgroundColor || '#f5f5f5',
      }}
    >
      {/* Full bleed background */}
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
            backgroundColor: config.backgroundColor || '#f5f5f5',
            backgroundImage: config.backgroundStyle === 'gradient'
              ? `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`
              : undefined,
          }}
        />
      )}

      {/* Overlay */}
      {config.overlayOpacity > 0 && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: config.overlayColor || 'rgba(0, 0, 0, 0.2)',
            opacity: config.overlayOpacity,
          }}
        />
      )}

      {/* Asymmetric Content Layout */}
      <div className="relative z-10 h-full w-full flex flex-col justify-between" style={{ padding: config.sectionPadding || '3rem 2rem' }}>
        {/* Top section - Eyebrow and decorative element */}
        <div className="mb-12">
          {config.eyebrow && (
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{
                color: config.bodyColor || '#333',
                opacity: 0.7,
              }}
            >
              {config.eyebrow}
            </p>
          )}
          
          {/* Decorative graphic element */}
          <div
            className="w-16 h-1 mb-8"
            style={{
              backgroundColor: config.buttonColor || '#000',
            }}
          />
        </div>

        {/* Main Content - Positioned bottom-left with oversized type */}
        <div
          style={{
            maxWidth: config.contentMaxWidth || '85%',
            marginBottom: '2rem',
          }}
        >
          {/* Oversized Heading */}
          <h1
            className="leading-none mb-6"
            style={{
              color: config.headingColor || '#fff',
              fontFamily: config.headingFont,
              fontSize: config.headingSize || 'clamp(3.5rem, 12vw, 8rem)',
              fontWeight: config.headingWeight ?? 800,
              lineHeight: '0.95',
              letterSpacing: config.letterSpacing || '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            {config.heading}
          </h1>

          {/* Description - Secondary */}
          {config.description && (
            <p
              className="mb-8 max-w-2xl text-lg leading-relaxed"
              style={{
                color: config.bodyColor || 'rgba(255, 255, 255, 0.9)',
                fontFamily: config.bodyFont,
                fontSize: config.bodySize,
                lineHeight: config.lineHeight || '1.6',
                fontWeight: 300,
              }}
            >
              {config.description}
            </p>
          )}

          {/* CTAs - Bold and direct */}
          <div
            className="flex flex-col sm:flex-row gap-4 mt-10"
            style={{
              justifyContent: config.buttonAlignment === 'left' ? 'flex-start' : config.buttonAlignment === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            {config.primaryCtaVisible && config.primaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.primaryCtaDestination || '')}
                className="px-10 py-4 font-bold text-lg uppercase tracking-widest transition-all duration-300 transform hover:scale-110"
                style={{
                  backgroundColor: config.buttonColor || '#000',
                  color: config.buttonTextColor || '#fff',
                  borderRadius: config.buttonBorderRadius || '0',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                }}
              >
                {config.primaryCtaLabel}
              </button>
            )}

            {config.secondaryCtaVisible && config.secondaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.secondaryCtaDestination || '')}
                className="px-10 py-4 font-bold text-lg uppercase tracking-widest border-2 transition-all duration-300 transform hover:scale-110"
                style={{
                  borderColor: config.buttonColor || '#fff',
                  color: config.buttonTextColor || '#fff',
                  backgroundColor: 'transparent',
                  borderRadius: config.buttonBorderRadius || '0',
                  cursor: 'pointer',
                }}
              >
                {config.secondaryCtaLabel}
              </button>
            )}
          </div>
        </div>

        {/* Bottom - Scroll indicator */}
        {config.decorativeText && (
          <div className="text-center mt-auto">
            <p
              className="text-xs uppercase tracking-widest animate-pulse"
              style={{
                color: config.bodyColor || 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {config.decorativeText}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}










