import { useEffect, useRef, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { cn } from '../../lib/cn'
import { prepareCardHtml } from '../../lib/loyalty/card-template'
import type { CardTemplateValues } from '../../lib/loyalty/card-template'

export type LoyaltyCardRendererProps = {
  /**
   * Card markup returned by the API (`cardDesignHtml`, `previewHtml`,
   * `renderedHtml`). Rendered exactly as the backend produced it.
   */
  html: string | null | undefined
  /**
   * Contextual values. Only used when `html` is still an unrendered template —
   * production responses are already rendered, so these never override them.
   */
  values?: CardTemplateValues
  /** The applied design's name, for the accessible label and the empty state. */
  designName?: string | null
  /** Width (px) the template is authored at; the card scales to fit its box. */
  designWidth?: number
  /** Accessible description of what the frame contains. */
  label?: string
  /** Height (px) assumed before the content has been measured. */
  fallbackHeight?: number
  className?: string
}

/**
 * Renders a loyalty card from the HTML template the backend owns.
 *
 * The card is **not** recreated in JSX — the API returns finished markup and
 * this component displays it. Three things make that safe:
 *
 *  1. **Isolation.** The markup lives in an `<iframe>` whose `sandbox` omits
 *     `allow-scripts` (and every other capability), so no script, event handler
 *     or `javascript:` URL in a template can ever execute. With no script there
 *     is no way for a card to read the parent app's tokens or storage — a card
 *     is inert presentation, nothing more.
 *  2. **Content-Security-Policy.** The frame's own document declares
 *     `default-src 'none'`, so even a sanitizer regression could not fetch or
 *     execute anything. Only inline styles (which templates use) and images are
 *     permitted.
 *  3. **Defence in depth.** `prepareCardHtml` re-sanitizes before writing the
 *     document, mirroring the server's `CardTemplateSanitizer`.
 *
 * `allow-same-origin` is present **only** so the parent can measure the frame's
 * height (scripts are still disabled, so the frame cannot act on that origin).
 * The card is scaled to its container, so one authored width serves the list
 * thumbnail, the gallery and the full-size preview.
 */
export function LoyaltyCardRenderer({
  html,
  values,
  designName,
  designWidth = 380,
  label,
  fallbackHeight = 200,
  className,
}: LoyaltyCardRendererProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(fallbackHeight)
  const [boxWidth, setBoxWidth] = useState(designWidth)

  const doc = prepareCardHtml(html, values ?? {})

  // Track the container width so the card scales like a responsive image.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const update = () => setBoxWidth(box.clientWidth || designWidth)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(box)
    return () => observer.disconnect()
  }, [designWidth])

  // Measure the rendered card so the frame is exactly as tall as its content.
  const measure = () => {
    const frame = frameRef.current
    try {
      const body = frame?.contentDocument?.body
      const root = frame?.contentDocument?.documentElement
      const height = Math.max(body?.scrollHeight ?? 0, root?.scrollHeight ?? 0)
      if (height > 0) setContentHeight(height)
    } catch {
      // A cross-origin frame cannot be measured; keep the fallback height.
    }
  }

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onLoad = () => {
      measure()
      // One more pass after layout settles (fonts, images).
      window.requestAnimationFrame(measure)
    }
    frame.addEventListener('load', onLoad)
    return () => frame.removeEventListener('load', onLoad)
    // Re-bind whenever the document changes.
  }, [doc])

  const scale = Math.min(1, boxWidth / designWidth)
  const scaledHeight = Math.max(1, contentHeight * scale)
  const accessibleLabel = label ?? (designName ? `${designName} loyalty card` : 'Loyalty card')

  if (!doc) {
    return (
      <div
        className={cn(
          'grid min-h-[7.5rem] place-items-center rounded-card border border-dashed border-line bg-sunken px-4 text-center',
          className,
        )}
      >
        <div>
          <CreditCard className="mx-auto size-5 text-muted" aria-hidden="true" />
          <p className="mt-[0.4rem] text-meta font-semibold">Card design unavailable</p>
          <p className="mt-[0.1rem] text-caption text-muted">
            {designName
              ? `“${designName}” could not be rendered.`
              : 'No card template was returned.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={boxRef}
      className={cn('relative overflow-hidden', className)}
      style={{ height: scaledHeight }}
      role="img"
      aria-label={accessibleLabel}
    >
      <iframe
        ref={frameRef}
        title={accessibleLabel}
        tabIndex={-1}
        aria-hidden="true"
        scrolling="no"
        loading="eager"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin"
        srcDoc={cardDocument(doc)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: designWidth,
          height: contentHeight,
          border: 0,
          background: 'transparent',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

/** Wraps sanitized card markup in the isolated document the frame loads. */
function cardDocument(html: string): string {
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'\">",
    '<style>html,body{margin:0;padding:0;background:transparent;}*,*::before,*::after{box-sizing:border-box;}</style>',
    '</head><body>',
    html,
    '</body></html>',
  ].join('')
}
