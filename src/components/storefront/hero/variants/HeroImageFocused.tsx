import { ResponsiveImage } from '../../../ui/responsive-image'
import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Image Focused Hero
 * 
 * Dominant hero image with carefully positioned text overlay.
 * Image takes center stage while text complements without competing.
 */
export function HeroImageFocused({ config, onNavigate, heroImageUrl, heroImageVariants = [] }: HeroVariantProps) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: config.height || '100vh',
      }}
    >
      {/* Hero Image - Full viewport */}
      {heroImageUrl && heroImageVariants?.length > 0 ? (
        <div
          className="absolute inset-0 h-full w-full"
          style={{
            objectPosition: config.imageFocalPoint || 'center',
          }}
        >
          <ResponsiveImage
            variants={heroImageVariants}
            src={heroImageUrl}
            alt=""
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: config.backgroundColor || '#333',
            backgroundImage: config.backgroundStyle === 'gradient'
              ? `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`
              : undefined,
          }}
        />
      )}

      {/* Intelligent overlay - stronger at content area */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: config.overlayColor || 'rgba(0, 0, 0, 0.3)',
          opacity: config.overlayOpacity ?? 0.3,
          backgroundImage: `linear-gradient(
            to ${config.verticalPosition === 'bottom' ? 'top' : 'bottom'},
            rgba(0, 0, 0, 0.6) 0%,
            rgba(0, 0, 0, 0) 50%
          )`,
        }}
      />

      {/* Content Positioned */}
      <div
        className="absolute inset-0 z-10"
        style={{
          display: 'flex',
          alignItems: config.verticalPosition === 'top' ? 'flex-start' : config.verticalPosition === 'bottom' ? 'flex-end' : 'center',
          justifyContent: config.horizontalPosition === 'left' ? 'flex-start' : config.horizontalPosition === 'right' ? 'flex-end' : 'center',
          padding: config.sectionPadding || '4rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: config.contentMaxWidth || '600px',
            textAlign: config.textAlign as any,
          }}
        >
          {/* Eyebrow */}
          {config.eyebrow && (
            <p
              className="mb-4 text-sm font-light uppercase tracking-widest"
              style={{
                color: config.headingColor || 'white',
                opacity: 0.85,
                letterSpacing: '0.15em',
              }}
            >
              {config.eyebrow}
            </p>
          )}

          {/* Heading - Focused on the image */}
          <h1
            className="mb-6 leading-tight"
            style={{
              color: config.headingColor || 'white',
              fontFamily: config.headingFont,
              fontSize: config.headingSize || 'clamp(2rem, 8vw, 4rem)',
              fontWeight: config.headingWeight ?? 700,
              lineHeight: config.lineHeight || '1.2',
              letterSpacing: config.letterSpacing,
            }}
          >
            {config.heading}
          </h1>

          {/* Description - Brief and impactful */}
          {config.description && (
            <p
              className="mb-8 text-lg leading-relaxed"
              style={{
                color: config.bodyColor || 'rgba(255, 255, 255, 0.9)',
                fontFamily: config.bodyFont,
                fontSize: config.bodySize,
                lineHeight: config.lineHeight || '1.6',
                maxWidth: '500px',
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
                className="px-8 py-3 rounded font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl active:scale-95"
                style={{
                  backgroundColor: config.buttonColor || '#fff',
                  color: config.buttonTextColor || '#000',
                  borderRadius: config.buttonBorderRadius,
                  fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
                  padding: config.buttonSize === 'lg' ? '16px 32px' : config.buttonSize === 'sm' ? '8px 16px' : '12px 24px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                }}
              >
                {config.primaryCtaLabel}
              </button>
            )}

            {config.secondaryCtaVisible && config.secondaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.secondaryCtaDestination || '')}
                className="px-8 py-3 rounded font-semibold border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                style={{
                  borderColor: config.buttonColor || 'white',
                  color: config.buttonTextColor || 'white',
                  backgroundColor: 'transparent',
                  borderRadius: config.buttonBorderRadius,
                  fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
                  padding: config.buttonSize === 'lg' ? '14px 30px' : config.buttonSize === 'sm' ? '6px 14px' : '10px 22px',
                  cursor: 'pointer',
                }}
              >
                {config.secondaryCtaLabel}
              </button>
            )}
          </div>

          {/* Decorative element */}
          {config.decorativeText && (
            <p
              className="mt-8 text-xs opacity-70"
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

      {/* Image scale effect on load */}
      <style>{`
        @keyframes imageZoom {
          from {
            transform: scale(1.05);
          }
          to {
            transform: scale(1);
          }
        }
        section {
          animation: imageZoom 0.8s ease-out;
        }
      `}</style>
    </section>
  )
}










