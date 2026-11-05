import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Modern Gradient Hero
 * 
 * Beautiful, dynamic gradient backgrounds with modern animation and
 * contemporary typography. Perfect for tech-forward, innovative brands.
 */
export function HeroModernGradient({
  config,
  onNavigate,
}: HeroVariantProps) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: config.height || '100vh',
        background: config.backgroundStyle === 'gradient'
          ? `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`
          : config.backgroundColor || '#0f172a',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite',
      }}
    >
      {/* Add animation keyframes */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Decorative animated elements */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse" style={{ backgroundColor: config.gradientFrom }} />
      <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse" style={{ backgroundColor: config.gradientTo }} />

      {/* Content */}
      <div className="relative z-10 h-full w-full flex items-center justify-center px-6 py-8">
        <div
          className="text-center"
          style={{
            maxWidth: config.contentMaxWidth || '700px',
          }}
        >
          {/* Eyebrow with decorative line */}
          {config.eyebrow && (
            <div className="mb-8 flex items-center justify-center gap-4">
              <div
                className="h-px flex-grow"
                style={{
                  backgroundColor: config.headingColor || 'white',
                  opacity: 0.3,
                }}
              />
              <p
                className="text-sm font-semibold uppercase tracking-widest flex-shrink-0"
                style={{
                  color: config.headingColor || 'white',
                  opacity: 0.8,
                }}
              >
                {config.eyebrow}
              </p>
              <div
                className="h-px flex-grow"
                style={{
                  backgroundColor: config.headingColor || 'white',
                  opacity: 0.3,
                }}
              />
            </div>
          )}

          {/* Modern Heading */}
          <h1
            className="mb-6 leading-tight text-5xl sm:text-6xl lg:text-7xl font-bold"
            style={{
              color: config.headingColor || 'white',
              fontFamily: config.headingFont,
              fontSize: config.headingSize,
              fontWeight: config.headingWeight ?? 700,
              lineHeight: config.lineHeight || '1.1',
              letterSpacing: config.letterSpacing || '-0.01em',
              backgroundImage: config.backgroundStyle === 'gradient'
                ? `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})`
                : undefined,
              backgroundClip: config.backgroundStyle === 'gradient' ? 'text' : undefined,
              WebkitBackgroundClip: config.backgroundStyle === 'gradient' ? 'text' : undefined,
              WebkitTextFillColor: config.backgroundStyle === 'gradient' ? 'transparent' : undefined,
            }}
          >
            {config.heading}
          </h1>

          {/* Description with modern styling */}
          {config.description && (
            <p
              className="mb-10 text-lg sm:text-xl leading-relaxed"
              style={{
                color: config.bodyColor || 'rgba(255, 255, 255, 0.8)',
                fontFamily: config.bodyFont,
                fontSize: config.bodySize,
                lineHeight: config.lineHeight || '1.7',
                maxWidth: '600px',
                margin: '0 auto 2.5rem',
              }}
            >
              {config.description}
            </p>
          )}

          {/* Modern CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-5 justify-center items-center"
            style={{
              justifyContent: config.buttonAlignment === 'left' ? 'flex-start' : config.buttonAlignment === 'right' ? 'flex-end' : 'center',
            }}
          >
            {config.primaryCtaVisible && config.primaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.primaryCtaDestination || '')}
                className="px-10 py-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-110 hover:shadow-2xl active:scale-95"
                style={{
                  backgroundColor: config.buttonColor || 'white',
                  color: config.buttonTextColor || '#000',
                  borderRadius: config.buttonBorderRadius || '0.5rem',
                  fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
                  padding: config.buttonSize === 'lg' ? '16px 32px' : config.buttonSize === 'sm' ? '8px 16px' : '12px 24px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                }}
              >
                {config.primaryCtaLabel}
              </button>
            )}

            {config.secondaryCtaVisible && config.secondaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.secondaryCtaDestination || '')}
                className="px-10 py-4 rounded-lg font-semibold border-2 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl"
                style={{
                  borderColor: config.buttonColor || 'white',
                  color: config.buttonTextColor || 'white',
                  backgroundColor: 'transparent',
                  borderRadius: config.buttonBorderRadius || '0.5rem',
                  fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
                  padding: config.buttonSize === 'lg' ? '14px 30px' : config.buttonSize === 'sm' ? '6px 14px' : '10px 22px',
                  cursor: 'pointer',
                }}
              >
                {config.secondaryCtaLabel}
              </button>
            )}
          </div>

          {/* Scroll indicator */}
          {config.decorativeText && (
            <div className="mt-16 flex justify-center items-center gap-2">
              <p
                className="text-xs uppercase tracking-widest"
                style={{
                  color: config.bodyColor || 'rgba(255, 255, 255, 0.6)',
                }}
              >
                {config.decorativeText}
              </p>
              <svg
                className="w-4 h-4 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: config.bodyColor || 'rgba(255, 255, 255, 0.6)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}




