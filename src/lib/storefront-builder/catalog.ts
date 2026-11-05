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
      { value: 'editorial', label: 'Editorial' },
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
  { value: 'Newsreader', label: 'Newsreader — editorial serif' },
  { value: 'Georgia', label: 'Georgia — classic serif' },
  { value: 'system-ui', label: 'System UI' },
] as const

export const HEADER_VARIANTS = [
  { value: 'minimal', label: 'Minimal transparent' },
  { value: 'solid', label: 'Solid background' },
  { value: 'centered', label: 'Centered logo' },
  { value: 'split', label: 'Split (logo left)' },
  { value: 'floating', label: 'Premium floating' },
  { value: 'sticky-compact', label: 'Compact sticky' },
  { value: 'mobile-first', label: 'Mobile first' },
] as const

export const HERO_VARIANTS = [
  { value: 'full-image', label: 'Full-width image' },
  { value: 'split', label: 'Split image & text' },
  { value: 'centered', label: 'Centered typography' },
  { value: 'video', label: 'Video background' },
  { value: 'carousel', label: 'Image carousel' },
  { value: 'editorial', label: 'Asymmetric editorial' },
  { value: 'minimal', label: 'Minimal text-first' },
  { value: 'premium', label: 'Full-screen premium' },
  { value: 'gradient', label: 'Gradient background' },
] as const

export const FOOTER_VARIANTS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'columns', label: 'Multi-column' },
  { value: 'editorial', label: 'Premium editorial' },
  { value: 'centered', label: 'Centered' },
  { value: 'dark', label: 'Dark' },
  { value: 'contact', label: 'Contact focused' },
] as const

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
