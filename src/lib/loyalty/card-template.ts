/**
 * Stamp-card template helpers.
 *
 * Punched renders cards **server-side**: the API returns finished HTML
 * (`cardDesignHtml`, `previewHtml`, `renderedHtml`) produced by
 * `CardTemplateRenderer`, so in normal operation nothing here runs. This module
 * exists for the two jobs the browser genuinely owns:
 *
 *  1. **Defence in depth.** `sanitizeCardHtml` re-checks the markup before it
 *     reaches the sandboxed iframe. The server already sanitizes with the same
 *     allow-list (`CardTemplateSanitizer`), so this is a second, independent
 *     gate — never the only one.
 *  2. **Unrendered-template fallback.** If a caller ever hands us a raw template
 *     (still containing `{{…}}`) rather than rendered HTML, `renderCardTemplate`
 *     fills the variables the backend documents — plus the friendly aliases the
 *     design reference uses (`{{totalStamps}}`, `{{stampsRequired}}`,
 *     `{{enrolledYear}}`) — so a card is never shown with raw braces.
 *
 * Keeping template substitution in one utility is deliberate: no component
 * string-replaces card markup.
 */

/** Variables the backend's renderer supports (`CardTemplateRenderer`). */
export const CARD_TEMPLATE_VARIABLES = [
  'business.name',
  'business.logo',
  'business.description',
  'customer.name',
  'campaign.name',
  'program.name',
  'card.name',
  'card.totalStamps',
  'card.completedStamps',
  'card.status',
  'stamps.current',
  'stamps.required',
  'reward.name',
  'reward.status',
] as const

export type CardTemplateValues = {
  businessName?: string
  customerName?: string
  programName?: string
  rewardName?: string
  /** Total stamp slots in the cycle. */
  stampsRequired?: number
  /** Stamps collected so far. */
  stampsCollected?: number
  /** Year the customer enrolled — used by the reference's `{{enrolledYear}}`. */
  enrolledYear?: number | string
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char)
}

/** True when markup still contains an unresolved `{{…}}` token. */
export function hasUnresolvedPlaceholders(html: string): boolean {
  return /\{\{[^}]*\}\}/.test(html)
}

/**
 * Strips anything executable or framing-related from card markup.
 *
 * Mirrors `CardTemplateSanitizer`'s intent on the client: no scripts, styles,
 * frames, objects, forms, event handlers or `javascript:` URLs survive. The
 * sandboxed iframe is still the real boundary — this pass simply means the DOM
 * we build is already clean.
 */
export function sanitizeCardHtml(html: string): string {
  if (!html) return ''

  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /<(script|style|iframe|object|embed|template|noscript|svg|math|form|base|link|meta)\b[\s\S]*?(?:\/>|>[\s\S]*?<\/\1\s*>|>)/gi,
      '',
    )
    .replace(
      /<\/(script|style|iframe|object|embed|template|noscript|svg|math|form|base|link|meta)\s*>/gi,
      '',
    )
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(
      /\s(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text)[^"]*"|'\s*(?:javascript|vbscript|data:text)[^']*'|(?:javascript|vbscript|data:text)[^\s>]+)/gi,
      '',
    )
}

const LOOP_REGEX = /\{\{#each stamps\}\}([\s\S]*?)\{\{\/each\}\}/g

function renderStampLoop(inner: string, total: number, completed: number): string {
  let output = ''
  for (let position = 1; position <= total; position += 1) {
    const filled = position <= completed
    output += inner
      .replace(/\{\{\s*status\s*\}\}/g, filled ? 'filled' : 'empty')
      .replace(/\{\{\s*glyph\s*\}\}/g, '')
      .replace(/\{\{\s*iconTag\s*\}\}/g, '')
  }
  return output
}

/**
 * Fills a raw card template. Values are HTML-escaped; the one piece of markup
 * emitted (`{{stamps}}` / the `{{#each stamps}}` loop) is generated here from
 * numbers only, never from user text.
 */
export function renderCardTemplate(template: string, values: CardTemplateValues): string {
  if (!template) return ''

  const total = Math.max(1, Math.floor(values.stampsRequired ?? 10))
  const completed = Math.min(Math.max(0, Math.floor(values.stampsCollected ?? 0)), total)
  const year = String(values.enrolledYear ?? new Date().getFullYear())

  const map: Record<string, string> = {
    'business.name': values.businessName ?? '',
    'program.name': values.programName ?? '',
    'campaign.name': values.programName ?? '',
    'card.name': values.programName ?? '',
    'reward.name': values.rewardName ?? '',
    'customer.name': values.customerName ?? '',
    'card.totalStamps': String(total),
    'stamps.required': String(total),
    'card.completedStamps': String(completed),
    'stamps.current': String(completed),
    'card.status': 'active',
    'reward.status': completed >= total ? 'ready' : 'in-progress',
    // Friendly aliases used by the design reference.
    totalStamps: String(completed),
    stampsRequired: String(total),
    enrolledYear: year,
    programName: values.programName ?? '',
    rewardName: values.rewardName ?? '',
    customerName: values.customerName ?? '',
    businessName: values.businessName ?? '',
  }

  let html = template.replace(LOOP_REGEX, (_match, inner: string) =>
    renderStampLoop(inner, total, completed),
  )

  html = html.replace(/\{\{\s*stamps\s*\}\}/g, () => {
    let dots = ''
    for (let position = 1; position <= total; position += 1) {
      const filled = position <= completed
      dots += `<span style="display:inline-block;width:16px;height:16px;margin:2px;border-radius:9999px;background:${
        filled ? '#1c1f23' : '#e9e7e2'
      }"></span>`
    }
    return dots
  })

  html = html.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_.]*)\s*\}\}/g, (_match, key: string) => {
    const value = map[key]
    return value === undefined ? '' : escapeHtml(value)
  })

  return html
}

/**
 * Prepares card markup for the renderer: sanitize, and — only when the payload
 * is still an unrendered template — fill its variables first.
 */
export function prepareCardHtml(
  html: string | null | undefined,
  values: CardTemplateValues,
): string {
  if (!html) return ''
  const filled = hasUnresolvedPlaceholders(html) ? renderCardTemplate(html, values) : html
  return sanitizeCardHtml(filled)
}
