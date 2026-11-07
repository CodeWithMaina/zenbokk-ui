import type { StorefrontTheme } from '../api/types'

/**
 * The storefront template library, mirrored from
 * `PunchedApi/Application/Services/StorefrontTemplates.cs`.
 *
 * Every template ships the same starting **site** — a home page plus Services,
 * About, Gallery and Contact, each with its own hero copy and section list —
 * because that is what the storefront kit does: the identity comes from the
 * palette, the typography, the corner radius and the headline, not from a
 * different page structure.
 *
 * `Classic` reproduces the storefront that shipped before the builder existed and
 * is the default, so a business that never chose a template keeps the page it
 * already had. `templates.parity.test.ts` fails if this file and the server
 * definition drift apart.
 */

export type BlueprintEntry = { key: string; variant: string }

/** One page of a template's starting site. */
export type TemplatePage = {
  id: string
  title: string
  slug: string
  /** home | services | about | contact | gallery | reviews | team | booking | custom */
  kind: string
  heroHeading: string
  heroDescription: string
  blueprint: BlueprintEntry[]
}

export type TemplateDefinition = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  /** Accent swatch shown on the gallery card: [primary, accent, background]. */
  swatch: [string, string, string]
  headerVariant: string
  heroVariant: string
  footerVariant: string
  blueprint: BlueprintEntry[]
  /** Theme tokens applied on top of the platform defaults. */
  theme: Partial<StorefrontTheme>
  /** The whole site this template seeds. Empty for a home-page-only template. */
  pages: TemplatePage[]
}

/** The design's palette keys, exactly as the design names them. */
export type DesignPalette = {
  primary: string
  accent: string
  background: string
  surface: string
  headingFont: string
  bodyFont: string
  radiusPx: number
}

/** `sharp` | `soft` | `round`, from the design's numeric radius. */
export function radiusToken(px: number): string {
  if (px <= 4) return 'sharp'
  if (px <= 12) return 'soft'
  return 'round'
}

/**
 * A design palette translated onto the production token set — the mirror of
 * `StorefrontTemplates.DesignTheme` on the server, so applying a template here
 * produces exactly the configuration the server would.
 */
export function designTheme(palette: DesignPalette): Partial<StorefrontTheme> {
  return {
    primary: palette.primary,
    secondary: palette.primary,
    accent: palette.accent,
    background: palette.background,
    surface: palette.surface,
    text: palette.primary,
    buttonBackground: palette.primary,
    buttonText: '#ffffff',
    border: palette.surface,
    headingFont: palette.headingFont,
    bodyFont: palette.bodyFont,
    headingWeight: 500,
    radiusPx: palette.radiusPx,
    radius: radiusToken(palette.radiusPx),
    sectionSpacing: 'normal',
    cardStyle: 'soft',
    shadow: 'soft',
    buttonStyle: 'rounded',
    imageRatio: '4:5',
    mode: 'light',
    animation: 'up',
    durationMs: 600,
    hoverEffect: 'lift',
    pageTransition: 'fade',
  }
}

/** The home page's section list, shared by every design template. */
export const HOME_BLUEPRINT: BlueprintEntry[] = [
  { key: 'about', variant: 'image-left' },
  { key: 'services', variant: 'cards' },
  { key: 'gallery', variant: 'grid' },
  { key: 'testimonials', variant: 'cards' },
  { key: 'booking', variant: 'panel' },
]

/**
 * The design's five pages, each with its own hero copy and section list. Sample
 * copy only — the business's name, address, hours and services are rendered from
 * real data and are never seeded here.
 */
export function startingSite(headline: string, blurb: string): TemplatePage[] {
  return [
    {
      id: 'home', title: 'Home', slug: '', kind: 'home',
      heroHeading: headline, heroDescription: blurb, blueprint: HOME_BLUEPRINT,
    },
    {
      id: 'services', title: 'Services', slug: 'services', kind: 'services',
      heroHeading: 'Services and pricing', heroDescription: 'Everything we offer, with honest prices.',
      blueprint: [{ key: 'services', variant: 'list' }, { key: 'booking', variant: 'panel' }],
    },
    {
      id: 'about', title: 'About', slug: 'about', kind: 'about',
      heroHeading: 'The people behind the studio', heroDescription: 'A small team that cares about the details.',
      blueprint: [
        { key: 'about', variant: 'image-right' },
        { key: 'richtext', variant: 'quote' },
        { key: 'testimonials', variant: 'cards' },
      ],
    },
    {
      id: 'gallery', title: 'Gallery', slug: 'gallery', kind: 'gallery',
      heroHeading: 'Our work', heroDescription: 'Recent cuts, colour and finishes.',
      blueprint: [{ key: 'gallery', variant: 'feature-first' }, { key: 'booking', variant: 'panel' }],
    },
    {
      id: 'contact', title: 'Contact', slug: 'contact', kind: 'contact',
      heroHeading: 'Come and say hello', heroDescription: 'We are easy to find and easy to book.',
      blueprint: [{ key: 'contact', variant: 'split' }, { key: 'hours', variant: 'list' }],
    },
  ]
}

/** The pre-builder storefront, preserved verbatim and still the default. */
const CLASSIC: TemplateDefinition = {
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
  pages: [],
}

type DesignSpec = DesignPalette & {
  id: string
  name: string
  category: string
  description: string
  headline: string
  blurb: string
}

/** The seven design templates, with the exact palettes, fonts and radii of the design. */
const DESIGNS: DesignSpec[] = [
  {
    id: 'atelier', name: 'Atelier', category: 'Beauty and Salon',
    description: 'Warm paper tones, an editorial serif and square corners — a small studio with a steady hand.',
    primary: '#1c1917', accent: '#b45309', background: '#fffdf8', surface: '#f5f0e6',
    headingFont: 'Newsreader', bodyFont: 'Figtree', radiusPx: 0,
    headline: 'The art of a good haircut.',
    blurb: 'Colour, cut and care from a small team in Nyeri. Appointments, not queues.',
  },
  {
    id: 'luxe', name: 'Luxe', category: 'Beauty and Salon',
    description: 'Deep lacquer, antique gold and a high-contrast serif for a private studio.',
    primary: '#1a1712', accent: '#cbb27a', background: '#faf7f0', surface: '#f1ebdd',
    headingFont: 'Playfair Display', bodyFont: 'Figtree', radiusPx: 2,
    headline: 'Quiet luxury, beautifully finished.',
    blurb: 'Signature colour and styling in a private studio.',
  },
  {
    id: 'fade', name: 'Fade & Co', category: 'Barbershop',
    description: 'Ink navy with a brass accent and a geometric sans — sharp, direct, no fuss.',
    primary: '#14213d', accent: '#e0a526', background: '#ffffff', surface: '#f1f3f7',
    headingFont: 'DM Sans', bodyFont: 'DM Sans', radiusPx: 6,
    headline: 'Sharp cuts. Straight talk.',
    blurb: 'Fades, beard trims and hot towel shaves since 2016.',
  },
  {
    id: 'bloom', name: 'Bloom', category: 'Fitness and Wellness',
    description: 'Sage and clay, an editorial serif and generous rounding for a slower pace.',
    primary: '#2f5d50', accent: '#d98b6a', background: '#f8faf7', surface: '#e9efe9',
    headingFont: 'Newsreader', bodyFont: 'Figtree', radiusPx: 14,
    headline: 'Slow down. Feel like yourself.',
    blurb: 'Massage, facials and recovery sessions, booked in a minute.',
  },
  {
    id: 'ink', name: 'Inkwell', category: 'Photography',
    description: 'Near-black and a single hot accent, square corners, nothing in the way of the work.',
    primary: '#111111', accent: '#ff5a36', background: '#f4f4f2', surface: '#e8e8e4',
    headingFont: 'DM Sans', bodyFont: 'DM Sans', radiusPx: 0,
    headline: 'Portraits with a point of view.',
    blurb: 'Studio and on-location sessions for people and brands.',
  },
  {
    id: 'table', name: 'Saffron Table', category: 'Restaurant and Hospitality',
    description: 'Claret and old gold with a classical serif, for a menu worth planning around.',
    primary: '#5b1e1e', accent: '#c9a14a', background: '#fdf8f2', surface: '#f3e9dc',
    headingFont: 'Playfair Display', bodyFont: 'Figtree', radiusPx: 4,
    headline: 'Dinner worth planning around.',
    blurb: 'Seasonal tasting menus and a short, honest wine list.',
  },
  {
    id: 'ledger', name: 'Ledger', category: 'Professional Services',
    description: 'Trustworthy navy and a clear blue accent, set in a plain-spoken sans.',
    primary: '#1e3a5f', accent: '#3b82f6', background: '#ffffff', surface: '#f2f5f9',
    headingFont: 'DM Sans', bodyFont: 'DM Sans', radiusPx: 8,
    headline: 'Clear advice for growing businesses.',
    blurb: 'Tax, bookkeeping and planning for owner-run companies.',
  },
]

function design(spec: DesignSpec): TemplateDefinition {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    category: spec.category,
    tags: [spec.id, 'design'],
    swatch: [spec.primary, spec.accent, spec.background],
    headerVariant: 'classic',
    heroVariant: 'overlay',
    footerVariant: 'columns',
    blueprint: HOME_BLUEPRINT,
    theme: designTheme(spec),
    pages: startingSite(spec.headline, spec.blurb),
  }
}

export const TEMPLATES: TemplateDefinition[] = [CLASSIC, ...DESIGNS.map(design)]

/**
 * Template ids that shipped in an earlier revision, mapped onto the current
 * canonical ids. A business saved against one of these keeps its exact look (its
 * stored theme/sections are untouched) while resolving to a live template, so
 * nothing about an already-published storefront changes.
 */
export const LEGACY_TEMPLATE_ALIASES: Record<string, string> = {
  'modern-minimal': 'classic',
  'modern-commerce': 'ledger',
  'luxury-premium': 'luxe',
  'bold-creative': 'ink',
  'professional-corporate': 'ledger',
  editorial: 'atelier',
  'wellness-beauty': 'bloom',
  'fitness-lifestyle': 'fade',
  // The production template family the design's catalogue replaced.
  minimal: 'atelier',
  professional: 'ledger',
  bold: 'ink',
  wellness: 'bloom',
  motion: 'fade',
}

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((template) => [template.id, template]))

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

export const TEMPLATE_CATEGORIES = Array.from(new Set(TEMPLATES.map((template) => template.category)))
