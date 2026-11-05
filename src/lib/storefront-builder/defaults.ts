import type {
  StorefrontConfig,
  StorefrontFooter,
  StorefrontHeader,
  StorefrontHero,
  StorefrontPage,
  StorefrontSection,
  StorefrontSeo,
  StorefrontTheme,
} from '../api/types'
import { findSection, normaliseVariant } from './catalog'
import { TEMPLATES, canonicalTemplateId, findTemplate } from './templates'

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
  }
}

export function defaultHeader(): StorefrontHeader {
  return {
    variant: 'minimal', showLogo: true, logoMediaId: null, logoSize: 'medium',
    showBusinessName: true, sticky: true, transparent: true, background: '#ffffff',
    textColor: '#1c1b19', alignment: 'left', spacing: 'normal', mobileStyle: 'drawer',
    ctaEnabled: true, ctaLabel: 'Book now', ctaType: 'book',
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
  }
}

export function defaultFooter(): StorefrontFooter {
  return {
    variant: 'columns', showLogo: true, logoMediaId: null, description: null, showContact: true,
    showAddress: true, showHours: true, showSocial: true, socials: [], showNav: true,
    showLegal: true, legalLinks: [], copyright: null, backgroundColor: '#12110f', textColor: '#efe6d2',
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
    { id: 'page-home', title: 'Home', slug: '', kind: 'home', showInNav: true, order: 0, seoTitle: null, seoDescription: null },
    { id: 'page-services', title: 'Services', slug: 'services', kind: 'services', showInNav: true, order: 10, seoTitle: null, seoDescription: null },
    { id: 'page-about', title: 'About', slug: 'about', kind: 'about', showInNav: true, order: 20, seoTitle: null, seoDescription: null },
    { id: 'page-contact', title: 'Contact', slug: 'contact', kind: 'contact', showInNav: true, order: 30, seoTitle: null, seoDescription: null },
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
  }
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

  const sections = (stored.sections ?? [])
    .filter((s) => s && findSection(s.key))
    .map<StorefrontSection>((s) => ({
      id: s.id || newSectionId(s.key),
      key: s.key,
      variant: normaliseVariant(s.key, s.variant),
      enabled: s.enabled ?? true,
      order: typeof s.order === 'number' ? s.order : 0,
      title: s.title ?? null,
      description: s.description ?? null,
      settings: s.settings ?? {},
    }))
    .sort((a, b) => a.order - b.order)

  return {
    templateId,
    theme: { ...base.theme, ...(stored.theme ?? {}) },
    header: { ...base.header, ...(stored.header ?? {}) },
    hero: { ...base.hero, ...(stored.hero ?? {}), carouselMediaIds: stored.hero?.carouselMediaIds ?? [] },
    footer: {
      ...base.footer,
      ...(stored.footer ?? {}),
      socials: stored.footer?.socials ?? [],
      legalLinks: stored.footer?.legalLinks ?? [],
    },
    seo: { ...base.seo, ...(stored.seo ?? {}) },
    sections: sections.length > 0 ? sections : base.sections,
    pages: stored.pages && stored.pages.length > 0 ? stored.pages : base.pages,
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
    })
  }

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

  return {
    ...config,
    templateId: template.id,
    theme: { ...config.theme, ...template.theme },
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
      backgroundColor: template.theme.primary ?? config.hero.backgroundColor,
    },
    footer: {
      ...config.footer,
      variant: template.footerVariant,
      backgroundColor: template.theme.primary ?? config.footer.backgroundColor,
      textColor: template.theme.background ?? config.footer.textColor,
    },
    sections,
    pages: config.pages.length > 0 ? config.pages : defaultPages(),
  }
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
