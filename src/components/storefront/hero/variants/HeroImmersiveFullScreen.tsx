import { ResponsiveImage } from '../../../ui/responsive-image'
import type { HeroVariantProps } from '../HeroVariantWrapper'

/**
 * Immersive Fullscreen Hero
 * 
 * Full viewport experience with positioned text, dynamic animations,
 * and immersive visual engagement. Creates memorable hero experience.
 */
export function HeroImmersiveFullScreen({ config, onNavigate, heroImageUrl, heroImageVariants = [] }: HeroVariantProps) {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: '100svh',
        backgroundColor: config.backgroundColor || '#000',
      }}
    >
      {/* Full viewport background */}
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
            backgroundColor: config.backgroundColor || '#000',
            backgroundImage: config.backgroundStyle === 'gradient'
              ? `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`
              : undefined,
          }}
        />
      )}

      {/* Dynamic overlay with gradient fade */}
      <div
        className="absolute inset-0 bg-gradient-to-br"
        style={{
          backgroundColor: config.overlayColor || 'rgba(0, 0, 0, 0.4)',
          opacity: config.overlayOpacity ?? 0.4,
        }}
      />

      {/* Animated background elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* Content - Positioned with animations */}
      <div className="relative z-10 h-full w-full flex flex-col justify-between" style={{ padding: config.sectionPadding || '4rem 2rem' }}>
        {/* Top positioned content */}
        <div className="flex-shrink-0">
          {config.eyebrow && (
            <p
              className="text-sm font-light uppercase tracking-widest animate-fade-in"
              style={{
                color: config.headingColor || 'white',
                opacity: 0.8,
                animation: 'fadeIn 1s ease-in 0.2s forwards',
                animationFillMode: 'both',
              }}
            >
              {config.eyebrow}
            </p>
          )}
        </div>

        {/* Center positioned content */}
        <div
          className="flex items-center justify-center flex-1"
          style={{
            maxWidth: config.contentMaxWidth || '900px',
            margin: '0 auto',
          }}
        >
          <div style={{ textAlign: config.textAlign as any }}>
            {/* Large immersive heading */}
            <h1
              className="leading-none mb-8 animate-fade-in"
              style={{
                color: config.headingColor || 'white',
                fontFamily: config.headingFont,
                fontSize: config.headingSize || 'clamp(2.5rem, 15vw, 9rem)',
                fontWeight: config.headingWeight ?? 800,
                lineHeight: '0.9',
                letterSpacing: config.letterSpacing || '-0.02em',
                animation: 'fadeIn 1s ease-in 0.4s forwards',
                animationFillMode: 'both',
              }}
            >
              {config.heading}
            </h1>

            {/* Description with animation */}
            {config.description && (
              <p
                className="mb-12 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed animate-fade-in"
                style={{
                  color: config.bodyColor || 'rgba(255, 255, 255, 0.85)',
                  fontFamily: config.bodyFont,
                  fontSize: config.bodySize,
                  lineHeight: config.lineHeight || '1.7',
                  animation: 'fadeIn 1s ease-in 0.6s forwards',
                  animationFillMode: 'both',
                }}
              >
                {config.description}
              </p>
            )}

            {/* CTAs with animation */}
            <div
              className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in"
              style={{
                justifyContent: config.buttonAlignment === 'left' ? 'flex-start' : config.buttonAlignment === 'right' ? 'flex-end' : 'center',
                animation: 'fadeIn 1s ease-in 0.8s forwards',
                animationFillMode: 'both',
              }}
            >
              {config.primaryCtaVisible && config.primaryCtaLabel && (
                <button
                  onClick={() => onNavigate?.(config.primaryCtaDestination || '')}
                  className="px-10 py-4 rounded-full font-semibold text-lg transition-all duration-500 transform hover:scale-110 hover:shadow-2xl active:scale-95"
                  style={{
                    backgroundColor: config.buttonColor || 'white',
                    color: config.buttonTextColor || '#000',
                    borderRadius: config.buttonBorderRadius || '9999px',
                    cursor: 'pointer',
                    border: 'none',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {config.primaryCtaLabel}
                </button>
              )}

              {config.secondaryCtaVisible && config.secondaryCtaLabel && (
                <button
                  onClick={() => onNavigate?.(config.secondaryCtaDestination || '')}
                  className="px-10 py-4 rounded-full font-semibold text-lg border-2 transition-all duration-500 transform hover:scale-110 hover:shadow-2xl"
                  style={{
                    borderColor: config.buttonColor || 'white',
                    color: config.buttonTextColor || 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: config.buttonBorderRadius || '9999px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {config.secondaryCtaLabel}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom positioned content */}
        <div className="flex-shrink-0 text-center">
          {config.decorativeText && (
            <p
              className="text-xs uppercase tracking-widest animate-bounce"
              style={{
                color: config.bodyColor || 'rgba(255, 255, 255, 0.5)',
                animation: 'bounce 2s infinite',
              }}
            >
              {config.decorativeText}
            </p>
          )}
          {/* Scroll indicator */}
          <svg
            className="w-6 h-6 mx-auto mt-4 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: config.bodyColor || 'rgba(255, 255, 255, 0.5)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* Fade in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  )
}










