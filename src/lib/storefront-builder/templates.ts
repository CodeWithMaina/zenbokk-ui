import type { StorefrontTheme } from '../api/types'

/**
 * The storefront template library, mirrored from
 * `PunchedApi/Application/Services/StorefrontTemplates.cs`.
 *
 * Each template is a genuinely distinct design direction — different typography,
 * colour, spacing, header/hero/footer variant and section arrangement — not a
 * recolour of one layout.
 *
 * `Classic` reproduces the storefront that shipped before the builder existed and
 * is the default template, so a business that never chose a template keeps the
 * page it already had.
 */
export type TemplateDefinition = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  /** Accent swatch shown on the gallery card: [primary, accent, surface]. */
  swatch: [string, string, string]
  headerVariant: string
  heroVariant: string
  footerVariant: string
  blueprint: { key: string; variant: string }[]
  /** Theme overrides applied on top of the platform defaults. */
  theme: Partial<StorefrontTheme>
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'classic', name: 'Classic',
    description: 'The original Punched storefront — clean typography, a full-bleed hero and a calm, familiar rhythm.',
    category: 'All businesses', tags: ['classic', 'default', 'timeless'],
    swatch: ['#111827', '#111827', '#f7f7f5'],
    headerVariant: 'minimal', heroVariant: 'centered', footerVariant: 'minimal',
    blueprint: [
      { key: 'services', variant: 'list' }, { key: 'about', variant: 'centered' },
      { key: 'gallery', variant: 'grid' }, { key: 'testimonials', variant: 'quote' },
      { key: 'booking', variant: 'minimal' }, { key: 'contact', variant: 'minimal' },
    ],
    theme: {
      primary: '#111827', secondary: '#374151', accent: '#111827', background: '#ffffff',
      surface: '#f7f7f5', text: '#141414', mutedText: '#6b7280', buttonBackground: '#141414',
      buttonText: '#ffffff', border: '#e7e5e1', headingFont: 'Figtree', bodyFont: 'Figtree',
      headingWeight: 600, radius: 'sharp', cardStyle: 'flat', shadow: 'none', buttonStyle: 'square',
      sectionSpacing: 'generous',
    },
  },
  {
    id: 'luxe', name: 'Luxe',
    description: 'Sophisticated serif typography, large editorial imagery and refined gold accents.',
    category: 'Beauty & Wellness', tags: ['luxury', 'serif', 'dark', 'elegant'],
    swatch: ['#1a1712', '#cbb27a', '#faf7f0'],
    headerVariant: 'floating', heroVariant: 'premium', footerVariant: 'editorial',
    blueprint: [
      { key: 'about', variant: 'editorial' }, { key: 'services', variant: 'image-cards' },
      { key: 'gallery', variant: 'editorial' }, { key: 'testimonials', variant: 'carousel' },
      { key: 'booking', variant: 'split' }, { key: 'hours', variant: 'inline' },
      { key: 'contact', variant: 'split' },
    ],
    theme: {
      primary: '#1a1712', secondary: '#2b2419', accent: '#cbb27a', background: '#faf7f0',
      surface: '#f1ebdd', text: '#241f17', mutedText: '#8a7f68', buttonBackground: '#1a1712',
      buttonText: '#f3ead4', border: '#e0d5bd', headingFont: 'Newsreader', bodyFont: 'Figtree',
      headingWeight: 400, radius: 'sharp', cardStyle: 'elevated', shadow: 'soft',
      buttonStyle: 'square', sectionSpacing: 'generous', headingScale: 'editorial',
    },
  },
  {
    id: 'minimal', name: 'Minimal',
    description: 'Generous whitespace, restrained type and quiet, asymmetric layouts.',
    category: 'Professional Services', tags: ['minimal', 'clean', 'light', 'airy'],
    swatch: ['#111111', '#a3a3a3', '#fafafa'],
    headerVariant: 'split', heroVariant: 'minimal', footerVariant: 'centered',
    blueprint: [
      { key: 'services', variant: 'cards' }, { key: 'about', variant: 'centered' },
      { key: 'gallery', variant: 'grid' }, { key: 'testimonials', variant: 'cards' },
      { key: 'booking', variant: 'minimal' }, { key: 'contact', variant: 'minimal' },
    ],
    theme: {
      primary: '#111111', secondary: '#525252', accent: '#a3a3a3', background: '#ffffff',
      surface: '#fafafa', text: '#171717', mutedText: '#737373', buttonBackground: '#171717',
      buttonText: '#ffffff', border: '#ededed', headingFont: 'Figtree', bodyFont: 'Figtree',
      headingWeight: 500, radius: 'soft', cardStyle: 'flat', shadow: 'none', buttonStyle: 'rounded',
      sectionSpacing: 'generous', contentWidth: 1080,
    },
  },
  {
    id: 'atelier', name: 'Atelier',
    description: 'Magazine-inspired typography, asymmetric image grids and story-first sections.',
    category: 'Creative', tags: ['editorial', 'magazine', 'story', 'serif'],
    swatch: ['#1c1917', '#b45309', '#f5f0e6'],
    headerVariant: 'centered', heroVariant: 'editorial', footerVariant: 'editorial',
    blueprint: [
      { key: 'about', variant: 'editorial' }, { key: 'services', variant: 'image-cards' },
      { key: 'gallery', variant: 'editorial' }, { key: 'richtext', variant: 'quote' },
      { key: 'testimonials', variant: 'quote' }, { key: 'booking', variant: 'split' },
    ],
    theme: {
      primary: '#1c1917', secondary: '#44403c', accent: '#b45309', background: '#fffdf8',
      surface: '#f5f0e6', text: '#1c1917', mutedText: '#78716c', buttonBackground: '#1c1917',
      buttonText: '#fffdf8', border: '#e7e0d3', headingFont: 'Newsreader', bodyFont: 'Figtree',
      headingWeight: 500, radius: 'sharp', cardStyle: 'flat', shadow: 'none',
      buttonStyle: 'outline', sectionSpacing: 'generous', headingScale: 'editorial', letterSpacing: 'tight',
    },
  },
  {
    id: 'bold', name: 'Bold',
    description: 'Expressive typography, vibrant colour and dynamic, asymmetric layouts.',
    category: 'Creative', tags: ['bold', 'vibrant', 'playful'],
    swatch: ['#4c1d95', '#f59e0b', '#fef3c7'],
    headerVariant: 'solid', heroVariant: 'editorial', footerVariant: 'dark',
    blueprint: [
      { key: 'services', variant: 'grid' }, { key: 'stats', variant: 'cards' },
      { key: 'gallery', variant: 'masonry' }, { key: 'about', variant: 'image-right' },
      { key: 'promotions', variant: 'cards' }, { key: 'testimonials', variant: 'wall' },
      { key: 'booking', variant: 'banner' },
    ],
    theme: {
      primary: '#4c1d95', secondary: '#db2777', accent: '#f59e0b', background: '#fffbeb',
      surface: '#fef3c7', text: '#1c1917', mutedText: '#57534e', buttonBackground: '#4c1d95',
      buttonText: '#ffffff', border: '#fcd34d', headingFont: 'Figtree', bodyFont: 'Figtree',
      headingWeight: 800, radius: 'round', cardStyle: 'elevated', shadow: 'strong',
      buttonStyle: 'pill', sectionSpacing: 'comfortable', headingScale: 'display',
    },
  },
  {
    id: 'professional', name: 'Professional',
    description: 'Structured, business-focused layouts with a confident, trustworthy tone.',
    category: 'Professional Services', tags: ['corporate', 'structured', 'trust'],
    swatch: ['#0b2a4a', '#0ea5e9', '#f1f5f9'],
    headerVariant: 'split', heroVariant: 'split', footerVariant: 'columns',
    blueprint: [
      { key: 'services', variant: 'featured' }, { key: 'about', variant: 'image-right' },
      { key: 'stats', variant: 'row' }, { key: 'team', variant: 'cards' },
      { key: 'testimonials', variant: 'cards' }, { key: 'faq', variant: 'two-column' },
      { key: 'contact', variant: 'split' }, { key: 'booking', variant: 'panel' },
    ],
    theme: {
      primary: '#0b2a4a', secondary: '#1d4ed8', accent: '#0ea5e9', background: '#ffffff',
      surface: '#f1f5f9', text: '#0f172a', mutedText: '#475569', buttonBackground: '#0b2a4a',
      buttonText: '#ffffff', border: '#dbe3ec', headingFont: 'Figtree', bodyFont: 'Figtree',
      headingWeight: 700, radius: 'soft', cardStyle: 'soft', shadow: 'soft', buttonStyle: 'rounded',
      sectionSpacing: 'comfortable',
    },
  },
  {
    id: 'wellness', name: 'Wellness',
    description: 'Soft, elegant layouts with calm colour — made for salons, spas and studios.',
    category: 'Beauty & Wellness', tags: ['wellness', 'soft', 'calm'],
    swatch: ['#7c5c47', '#c9a27a', '#fdf8f4'],
    headerVariant: 'minimal', heroVariant: 'split', footerVariant: 'contact',
    blueprint: [
      { key: 'services', variant: 'image-cards' }, { key: 'about', variant: 'image-left' },
      { key: 'gallery', variant: 'masonry' }, { key: 'team', variant: 'circles' },
      { key: 'testimonials', variant: 'cards' }, { key: 'hours', variant: 'cards' },
      { key: 'booking', variant: 'panel' }, { key: 'contact', variant: 'split' },
    ],
    theme: {
      primary: '#7c5c47', secondary: '#a98b74', accent: '#c9a27a', background: '#fdf8f4',
      surface: '#f6ece4', text: '#3b2f28', mutedText: '#8a7669', buttonBackground: '#7c5c47',
      buttonText: '#fffaf5', border: '#ecddd0', headingFont: 'Newsreader', bodyFont: 'Figtree',
      headingWeight: 400, radius: 'round', cardStyle: 'soft', shadow: 'soft',
      buttonStyle: 'pill', sectionSpacing: 'generous',
    },
  },
  {
    id: 'motion', name: 'Motion',
    description: 'Large visual heroes, subtle motion and a modern, immersive rhythm.',
    category: 'Fitness', tags: ['immersive', 'dark', 'modern', 'bold'],
    swatch: ['#0f172a', '#facc15', '#111a2e'],
    headerVariant: 'sticky-compact', heroVariant: 'video', footerVariant: 'dark',
    blueprint: [
      { key: 'stats', variant: 'banner' }, { key: 'services', variant: 'grid' },
      { key: 'about', variant: 'image-right' }, { key: 'team', variant: 'showcase' },
      { key: 'gallery', variant: 'full-width' }, { key: 'testimonials', variant: 'wall' },
      { key: 'promotions', variant: 'cards' }, { key: 'booking', variant: 'banner' },
    ],
    theme: {
      primary: '#0f172a', secondary: '#dc2626', accent: '#facc15', background: '#0b1120',
      surface: '#111a2e', text: '#f8fafc', mutedText: '#94a3b8', buttonBackground: '#dc2626',
      buttonText: '#ffffff', border: '#1e293b', headingFont: 'Figtree', bodyFont: 'Figtree',
      headingWeight: 800, radius: 'soft', cardStyle: 'elevated', shadow: 'strong',
      buttonStyle: 'rounded', sectionSpacing: 'comfortable', headingScale: 'display',
      backgroundStyle: 'gradient', gradientFrom: '#0b1120', gradientTo: '#1e293b',
    },
  },
]

/**
 * Template ids that shipped in an earlier revision, mapped onto the current
 * canonical ids. A business saved against one of these keeps its exact look
 * (its stored theme/sections are untouched) while resolving to a live template,
 * so nothing about an already-published storefront changes.
 */
export const LEGACY_TEMPLATE_ALIASES: Record<string, string> = {
  'modern-minimal': 'classic',
  'modern-commerce': 'professional',
  'luxury-premium': 'luxe',
  'bold-creative': 'bold',
  'professional-corporate': 'professional',
  editorial: 'atelier',
  'wellness-beauty': 'wellness',
  'fitness-lifestyle': 'motion',
}

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))

export function findTemplate(id: string | null | undefined): TemplateDefinition | undefined {
  if (!id) return undefined
  const direct = TEMPLATE_BY_ID.get(id)
  if (direct) return direct
  const canonical = LEGACY_TEMPLATE_ALIASES[id]
  return canonical ? TEMPLATE_BY_ID.get(canonical) : undefined
}

/** The canonical template id a (possibly legacy) id resolves to, or null. */
export function canonicalTemplateId(id: string | null | undefined): string | null {
  return findTemplate(id)?.id ?? null
}

export const TEMPLATE_CATEGORIES = Array.from(new Set(TEMPLATES.map((t) => t.category)))


