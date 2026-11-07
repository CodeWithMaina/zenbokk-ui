import type {
  StorefrontConfig,
  StorefrontFooter,
  StorefrontHeader,
  StorefrontHero,
  StorefrontNavItem,
  StorefrontPage,
  StorefrontSection,
  StorefrontSeo,
  StorefrontTheme,
} from '../api/types'
import {
  ANIMATION_OPTIONS,
  DRAWER_OPTIONS,
  HOVER_EFFECT_OPTIONS,
  MODE_OPTIONS,
  PAGE_TRANSITION_OPTIONS,
  SECTION_BACKGROUND_OPTIONS,
  SECTION_PADDING_OPTIONS,
  findSection,
  normaliseVariant,
} from './catalog'
import { TEMPLATES, canonicalTemplateId, findTemplate } from './templates'
import type { BlueprintEntry, TemplatePage } from './templates'

/**
 * Client mirror of `PunchedApi/Application/Services/StorefrontBuilderDefaults.cs`.
 *
 * The server is the authority (it merges + validates on every save), but the
 * editor needs the same defaults locally so a fresh draft renders immediately
 * and template switching is instant and offline-capable.
 */

export const DEFAULT_TEMPLATE_ID = 'classic'

export function defaultTheme(): StorefrontTheme {
  return {
    primary: '#0d3a26', secondary: '#1f5c3f', accent: '#cbb27a', background: '#ffffff',
    surface: '#f7f5f1', text: '#1c1b19', mutedText: '#6b6660', buttonBackground: '#0d3a26',
    buttonText: '#ffffff', border: '#e6e1d8',
    headingFont: 'Newsreader', bodyFont: 'Figtree', headingWeight: 500, bodyWeight: 400,
    baseFontSize: 16, headingScale: 'balanced', lineHeight: 'normal', letterSpacing: 'normal',
    contentWidth: 1180, sectionSpacing: 'comfortable', containerPadding: 'normal',
    radius: 'soft', cardStyle: 'soft', shadow: 'soft', imageRatio: '4:5', buttonStyle: 'rounded',
    backgroundStyle: 'solid', backgroundImageMediaId: null,
    gradientFrom: '#0d3a26', gradientTo: '#1f5c3f',
    // Motion & presentation — mirrors StorefrontThemeDto.
    mode: 'light', animation: 'up', durationMs: 600, hoverEffect: 'lift',
    pageTransition: 'fade', radiusPx: null,
  }
}

export function defaultHeader(): StorefrontHeader {
  return {
    variant: 'minimal', showLogo: true, logoMediaId: null, logoSize: 'medium',
    showBusinessName: true, sticky: true, transparent: true, background: '#ffffff',
    textColor: '#1c1b19', alignment: 'left', spacing: 'normal', mobileStyle: 'drawer',
    ctaEnabled: true, ctaLabel: 'Book now', ctaType: 'book',
    // The design's header controls — mirrors StorefrontHeaderDto.
    nav: [], drawer: 'left', linkEffect: 'underline', ctaStyle: 'solid',
    uppercaseLinks: false, height: 18, shadow: false, border: false,
    announcement: null, utilityLeft: null, utilityRight: null, showContactInDrawer: true,
  }
}

export function defaultHero(): StorefrontHero {
  return {
    variant: 'full-image', enabled: true, eyebrow: null, heading: null, subheading: null,
    description: null, primaryCtaLabel: 'Book an appointment', primaryCtaType: 'book',
    secondaryCtaLabel: 'View services', secondaryCtaType: 'services', backgroundMediaId: null,
    carouselMediaIds: [], videoUrl: null, overlayOpacity: 55, backgroundColor: '#0d3a26', textAlign: 'left',
    height: 'tall', contentWidth: 'normal', imagePosition: 'center', mobileLayout: 'stack',
    showLogo: false, showFacts: true,
    animation: 'inherit',
  }
}

export function defaultFooter(): StorefrontFooter {
  return {
    variant: 'columns', showLogo: true, logoMediaId: null, description: null, showContact: true,
    showAddress: true, showHours: true, showSocial: true, socials: [], showNav: true,
    showLegal: true, legalLinks: [], copyright: null, backgroundColor: '#12110f', textColor: '#efe6d2',
    // The design's footer controls — mirrors StorefrontFooterDto.
    padding: 72, newsletterHeadline: null, newsletterPlaceholder: 'Your email',
    newsletterButtonLabel: 'Subscribe', showWordmark: false,
  }
}

export function defaultSeo(): StorefrontSeo {
  return {
    title: null, description: null, ogTitle: null, ogDescription: null,
    ogImageMediaId: null, faviconMediaId: null, keywords: null,
  }
}

export function defaultPages(): StorefrontPage[] {
  return [
    { id: 'page-home', title: 'Home', slug: '', kind: 'home', showInNav: true, order: 0, seoTitle: null, seoDescription: null, hero: null, sections: null },
    { id: 'page-services', title: 'Services', slug: 'services', kind: 'services', showInNav: true, order: 10, seoTitle: null, seoDescription: null, hero: null, sections: null },
    { id: 'page-about', title: 'About', slug: 'about', kind: 'about', showInNav: true, order: 20, seoTitle: null, seoDescription: null, hero: null, sections: null },
    { id: 'page-contact', title: 'Contact', slug: 'contact', kind: 'contact', showInNav: true, order: 30, seoTitle: null, seoDescription: null, hero: null, sections: null },
  ]
}

export function newSectionId(key: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${key}-${random}`
}

export function newPageId(): string {
  return `page-${Math.random().toString(36).slice(2, 10)}`
}

/** Creates the default configuration, with the default template applied. */
export function createDefaultConfig(): StorefrontConfig {
  const config: StorefrontConfig = {
    templateId: DEFAULT_TEMPLATE_ID,
    theme: defaultTheme(),
    header: defaultHeader(),
    hero: defaultHero(),
    footer: defaultFooter(),
    seo: defaultSeo(),
    sections: [],
    pages: defaultPages(),
  }
  return applyTemplate(config, DEFAULT_TEMPLATE_ID, false)
}

/** Builds one section instance from the catalogue defaults. */
export function makeSection(key: string, variant?: string): StorefrontSection {
  const def = findSection(key)
  return {
    id: newSectionId(key),
    key,
    variant: normaliseVariant(key, variant ?? def?.defaultVariant),
    enabled: true,
    order: 0,
    title: def?.defaultTitle ?? null,
    description: def?.defaultDescription ?? null,
    settings: {},
    columns: 3,
    background: 'default',
    padding: 'normal',
    alignment: 'left',
    animation: 'inherit',
  }
}

function pick(value: string | null | undefined, fallback: string): string {
  return !value ? fallback : value
}

function fromList(
  value: string | null | undefined,
  allowed: readonly { value: string }[],
  fallback: string,
): string {
  if (!value) return fallback
  const match = allowed.find((option) => option.value.toLowerCase() === value.toLowerCase())
  return match ? match.value : fallback
}

function clampInt(value: number | null | undefined, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && value > 0 ? Math.min(Math.max(value, min), max) : fallback
}

function mergeNavItem(item: StorefrontNavItem): StorefrontNavItem {
  return {
    label: item.label ?? '',
    enabled: item.enabled ?? true,
    destination: item.destination ?? 'home',
    url: item.url ?? '',
    children: (item.children ?? []).map(mergeNavItem),
  }
}

/** Normalises a section list, mirroring the server's `MergeSectionList`. */
export function mergeSections(stored: StorefrontSection[] | null | undefined): StorefrontSection[] {
  return (stored ?? [])
    .filter((section) => section && findSection(section.key))
    .map<StorefrontSection>((section) => ({
      id: section.id || newSectionId(section.key),
      key: section.key,
      variant: normaliseVariant(section.key, section.variant),
      enabled: section.enabled ?? true,
      order: typeof section.order === 'number' ? section.order : 0,
      title: section.title ?? null,
      description: section.description ?? null,
      settings: section.settings ?? {},
      columns:
        typeof section.columns === 'number' && section.columns > 0
          ? Math.min(Math.max(section.columns, 1), 4)
          : 3,
      background: fromList(section.background, SECTION_BACKGROUND_OPTIONS, 'default'),
      padding: fromList(section.padding, SECTION_PADDING_OPTIONS, 'normal'),
      alignment: section.alignment === 'center' ? 'center' : 'left',
      animation: fromList(section.animation, ANIMATION_OPTIONS, 'inherit'),
    }))
    .sort((a, b) => a.order - b.order)
}

/**
 * Normalises one page, mirroring the server's `MergePage`: the home page never
 * carries its own hero/sections, so the storefront-wide pair stays authoritative.
 */
export function mergePage(stored: StorefrontPage): StorefrontPage {
  const page: StorefrontPage = {
    id: stored.id,
    title: stored.title,
    slug: stored.slug ?? '',
    kind: stored.kind || 'custom',
    showInNav: stored.showInNav ?? true,
    order: typeof stored.order === 'number' ? stored.order : 0,
    seoTitle: stored.seoTitle ?? null,
    seoDescription: stored.seoDescription ?? null,
    hero: null,
    sections: null,
  }
  if (page.kind.toLowerCase() === 'home') return page
  if (stored.hero) page.hero = { ...defaultHero(), ...stored.hero }
  if (stored.sections && stored.sections.length > 0) page.sections = mergeSections(stored.sections)
  return page
}

/**
 * Fills a (possibly partial / legacy) configuration with platform defaults so the
 * editor never has to defend against a missing field. Unknown section keys are
 * dropped and unknown variants normalised, matching the server's Merge.
 */
export function mergeConfig(stored: Partial<StorefrontConfig> | null | undefined): StorefrontConfig {
  const base = createDefaultConfig()
  if (!stored) return base

  // A known (or legacy-aliased) template id is canonicalised so a business saved
  // against an earlier revision resolves to the live template carrying its design.
  const templateId = canonicalTemplateId(stored.templateId) ?? base.templateId
  const sections = mergeSections(stored.sections)

  const theme: StorefrontTheme = {
    ...base.theme,
    ...(stored.theme ?? {}),
    mode: fromList(stored.theme?.mode, MODE_OPTIONS, base.theme.mode),
    animation: fromList(stored.theme?.animation, ANIMATION_OPTIONS, base.theme.animation),
    durationMs: clampInt(stored.theme?.durationMs, 200, 1500, base.theme.durationMs),
    hoverEffect: fromList(stored.theme?.hoverEffect, HOVER_EFFECT_OPTIONS, base.theme.hoverEffect),
    pageTransition: fromList(
      stored.theme?.pageTransition,
      PAGE_TRANSITION_OPTIONS,
      base.theme.pageTransition,
    ),
    radiusPx: stored.theme?.radiusPx ?? base.theme.radiusPx,
  }

  const header: StorefrontHeader = {
    ...base.header,
    ...(stored.header ?? {}),
    nav: (stored.header?.nav ?? []).map(mergeNavItem),
    drawer: fromList(stored.header?.drawer, DRAWER_OPTIONS, base.header.drawer),
    linkEffect: pick(stored.header?.linkEffect, base.header.linkEffect),
    ctaStyle: pick(stored.header?.ctaStyle, base.header.ctaStyle),
    height: clampInt(stored.header?.height, 6, 40, base.header.height),
  }

  const footer: StorefrontFooter = {
    ...base.footer,
    ...(stored.footer ?? {}),
    socials: stored.footer?.socials ?? [],
    legalLinks: stored.footer?.legalLinks ?? [],
    padding: clampInt(stored.footer?.padding, 24, 120, base.footer.padding),
    newsletterPlaceholder: pick(stored.footer?.newsletterPlaceholder, base.footer.newsletterPlaceholder),
    newsletterButtonLabel: pick(stored.footer?.newsletterButtonLabel, base.footer.newsletterButtonLabel),
  }

  const pages =
    stored.pages && stored.pages.length > 0
      ? stored.pages
          .filter((page) => page && page.id)
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(mergePage)
      : base.pages

  return {
    templateId,
    theme,
    header,
    hero: { ...base.hero, ...(stored.hero ?? {}), carouselMediaIds: stored.hero?.carouselMediaIds ?? [] },
    footer,
    seo: { ...base.seo, ...(stored.seo ?? {}) },
    sections: sections.length > 0 ? sections : base.sections,
    pages,
  }
}

/**
 * Applies a template's design to a configuration. When `preserveContent` is true,
 * section titles/descriptions/settings, media ids, pages and SEO are kept — so
 * switching template changes the look without discarding what the owner wrote.
 * Mirrors `StorefrontBuilderDefaults.ApplyTemplate` on the server.
 */
export function applyTemplate(
  config: StorefrontConfig,
  templateId: string,
  preserveContent = true,
): StorefrontConfig {
  const template = findTemplate(templateId) ?? TEMPLATES[0]

  const previous = new Map<string, StorefrontSection[]>()
  for (const section of config.sections) {
    const bucket = previous.get(section.key) ?? []
    bucket.push(section)
    previous.set(section.key, bucket)
  }

  let order = 0
  const sections: StorefrontSection[] = []
  for (const entry of template.blueprint) {
    const def = findSection(entry.key)
    if (!def) continue
    const carried = previous.get(entry.key)?.shift()
    order += 10
    sections.push({
      id: carried?.id ?? newSectionId(entry.key),
      key: entry.key,
      variant: normaliseVariant(entry.key, entry.variant),
      enabled: carried?.enabled ?? true,
      order,
      title: carried?.title ?? (preserveContent ? null : def.defaultTitle),
      description: carried?.description ?? (preserveContent ? null : def.defaultDescription),
      settings: carried?.settings ?? {},
      columns: 3,
      background: 'default',
      padding: 'normal',
      alignment: 'left',
      animation: 'inherit',
    })
  }

  // Design tokens are always taken from the template (a full theme, so unset
  // tokens fall back to the platform defaults rather than the previous theme).
  const theme: StorefrontTheme = { ...defaultTheme(), ...template.theme }

  const heroTextAlign = ['centered', 'premium', 'gradient', 'video'].includes(template.heroVariant)
    ? 'center'
    : 'left'
  const heroHeight =
    template.heroVariant === 'premium' || template.heroVariant === 'video'
      ? 'screen'
      : template.heroVariant === 'minimal'
        ? 'compact'
        : template.heroVariant === 'centered' || template.heroVariant === 'gradient'
          ? 'standard'
          : 'tall'

  const pages =
    template.pages.length > 0
      ? buildTemplatePages(config.pages, template)
      : config.pages.length > 0
        ? config.pages
        : defaultPages()

  return {
    ...config,
    templateId: template.id,
    theme,
    header: {
      ...config.header,
      variant: template.headerVariant,
      transparent: ['minimal', 'floating', 'centered'].includes(template.headerVariant),
      sticky: ['sticky-compact', 'solid', 'split'].includes(template.headerVariant),
    },
    hero: {
      ...config.hero,
      variant: template.heroVariant,
      textAlign: heroTextAlign,
      height: heroHeight,
      backgroundColor: theme.primary,
    },
    footer: {
      ...config.footer,
      variant: template.footerVariant,
      backgroundColor: theme.primary,
      textColor: theme.background,
    },
    sections,
    pages,
  }
}

/**
 * Seeds a template's whole site, mirroring the server's `BuildTemplatePages`.
 * Page titles/slugs/SEO the owner edited are preserved; the home page never keeps
 * its own hero/sections — the storefront-wide pair is its single source of truth.
 */
export function buildTemplatePages(
  current: StorefrontPage[],
  template: { heroVariant: string; theme: Partial<StorefrontTheme>; pages: TemplatePage[] },
): StorefrontPage[] {
  const existing = new Map(current.map((page) => [page.id.toLowerCase(), page]))
  const heroColor = template.theme.primary ?? defaultTheme().primary
  const pages: StorefrontPage[] = []
  let order = 0

  for (const definition of template.pages) {
    const carried = existing.get(definition.id.toLowerCase())
    const isHome = definition.kind.toLowerCase() === 'home'
    const page: StorefrontPage = {
      id: definition.id,
      title: carried?.title ?? definition.title,
      slug: carried?.slug ?? definition.slug,
      kind: definition.kind,
      showInNav: carried?.showInNav ?? true,
      order: (order += 10),
      seoTitle: carried?.seoTitle ?? null,
      seoDescription: carried?.seoDescription ?? null,
      hero: null,
      sections: null,
    }

    if (!isHome) {
      page.hero = {
        ...defaultHero(),
        variant: template.heroVariant,
        heading: definition.heroHeading,
        description: definition.heroDescription,
        backgroundColor: heroColor,
        height: 'compact',
      }
      page.sections = buildSections(definition.blueprint, carried?.sections ?? null)
    }

    pages.push(page)
  }

  return pages
}

/** Builds a section list from a blueprint, carrying the content of the same key. */
export function buildSections(
  blueprint: BlueprintEntry[],
  carried: StorefrontSection[] | null,
): StorefrontSection[] {
  const previous = new Map<string, StorefrontSection[]>()
  for (const section of carried ?? []) {
    const bucket = previous.get(section.key) ?? []
    bucket.push(section)
    previous.set(section.key, bucket)
  }

  const sections: StorefrontSection[] = []
  let order = 0
  for (const entry of blueprint) {
    if (!findSection(entry.key)) continue
    const existing = previous.get(entry.key)?.shift()
    sections.push({
      id: existing?.id ?? newSectionId(entry.key),
      key: entry.key,
      variant: normaliseVariant(entry.key, entry.variant),
      enabled: existing?.enabled ?? true,
      order: (order += 10),
      title: existing?.title ?? null,
      description: existing?.description ?? null,
      settings: existing?.settings ?? {},
      columns: 3,
      background: 'default',
      padding: 'normal',
      alignment: 'left',
      animation: 'inherit',
    })
  }

  return sections
}

/** Re-numbers a section list to 10, 20, 30… in its current visual order. */
export function resequence(sections: StorefrontSection[]): StorefrontSection[] {
  return sections.map((section, index) => ({ ...section, order: (index + 1) * 10 }))
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
