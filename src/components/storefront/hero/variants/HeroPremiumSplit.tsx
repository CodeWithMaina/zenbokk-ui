import { ResponsiveImage } from '../../../ui/responsive-image'
import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Premium Split Hero
 * 
 * Content on the left, image on the right. Balanced layout with generous
 * whitespace, perfect for premium businesses seeking sophistication.
 */
export function HeroPremiumSplit({ config, onNavigate, heroImageUrl, heroImageVariants = [] }: HeroVariantProps) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: config.height || '100vh',
        backgroundColor: config.backgroundColor || '#fff',
      }}
    >
      {/* Background solid/gradient */}
      {config.backgroundStyle === 'gradient' && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`,
          }}
        />
      )}

      {/* Split Layout Container */}
      <div className="relative z-10 h-full w-full flex items-stretch">
        {/* Left Content */}
        <div
          className="w-full lg:w-1/2 flex items-center"
          style={{
            padding: config.sectionPadding || '4rem 2rem',
            backgroundColor: config.backgroundColor || '#fff',
          }}
        >
          <div
            className="w-full"
            style={{
              maxWidth: config.contentMaxWidth || '550px',
              textAlign: config.textAlign as any,
            }}
          >
            {/* Eyebrow */}
            {config.eyebrow && (
              <p
                className="mb-3 text-sm font-semibold uppercase tracking-widest"
                style={{
                  color: config.bodyColor || '#666',
                  opacity: 0.7,
                }}
              >
                {config.eyebrow}
              </p>
            )}

            {/* Heading */}
            <h1
              className="mb-6 text-4xl sm:text-5xl leading-tight"
              style={{
                color: config.headingColor || '#000',
                fontFamily: config.headingFont,
                fontSize: config.headingSize,
                fontWeight: config.headingWeight ?? 700,
                lineHeight: config.lineHeight || '1.2',
              }}
            >
              {config.heading}
            </h1>

            {/* Description */}
            {config.description && (
              <p
                className="mb-8 text-lg leading-relaxed"
                style={{
                  color: config.bodyColor || '#555',
                  fontFamily: config.bodyFont,
                  fontSize: config.bodySize,
                  lineHeight: config.lineHeight || '1.7',
                }}
              >
                {config.description}
              </p>
            )}

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-4"
              style={{
                justifyContent: config.buttonAlignment === 'left' ? 'flex-start' : config.buttonAlignment === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              {config.primaryCtaVisible && config.primaryCtaLabel && (
                <button
                  onClick={() => onNavigate?.(config.primaryCtaDestination || '')}
                  className="px-8 py-3 rounded font-semibold transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
                  style={{
                    backgroundColor: config.buttonColor || '#000',
                    color: config.buttonTextColor || '#fff',
                    borderRadius: config.buttonBorderRadius || '0.375rem',
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
                  className="px-8 py-3 rounded font-semibold border-2 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
                  style={{
                    borderColor: config.buttonColor || '#000',
                    color: config.buttonColor || '#000',
                    backgroundColor: 'transparent',
                    borderRadius: config.buttonBorderRadius || '0.375rem',
                    fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
                    padding: config.buttonSize === 'lg' ? '14px 30px' : config.buttonSize === 'sm' ? '6px 14px' : '10px 22px',
                  }}
                >
                  {config.secondaryCtaLabel}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="hidden lg:block w-1/2 relative">
          {heroImageUrl && heroImageVariants?.length > 0 ? (
            <ResponsiveImage
              variants={heroImageVariants}
              src={heroImageUrl}
              alt=""
              sizes="50vw"
              loading="eager"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                backgroundColor: config.backgroundColor || '#f0f0f0',
              }}
            />
          )}

          {/* Overlay if needed */}
          {config.overlayOpacity > 0 && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: config.overlayColor || 'rgba(0, 0, 0, 0.2)',
                opacity: config.overlayOpacity,
              }}
            />
          )}
        </div>
      </div>

      {/* Mobile fallback - stack vertically */}
      {heroImageUrl && heroImageVariants?.length > 0 && (
        <div className="absolute inset-0 lg:hidden">
          <ResponsiveImage
            variants={heroImageVariants}
            src={heroImageUrl}
            alt=""
            sizes="100vw"
            loading="eager"
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: config.overlayColor || 'rgba(0, 0, 0, 0.3)',
              opacity: config.overlayOpacity ?? 0.3,
            }}
          />
        </div>
      )}
    </section>
  )
}










