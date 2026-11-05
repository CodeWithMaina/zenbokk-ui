import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Bold Typography Hero
 * 
 * Large expressive headings with strong color contrast.
 * Typography-driven design that commands attention through powerful type.
 */
export function HeroBoldTypography({
  config,
  onNavigate,
}: HeroVariantProps) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: config.height || 'auto',
        backgroundColor: config.backgroundColor || '#fff',
        backgroundImage: config.backgroundStyle === 'gradient'
          ? `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`
          : undefined,
        minHeight: '100vh',
      }}
    >
      {/* Content Container */}
      <div
        className="relative z-10 h-full w-full flex flex-col items-center justify-center"
        style={{
          padding: config.sectionPadding || '4rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: config.contentMaxWidth || '1000px',
            textAlign: config.textAlign as any,
          }}
        >
          {/* Eyebrow - Minimal presence */}
          {config.eyebrow && (
            <p
              className="mb-8 text-sm font-light uppercase tracking-widest"
              style={{
                color: config.bodyColor || '#333',
                opacity: 0.7,
                letterSpacing: '0.2em',
              }}
            >
              {config.eyebrow}
            </p>
          )}

          {/* BOLD Primary Heading */}
          <h1
            className="mb-6 leading-none"
            style={{
              color: config.headingColor || '#000',
              fontFamily: config.headingFont || 'system-ui, sans-serif',
              fontSize: config.headingSize || 'clamp(3rem, 18vw, 10rem)',
              fontWeight: config.headingWeight ?? 900,
              lineHeight: '0.95',
              letterSpacing: config.letterSpacing || '-0.03em',
              textTransform: 'uppercase',
            }}
          >
            {config.heading}
          </h1>

          {/* Accent bar */}
          <div
            className="h-1 w-24 mb-12"
            style={{
              backgroundColor: config.buttonColor || '#000',
              margin: config.textAlign === 'center' ? '0 auto' : '0',
            }}
          />

          {/* Subheading/Description */}
          {config.description && (
            <p
              className="mb-10 leading-relaxed max-w-2xl"
              style={{
                color: config.bodyColor || '#555',
                fontFamily: config.bodyFont,
                fontSize: config.bodySize || 'clamp(1rem, 3vw, 1.5rem)',
                lineHeight: config.lineHeight || '1.7',
                letterSpacing: config.letterSpacing || '0.01em',
                fontWeight: 300,
                margin: config.textAlign === 'center' ? '0 auto 2.5rem' : '0 0 2.5rem 0',
              }}
            >
              {config.description}
            </p>
          )}

          {/* High-impact CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-6 items-center"
            style={{
              justifyContent: config.buttonAlignment === 'left' ? 'flex-start' : config.buttonAlignment === 'right' ? 'flex-end' : 'center',
            }}
          >
            {config.primaryCtaVisible && config.primaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.primaryCtaDestination || '')}
                className="px-12 py-5 font-bold uppercase tracking-widest transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg hover:shadow-2xl"
                style={{
                  backgroundColor: config.buttonColor || '#000',
                  color: config.buttonTextColor || '#fff',
                  borderRadius: config.buttonBorderRadius || '0',
                  fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
                  padding: config.buttonSize === 'lg' ? '20px 40px' : config.buttonSize === 'sm' ? '10px 20px' : '16px 32px',
                  cursor: 'pointer',
                  border: `3px solid ${config.buttonColor || '#000'}`,
                  letterSpacing: '0.1em',
                }}
              >
                {config.primaryCtaLabel}
              </button>
            )}

            {config.secondaryCtaVisible && config.secondaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.secondaryCtaDestination || '')}
                className="px-12 py-5 font-bold uppercase tracking-widest transition-all duration-300 transform hover:scale-110 border-4"
                style={{
                  borderColor: config.buttonColor || '#000',
                  color: config.buttonTextColor || '#000',
                  backgroundColor: 'transparent',
                  borderRadius: config.buttonBorderRadius || '0',
                  fontSize: config.buttonSize === 'lg' ? '1.125rem' : config.buttonSize === 'sm' ? '0.875rem' : '1rem',
                  padding: config.buttonSize === 'lg' ? '18px 38px' : config.buttonSize === 'sm' ? '8px 18px' : '14px 30px',
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                }}
              >
                {config.secondaryCtaLabel}
              </button>
            )}
          </div>

          {/* Bottom decoration */}
          {config.decorativeText && (
            <div className="mt-16">
              <p
                className="text-xs font-light uppercase tracking-widest opacity-50"
                style={{
                  color: config.bodyColor || '#999',
                  letterSpacing: '0.2em',
                }}
              >
                {config.decorativeText}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div
                  className="h-px flex-grow max-w-xs"
                  style={{
                    backgroundColor: config.bodyColor || '#ccc',
                    opacity: 0.3,
                  }}
                />
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: config.buttonColor || '#000',
                  }}
                />
                <div
                  className="h-px flex-grow max-w-xs"
                  style={{
                    backgroundColor: config.bodyColor || '#ccc',
                    opacity: 0.3,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, ' + (config.headingColor || '#000') + ' 1px, transparent 1px, transparent 10px)',
        }}
      />
    </section>
  )
}






