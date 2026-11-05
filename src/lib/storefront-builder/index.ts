export { storefrontBuilderApi } from './api'
export {
  DEFAULT_TEMPLATE_ID,
  applyTemplate,
  createDefaultConfig,
  defaultFooter,
  defaultHeader,
  defaultHero,
  defaultPages,
  defaultSeo,
  defaultTheme,
  makeSection,
  mergeConfig,
  newPageId,
  newSectionId,
  resequence,
  slugify,
} from './defaults'
export {
  BACKGROUND_STYLE_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  FONT_OPTIONS,
  FOOTER_VARIANTS,
  HEADER_CTA_TYPES,
  HEADER_VARIANTS,
  HERO_VARIANTS,
  IMAGE_RATIO_OPTIONS,
  RADIUS_OPTIONS,
  SECTION_CATALOG,
  SHADOW_OPTIONS,
  SPACING_OPTIONS,
  findSection,
  normaliseVariant,
  sectionAllows,
} from './catalog'
export type { SectionDefinition } from './catalog'
export { TEMPLATES, TEMPLATE_CATEGORIES, LEGACY_TEMPLATE_ALIASES, canonicalTemplateId, findTemplate } from './templates'
export type { TemplateDefinition } from './templates'
export {
  useApplyStorefrontTemplate,
  usePublicStorefront,
  usePublishStorefront,
  useResetStorefrontDraft,
  useSaveStorefrontDraft,
  useStorefrontBuilder,
  useUnpublishStorefront,
} from './use-storefront-builder'
export { useBuilderEditor } from './use-builder-editor'
export type { BuilderEditor } from './use-builder-editor'
