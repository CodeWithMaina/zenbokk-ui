import { ResponsiveImage } from '../../../ui/responsive-image'
import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Full Background Hero
 * 
 * Full-width background image with dynamic overlay, centered content,
 * and strong focus on the background image as the hero element.
 */
export function HeroFullBackground({ config, onNavigate, heroImageUrl, heroImageVariants = [] }: HeroVariantProps) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: config.height || '100vh',
      }}
    >
      {/* Full Background Image */}
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
          className="absolute inset-0 h-full w-full"
          style={{
            backgroundColor: config.backgroundColor || '#000',
            backgroundImage: config.backgroundStyle === 'gradient'
              ? `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`
              : undefined,
          }}
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: config.overlayColor || 'rgba(0, 0, 0, 0.4)',
          opacity: config.overlayOpacity ?? 0.4,
        }}
        aria-hidden="true"
      />

      {/* Content Container */}
      <div className="relative z-10 h-full w-full flex items-center justify-center px-6 py-8">
        <div
          className="text-center max-w-3xl"
          style={{
            maxWidth: config.contentMaxWidth || '760px',
          }}
        >
          {/* Eyebrow */}
          {config.eyebrow && (
            <p
              className="mb-4 text-xs sm:text-sm font-semibold uppercase tracking-widest"
              style={{
                color: config.headingColor || 'white',
                opacity: 0.85,
              }}
            >
              {config.eyebrow}
            </p>
          )}

          {/* Heading */}
          <h1
            className="mb-6 text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight"
            style={{
              color: config.headingColor || 'white',
              fontFamily: config.headingFont,
              fontSize: config.headingSize,
              fontWeight: config.headingWeight ?? 700,
              letterSpacing: config.letterSpacing,
              lineHeight: config.lineHeight || '1.2',
            }}
          >
            {config.heading}
          </h1>

          {/* Description */}
          {config.description && (
            <p
              className="mb-10 text-lg sm:text-xl leading-relaxed"
              style={{
                color: config.bodyColor || 'rgba(255, 255, 255, 0.9)',
                fontFamily: config.bodyFont,
                fontSize: config.bodySize,
                lineHeight: config.lineHeight || '1.6',
              }}
            >
              {config.description}
            </p>
          )}

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            style={{
              justifyContent: config.buttonAlignment === 'left' ? 'flex-start' : config.buttonAlignment === 'right' ? 'flex-end' : 'center',
            }}
          >
            {config.primaryCtaVisible && config.primaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.primaryCtaDestination || '')}
                className="px-8 py-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: config.buttonColor || '#fff',
                  color: config.buttonTextColor || '#000',
                  borderRadius: config.buttonBorderRadius,
                  fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
                  padding: config.buttonSize === 'lg' ? '16px 32px' : config.buttonSize === 'sm' ? '8px 16px' : '12px 24px',
                }}
              >
                {config.primaryCtaLabel}
              </button>
            )}

            {config.secondaryCtaVisible && config.secondaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.secondaryCtaDestination || '')}
                className="px-8 py-4 rounded-lg font-semibold border-2 transition-all duration-300 transform hover:scale-105 active:scale-95"
                style={{
                  borderColor: config.buttonColor || 'white',
                  color: config.buttonTextColor || 'white',
                  backgroundColor: 'transparent',
                  borderRadius: config.buttonBorderRadius,
                  fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
                  padding: config.buttonSize === 'lg' ? '14px 30px' : config.buttonSize === 'sm' ? '6px 14px' : '10px 22px',
                }}
              >
                {config.secondaryCtaLabel}
              </button>
            )}
          </div>

          {/* Decorative Text */}
          {config.decorativeText && (
            <p
              className="mt-8 text-sm opacity-70"
              style={{ color: config.bodyColor || 'white' }}
            >
              {config.decorativeText}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}










