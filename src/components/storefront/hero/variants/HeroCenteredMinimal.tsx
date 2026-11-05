import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Centered Minimal Hero
 * 
 * Clean, centered layout with generous whitespace. Elegant and understated,
 * letting content breathe with minimal visual distractions.
 */
export function HeroCenteredMinimal({ config, onNavigate }: HeroVariantProps) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: config.height || 'min(80vh, 700px)',
        backgroundColor: config.backgroundColor || '#fff',
        backgroundImage: config.backgroundStyle === 'gradient'
          ? `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`
          : undefined,
      }}
    >
      {/* Content Container */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6 py-16">
        <div
          className="text-center"
          style={{
            maxWidth: config.contentMaxWidth || '600px',
          }}
        >
          {/* Eyebrow - Minimal styling */}
          {config.eyebrow && (
            <div className="mb-8">
              <p
                className="text-xs font-light uppercase tracking-widest"
                style={{
                  color: config.bodyColor || '#999',
                  letterSpacing: '0.15em',
                }}
              >
                {config.eyebrow}
              </p>
              {/* Subtle divider line */}
              <div
                className="h-px w-12 mx-auto mt-4"
                style={{
                  backgroundColor: config.bodyColor || '#ccc',
                  opacity: 0.4,
                }}
              />
            </div>
          )}

          {/* Heading */}
          <h1
            className="mb-6 leading-tight text-5xl sm:text-6xl"
            style={{
              color: config.headingColor || '#000',
              fontFamily: config.headingFont,
              fontSize: config.headingSize,
              fontWeight: config.headingWeight ?? 400,
              letterSpacing: config.letterSpacing,
              lineHeight: config.lineHeight || '1.1',
            }}
          >
            {config.heading}
          </h1>

          {/* Description - Generous spacing */}
          {config.description && (
            <p
              className="mb-12 text-lg leading-relaxed opacity-80"
              style={{
                color: config.bodyColor || '#666',
                fontFamily: config.bodyFont,
                fontSize: config.bodySize,
                lineHeight: config.lineHeight || '1.8',
                letterSpacing: config.letterSpacing,
              }}
            >
              {config.description}
            </p>
          )}

          {/* CTAs - Subtle, centered */}
          <div
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            style={{
              marginTop: config.description ? '3rem' : '1.5rem',
            }}
          >
            {config.primaryCtaVisible && config.primaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.primaryCtaDestination || '')}
                className="px-8 py-3 rounded-sm font-light transition-all duration-500 tracking-widest text-sm"
                style={{
                  backgroundColor: config.buttonColor || '#000',
                  color: config.buttonTextColor || '#fff',
                  borderRadius: config.buttonBorderRadius || '0',
                  border: '1px solid ' + (config.buttonColor || '#000'),
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as HTMLButtonElement
                  target.style.opacity = '0.8'
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget as HTMLButtonElement
                  target.style.opacity = '1'
                }}
              >
                {config.primaryCtaLabel}
              </button>
            )}

            {config.secondaryCtaVisible && config.secondaryCtaLabel && (
              <button
                onClick={() => onNavigate?.(config.secondaryCtaDestination || '')}
                className="px-8 py-3 rounded-sm font-light transition-all duration-500 tracking-widest text-sm"
                style={{
                  backgroundColor: 'transparent',
                  color: config.buttonColor || '#000',
                  border: '1px solid ' + (config.buttonColor || '#000'),
                  borderRadius: config.buttonBorderRadius || '0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as HTMLButtonElement
                  target.style.backgroundColor = config.buttonColor || '#000'
                  target.style.color = config.buttonTextColor || '#fff'
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget as HTMLButtonElement
                  target.style.backgroundColor = 'transparent'
                  target.style.color = config.buttonColor || '#000'
                }}
              >
                {config.secondaryCtaLabel}
              </button>
            )}
          </div>

          {/* Decorative element */}
          {config.decorativeText && (
            <p
              className="mt-16 text-xs opacity-50"
              style={{
                color: config.bodyColor || '#999',
                letterSpacing: '0.05em',
              }}
            >
              {config.decorativeText}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}








