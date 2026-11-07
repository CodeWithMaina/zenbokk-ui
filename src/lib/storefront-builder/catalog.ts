/**
 * The storefront builder vocabulary, mirrored from
 * `PunchedApi/Application/Services/StorefrontSectionCatalog.cs`.
 *
 * Keeping the vocabulary here (rather than inline in the editor) is what lets a
 * single schema drive the section list, the inspector and the public renderer.
 */

export type SectionDefinition = {
  key: string
  label: string
  description: string
  /** Design variants this section supports, in display order. */
  variants: { value: string; label: string }[]
  defaultVariant: string
  /** Customer capability that gates this section, or null when always allowed. */
  capability: string | null
  defaultTitle: string | null
  defaultDescription: string | null
  /** Can more than one instance of this section exist on the page? */
  repeatable?: boolean
}

export const SECTION_CATALOG: SectionDefinition[] = [
  {
    key: 'announcement', label: 'Announcement', description: 'A slim promotional bar.',
    variants: [{ value: 'bar', label: 'Bar' }, { value: 'pill', label: 'Pill' }],
    defaultVariant: 'bar', capability: null, defaultTitle: null, defaultDescription: null, repeatable: true,
  },
  {
    key: 'services', label: 'Services', description: 'Your bookable catalogue.',
    variants: [
      { value: 'cards', label: 'Cards' }, { value: 'image-cards', label: 'Image cards' },
      { value: 'list', label: 'Minimal list' }, { value: 'grid', label: 'Grid' },
      { value: 'scroller', label: 'Horizontal scroll' }, { value: 'featured', label: 'Featured' },
      { value: 'categories', label: 'By category' },
    ],
    defaultVariant: 'cards', capability: 'services',
    defaultTitle: 'Our services', defaultDescription: 'Choose from our most-loved treatments.',
  },
  {
    key: 'about', label: 'About', description: 'Your story and mission.',
    variants: [
      { value: 'image-left', label: 'Image left' }, { value: 'image-right', label: 'Image right' },
      { value: 'centered', label: 'Centered' }, { value: 'editorial', label: 'Editorial' },
      { value: 'gallery', label: 'Gallery' },
    ],
    defaultVariant: 'image-left', capability: null, defaultTitle: 'About us', defaultDescription: null,
  },
  {
    key: 'team', label: 'Team', description: 'The people behind the business.',
    variants: [
      { value: 'cards', label: 'Profile cards' }, { value: 'circles', label: 'Circular portraits' },
      { value: 'showcase', label: 'Showcase' }, { value: 'list', label: 'Minimal list' },
    ],
    defaultVariant: 'cards', capability: null, defaultTitle: 'Meet the team', defaultDescription: null,
  },
  {
    key: 'gallery', label: 'Gallery', description: 'A curated image gallery.',
    variants: [
      { value: 'masonry', label: 'Masonry' }, { value: 'grid', label: 'Grid' },
      { value: 'carousel', label: 'Carousel' }, { value: 'full-width', label: 'Full width' },
      { value: 'editorial', label: 'Editorial' }, { value: 'feature-first', label: 'Feature first' },
    ],
    defaultVariant: 'masonry', capability: 'gallery', defaultTitle: 'Our work', defaultDescription: null,
  },
  {
    key: 'testimonials', label: 'Testimonials', description: 'Words from your clients.',
    variants: [
      { value: 'cards', label: 'Cards' }, { value: 'quote', label: 'Single quote' },
      { value: 'carousel', label: 'Carousel' }, { value: 'wall', label: 'Wall' },
    ],
    defaultVariant: 'cards', capability: 'galleryReviews', defaultTitle: 'What clients say', defaultDescription: null,
  },
  {
    key: 'booking', label: 'Booking', description: 'A booking-focused call to action.',
    variants: [
      { value: 'panel', label: 'Panel' }, { value: 'split', label: 'Split' },
      { value: 'banner', label: 'Banner' }, { value: 'minimal', label: 'Minimal' },
    ],
    defaultVariant: 'panel', capability: 'appointments',
    defaultTitle: 'Book your visit', defaultDescription: 'Pick a time that suits you — it takes under a minute.',
  },
  {
    key: 'promotions', label: 'Promotions', description: 'Special offers and packages.',
    variants: [{ value: 'cards', label: 'Cards' }, { value: 'banner', label: 'Banner' }, { value: 'list', label: 'List' }],
    defaultVariant: 'cards', capability: null, defaultTitle: 'Current offers', defaultDescription: null, repeatable: true,
  },
  {
    key: 'loyalty', label: 'Loyalty', description: 'Your rewards programme.',
    variants: [{ value: 'panel', label: 'Panel' }, { value: 'card', label: 'Card' }, { value: 'minimal', label: 'Minimal' }],
    defaultVariant: 'panel', capability: 'loyalty', defaultTitle: 'Rewards & loyalty', defaultDescription: null,
  },
  {
    key: 'stats', label: 'Statistics', description: 'Achievements at a glance.',
    variants: [{ value: 'row', label: 'Row' }, { value: 'cards', label: 'Cards' }, { value: 'banner', label: 'Banner' }],
    defaultVariant: 'row', capability: null, defaultTitle: null, defaultDescription: null, repeatable: true,
  },
  {
    key: 'hours', label: 'Opening hours', description: 'When you are open.',
    variants: [{ value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' }, { value: 'inline', label: 'Inline' }],
    defaultVariant: 'list', capability: null, defaultTitle: 'Opening hours', defaultDescription: null,
  },
  {
    key: 'contact', label: 'Contact', description: 'How to reach you.',
    variants: [
      { value: 'split', label: 'Split' }, { value: 'cards', label: 'Cards' },
      { value: 'map', label: 'Map' }, { value: 'minimal', label: 'Minimal' },
    ],
    defaultVariant: 'split', capability: null, defaultTitle: 'Get in touch', defaultDescription: null,
  },
  {
    key: 'faq', label: 'FAQ', description: 'Answers to common questions.',
    variants: [{ value: 'accordion', label: 'Accordion' }, { value: 'two-column', label: 'Two column' }],
    defaultVariant: 'accordion', capability: null, defaultTitle: 'Frequently asked questions',
    defaultDescription: null, repeatable: true,
  },
  {
    key: 'social', label: 'Social', description: 'Follow along.',
    variants: [{ value: 'row', label: 'Row' }, { value: 'cards', label: 'Cards' }],
    defaultVariant: 'row', capability: null, defaultTitle: 'Follow us', defaultDescription: null,
  },
  {
    key: 'newsletter', label: 'Newsletter', description: 'Email signup.',
    variants: [{ value: 'inline', label: 'Inline' }, { value: 'panel', label: 'Panel' }],
    defaultVariant: 'inline', capability: null, defaultTitle: 'Stay in the loop', defaultDescription: null,
  },
  {
    key: 'richtext', label: 'Text & image', description: 'Free-form content.',
    variants: [
      { value: 'text', label: 'Text' }, { value: 'text-image', label: 'Text + image' },
      { value: 'image-text', label: 'Image + text' }, { value: 'quote', label: 'Pull quote' },
    ],
    defaultVariant: 'text', capability: null, defaultTitle: null, defaultDescription: null, repeatable: true,
  },
  {
    key: 'embed', label: 'Embed', description: 'A custom HTML embed.',
    variants: [{ value: 'frame', label: 'Frame' }],
    defaultVariant: 'frame', capability: null, defaultTitle: null, defaultDescription: null, repeatable: true,
  },
]

const SECTION_BY_KEY = new Map(SECTION_CATALOG.map((s) => [s.key, s]))

export function findSection(key: string): SectionDefinition | undefined {
  return SECTION_BY_KEY.get(key)
}

export function normaliseVariant(key: string, variant: string | null | undefined): string {
  const def = findSection(key)
  if (!def) return 'default'
  if (!variant) return def.defaultVariant
  return def.variants.some((v) => v.value === variant) ? variant : def.defaultVariant
}

export function sectionAllows(key: string, can: (capability: string) => boolean): boolean {
  const def = findSection(key)
  if (!def?.capability) return true
  return can(def.capability)
}

/** Curated, web-safe / open-licensed font pairings offered in the theme panel. */
export const FONT_OPTIONS = [
  { value: 'Figtree', label: 'Figtree — geometric sans' },
  { value: 'DM Sans', label: 'DM Sans — plain-spoken sans' },
  { value: 'Newsreader', label: 'Newsreader — editorial serif' },
  { value: 'Playfair Display', label: 'Playfair Display — high-contrast serif' },
  { value: 'Georgia', label: 'Georgia — classic serif' },
  { value: 'system-ui', label: 'System UI' },
] as const

/**
 * The three layout slots, exactly as the design names them — the mirror of
 * `StorefrontLayoutCatalog`. Only canonical names appear in the pickers; names
 * that shipped earlier stay valid through the `normalise*Layout` helpers below,
 * so a saved configuration never renders as an unknown variant.
 */
export const HEADER_VARIANTS = [
  { value: 'classic', label: 'Classic bar' },
  { value: 'centered', label: 'Centered logo' },
  { value: 'split', label: 'Split navigation' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'pill', label: 'Floating pill' },
  { value: 'glass', label: 'Glass' },
  { value: 'utility', label: 'Utility strip' },
  { value: 'bar', label: 'Announcement bar' },
] as const

export const HERO_VARIANTS = [
  { value: 'overlay', label: 'Full-bleed overlay' },
  { value: 'centered', label: 'Centered typography' },
  { value: 'split', label: 'Split image & text' },
  { value: 'split-reverse', label: 'Split, image right' },
  { value: 'minimal', label: 'Minimal text-first' },
  { value: 'gradient', label: 'Gradient background' },
  { value: 'facts', label: 'Headline with facts' },
  { value: 'collage', label: 'Image collage' },
  { value: 'booking', label: 'Booking forward' },
] as const

export const FOOTER_VARIANTS = [
  { value: 'columns', label: 'Multi-column' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'centered', label: 'Centered' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'wordmark', label: 'Oversized wordmark' },
  { value: 'split', label: 'Split' },
] as const

/** Legacy → canonical, exactly as `StorefrontLayoutCatalog` maps them. */
export const HEADER_LAYOUT_ALIASES: Record<string, string> = {
  solid: 'classic',
  floating: 'pill',
  'sticky-compact': 'classic',
  'mobile-first': 'minimal',
}

export const HERO_LAYOUT_ALIASES: Record<string, string> = {
  'full-image': 'overlay',
  splitr: 'split-reverse',
}

function fromList(value: string | null | undefined, allowed: readonly string[], fallback: string): string {
  if (!value) return fallback
  const match = allowed.find((option) => option.toLowerCase() === value.toLowerCase())
  return match ?? fallback
}

/** Resolves a stored id (possibly a legacy name) to a canonical layout. */
export function normaliseLayout(
  value: string | null | undefined,
  allowed: readonly { value: string }[],
  aliases: Record<string, string>,
  fallback: string,
): string {
  if (!value) return fallback
  const alias = aliases[value.toLowerCase()] ?? aliases[value]
  const candidate = alias ?? value
  return fromList(candidate, allowed.map((option) => option.value), fallback)
}

export function normaliseHeaderLayout(value: string | null | undefined): string {
  return normaliseLayout(value, HEADER_VARIANTS, HEADER_LAYOUT_ALIASES, 'classic')
}

export function normaliseHeroLayout(value: string | null | undefined): string {
  return normaliseLayout(value, HERO_VARIANTS, HERO_LAYOUT_ALIASES, 'overlay')
}

export function normaliseFooterLayout(value: string | null | undefined): string {
  return normaliseLayout(value, FOOTER_VARIANTS, {}, 'columns')
}

export const HEADER_CTA_TYPES = [
  { value: 'book', label: 'Booking' },
  { value: 'services', label: 'Services' },
  { value: 'contact', label: 'Contact' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'directions', label: 'Directions' },
] as const

export const RADIUS_OPTIONS = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'soft', label: 'Soft' },
  { value: 'round', label: 'Rounded' },
] as const

export const SPACING_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'generous', label: 'Generous' },
] as const

export const SHADOW_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'soft', label: 'Soft' },
  { value: 'strong', label: 'Strong' },
] as const

export const BUTTON_STYLE_OPTIONS = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
  { value: 'outline', label: 'Outlined' },
  { value: 'filled', label: 'Filled' },
] as const

export const IMAGE_RATIO_OPTIONS = [
  { value: '1:1', label: 'Square' },
  { value: '4:5', label: 'Portrait' },
  { value: '3:2', label: 'Landscape' },
  { value: '16:9', label: 'Wide' },
] as const

export const BACKGROUND_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'image', label: 'Image' },
] as const

// ── The design's Theme / Motion / Navigation vocabularies ─────────────────────

export const MODE_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

export const ANIMATION_OPTIONS = [
  { value: 'inherit', label: 'Inherit from theme' },
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'up', label: 'Slide up' },
  { value: 'left', label: 'Slide in' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'blur', label: 'Blur in' },
] as const

/** Section entrance options exclude `inherit`; `inherit` is theme-level. */
export const SECTION_ANIMATION_OPTIONS = ANIMATION_OPTIONS

export const HOVER_EFFECT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'lift', label: 'Lift' },
  { value: 'glow', label: 'Glow' },
  { value: 'zoom', label: 'Zoom' },
] as const

export const PAGE_TRANSITION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
] as const

export const DRAWER_OPTIONS = [
  { value: 'left', label: 'From the left' },
  { value: 'right', label: 'From the right' },
  { value: 'top', label: 'From the top' },
  { value: 'full', label: 'Full screen' },
] as const

export const LINK_EFFECT_OPTIONS = [
  { value: 'underline', label: 'Underline' },
  { value: 'pill', label: 'Pill' },
  { value: 'dot', label: 'Dot' },
  { value: 'fade', label: 'Fade' },
] as const

export const CTA_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'outline', label: 'Outline' },
  { value: 'soft', label: 'Soft' },
  { value: 'dark', label: 'Dark' },
] as const

export const SECTION_BACKGROUND_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'surface', label: 'Surface' },
  { value: 'primary', label: 'Primary' },
  { value: 'accent', label: 'Accent' },
] as const

export const SECTION_PADDING_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'generous', label: 'Generous' },
] as const

export const SECTION_ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centered' },
] as const

export const COLUMN_OPTIONS = [
  { value: '1', label: '1 column' },
  { value: '2', label: '2 columns' },
  { value: '3', label: '3 columns' },
  { value: '4', label: '4 columns' },
] as const
