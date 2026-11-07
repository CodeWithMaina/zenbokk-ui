import { useState } from 'react'
import { Field, Input, Select, Textarea } from '../ui/field'
import { Switch } from '../ui/switch'
import { Button } from '../ui/button'
import {
  ANIMATION_OPTIONS,
  BACKGROUND_STYLE_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  COLUMN_OPTIONS,
  CTA_STYLE_OPTIONS,
  DRAWER_OPTIONS,
  FONT_OPTIONS,
  FOOTER_VARIANTS,
  HEADER_CTA_TYPES,
  HEADER_VARIANTS,
  HERO_VARIANTS,
  HOVER_EFFECT_OPTIONS,
  IMAGE_RATIO_OPTIONS,
  LINK_EFFECT_OPTIONS,
  MODE_OPTIONS,
  PAGE_TRANSITION_OPTIONS,
  RADIUS_OPTIONS,
  SECTION_ALIGNMENT_OPTIONS,
  SECTION_ANIMATION_OPTIONS,
  SECTION_BACKGROUND_OPTIONS,
  SECTION_PADDING_OPTIONS,
  SHADOW_OPTIONS,
  SPACING_OPTIONS,
  findSection,
  normaliseFooterLayout,
  normaliseHeaderLayout,
  normaliseHeroLayout,
} from '../../lib/storefront-builder/catalog'
import type { StorefrontNavItem } from '../../lib/api/types'
import type { BuilderEditor } from '../../lib/storefront-builder/use-builder-editor'

/**
 * The context-sensitive properties panel. Whatever is selected on the left (a
 * panel, or a section in the preview) is what appears here — one control set at a
 * time, so an ordinary owner is never faced with the whole schema at once.
 */

function TextField({ label, value, onChange, hint, placeholder }: {
  label: string
  value: string | null
  onChange: (value: string) => void
  hint?: string
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <Input value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

function AreaField({ label, value, onChange, hint, rows = 3 }: {
  label: string
  value: string | null
  onChange: (value: string) => void
  hint?: string
  rows?: number
}) {
  return (
    <Field label={label} hint={hint}>
      <Textarea rows={rows} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

function SelectField({ label, value, options, onChange, hint }: {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select>
    </Field>
  )
}

function Toggle({ label, checked, onChange, hint }: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-[0.8rem] py-[0.3rem]">
      <span className="min-w-0">
        <span className="block text-meta font-medium">{label}</span>
        {hint ? <span className="block text-caption text-subtle">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} label={label} />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="sfb-token-row">
      <span className="text-meta">{label}</span>
      <span className="flex items-center gap-[0.4rem]">
        <input
          type="color"
          aria-label={`${label} colour`}
          className="sfb-color-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input className="w-[6.5rem]" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-[0.6rem] border-b border-line pb-[0.9rem] last:border-0 last:pb-0">
      <p className="eyebrow">{title}</p>
      {children}
    </section>
  )
}

/** A compact horizontal sub-tab bar for the inspector. */
function SubTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="sfb-subtabs" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          data-testid={`subtabs-${option.value}`}
          className={value === option.value ? 'is-active' : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function NumberField({ label, value, min, max, onChange, hint }: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-md border border-line bg-bg px-[0.5rem] py-[0.35rem] text-meta"
      />
    </Field>
  )
}

export function BuilderInspector({ editor, hasMediaLibrary }: { editor: BuilderEditor; hasMediaLibrary: boolean }) {
  const { config, panel } = editor

  return (
    <div className="sfb-pane sfb-pane-right grid content-start gap-[0.9rem] overflow-y-auto p-[0.9rem]" style={{ maxHeight: 'calc(100svh - 12rem)' }}>
      {panel === 'theme' ? <ThemePanel editor={editor} /> : null}
      {panel === 'motion' ? <MotionThemePanel editor={editor} /> : null}
      {panel === 'header' ? <HeaderPanel editor={editor} /> : null}
      {panel === 'hero' ? <HeroPanel editor={editor} /> : null}
      {panel === 'footer' ? <FooterPanel editor={editor} /> : null}
      {panel === 'seo' ? <SeoPanel editor={editor} /> : null}
      {panel === 'section' ? <SectionPanel editor={editor} /> : null}
      {panel === 'pages' ? (
        <Group title="Pages">
          <p className="text-caption text-subtle">
            Your pages are managed in the Pages tab on the left. Each page keeps its own hero and
            sections; the home page uses the storefront-wide pair below.
          </p>
        </Group>
      ) : null}
      {panel === 'structure' ? (
        <Group title="Structure">
          <p className="text-caption text-subtle">
            {hasMediaLibrary
              ? 'Pick a region or a section on the left to edit it, or open the Theme tab to restyle the whole storefront.'
              : 'Pick a region or a section on the left to edit it. Add images from the Gallery module to use them here.'}
          </p>
          <p className="text-meta text-muted">
            {config.sections.length} section{config.sections.length === 1 ? '' : 's'} · template “{config.templateId}”
          </p>
        </Group>
      ) : null}
    </div>
  )
}

// ── theme ────────────────────────────────────────────────────────────────────

function ThemePanel({ editor }: { editor: BuilderEditor }) {
  const theme = editor.config.theme
  const patch = (next: Partial<typeof theme>) =>
    editor.update((current) => ({ ...current, theme: { ...current.theme, ...next } }))

  return (
    <>
      <Group title="Branding">
        <ColorField label="Primary" value={theme.primary} onChange={(v) => patch({ primary: v })} />
        <ColorField label="Secondary" value={theme.secondary} onChange={(v) => patch({ secondary: v })} />
        <ColorField label="Accent" value={theme.accent} onChange={(v) => patch({ accent: v })} />
        <ColorField label="Background" value={theme.background} onChange={(v) => patch({ background: v })} />
        <ColorField label="Surface" value={theme.surface} onChange={(v) => patch({ surface: v })} />
        <ColorField label="Text" value={theme.text} onChange={(v) => patch({ text: v })} />
        <ColorField label="Muted text" value={theme.mutedText} onChange={(v) => patch({ mutedText: v })} />
        <ColorField label="Buttons" value={theme.buttonBackground} onChange={(v) => patch({ buttonBackground: v })} />
        <ColorField label="Button text" value={theme.buttonText} onChange={(v) => patch({ buttonText: v })} />
        <ColorField label="Borders" value={theme.border} onChange={(v) => patch({ border: v })} />
      </Group>

      <Group title="Typography">
        <SelectField label="Heading font" value={theme.headingFont} options={FONT_OPTIONS} onChange={(v) => patch({ headingFont: v })} />
        <SelectField label="Body font" value={theme.bodyFont} options={FONT_OPTIONS} onChange={(v) => patch({ bodyFont: v })} />
        <Field label={`Heading weight — ${theme.headingWeight}`}>
          <input type="range" min={300} max={800} step={100} value={theme.headingWeight}
            onChange={(event) => patch({ headingWeight: Number(event.target.value) })} />
        </Field>
        <Field label={`Body size — ${theme.baseFontSize}px`}>
          <input type="range" min={14} max={20} value={theme.baseFontSize}
            onChange={(event) => patch({ baseFontSize: Number(event.target.value) })} />
        </Field>
        <SelectField label="Heading scale" value={theme.headingScale}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'display', label: 'Display' },
            { value: 'editorial', label: 'Editorial' },
          ]}
          onChange={(v) => patch({ headingScale: v })} />
        <SelectField label="Line height" value={theme.lineHeight}
          options={[
            { value: 'tight', label: 'Tight' },
            { value: 'normal', label: 'Normal' },
            { value: 'relaxed', label: 'Relaxed' },
          ]}
          onChange={(v) => patch({ lineHeight: v })} />
        <SelectField label="Letter spacing" value={theme.letterSpacing}
          options={[
            { value: 'tight', label: 'Tight' },
            { value: 'normal', label: 'Normal' },
            { value: 'wide', label: 'Wide' },
          ]}
          onChange={(v) => patch({ letterSpacing: v })} />
      </Group>

      <Group title="Layout & buttons">
        <Field label={`Content width — ${theme.contentWidth}px`}>
          <input type="range" min={960} max={1440} step={20} value={theme.contentWidth}
            onChange={(event) => patch({ contentWidth: Number(event.target.value) })} />
        </Field>
        <SelectField label="Section spacing" value={theme.sectionSpacing} options={SPACING_OPTIONS} onChange={(v) => patch({ sectionSpacing: v })} />
        <SelectField label="Container padding" value={theme.containerPadding} options={SPACING_OPTIONS} onChange={(v) => patch({ containerPadding: v })} />
        <SelectField label="Corner radius" value={theme.radius} options={RADIUS_OPTIONS} onChange={(v) => patch({ radius: v })} />
        <SelectField label="Shadows" value={theme.shadow} options={SHADOW_OPTIONS} onChange={(v) => patch({ shadow: v })} />
        <SelectField label="Button style" value={theme.buttonStyle} options={BUTTON_STYLE_OPTIONS} onChange={(v) => patch({ buttonStyle: v })} />
        <SelectField label="Image ratio" value={theme.imageRatio} options={IMAGE_RATIO_OPTIONS} onChange={(v) => patch({ imageRatio: v })} />
      </Group>

      <Group title="Background">
        <SelectField label="Style" value={theme.backgroundStyle} options={BACKGROUND_STYLE_OPTIONS} onChange={(v) => patch({ backgroundStyle: v })} />
        {theme.backgroundStyle === 'gradient' ? (
          <>
            <ColorField label="Gradient from" value={theme.gradientFrom} onChange={(v) => patch({ gradientFrom: v })} />
            <ColorField label="Gradient to" value={theme.gradientTo} onChange={(v) => patch({ gradientTo: v })} />
          </>
        ) : null}
        {theme.backgroundStyle === 'image' ? (
          <p className="text-caption text-subtle">
            Upload a background image in the Gallery module, then pick it under the Hero panel.
          </p>
        ) : null}
      </Group>
    </>
  )
}

// ── header ───────────────────────────────────────────────────────────────────

type HeaderTab = 'design' | 'navigation' | 'mobile'
const HEADER_TABS = [
  { value: 'design' as const, label: 'Design' },
  { value: 'navigation' as const, label: 'Navigation' },
  { value: 'mobile' as const, label: 'Mobile menu' },
]

/** The independent header navigation, with dropdown-ready children. */
function NavItemsEditor({ editor }: { editor: BuilderEditor }) {
  const nav = editor.config.header.nav
  const pages = [...editor.config.pages].sort((a, b) => a.order - b.order)
  const patch = (items: StorefrontNavItem[]) =>
    editor.update((current) => ({ ...current, header: { ...current.header, nav: items } }))
  const setItem = (index: number, next: Partial<StorefrontNavItem>) =>
    patch(nav.map((item, i) => (i === index ? { ...item, ...next } : item)))

  return (
    <Group title="Navigation">
      {nav.length === 0 ? (
        <p className="text-caption text-subtle">
          With no custom navigation, the menu follows the pages flagged “Show in navigation”.
        </p>
      ) : null}
      {nav.map((item, index) => (
        <div key={index} className="grid gap-[0.35rem] rounded-md border border-line p-[0.5rem]">
          <div className="flex gap-[0.4rem]">
            <Input aria-label={`Nav label ${index + 1}`} value={item.label} placeholder="Label"
              onChange={(event) => setItem(index, { label: event.target.value })} />
            <Button size="icon" aria-label={`Remove nav item ${index + 1}`}
              onClick={() => patch(nav.filter((_, i) => i !== index))}>×</Button>
          </div>
          <div className="flex gap-[0.4rem]">
            <Select aria-label={`Nav destination ${index + 1}`} value={item.destination}
              onChange={(event) => setItem(index, { destination: event.target.value })}>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>{page.title}</option>
              ))}
              <option value="external">External link</option>
            </Select>
            {item.destination === 'external' ? (
              <Input aria-label={`Nav URL ${index + 1}`} value={item.url} placeholder="https://…"
                onChange={(event) => setItem(index, { url: event.target.value })} />
            ) : null}
          </div>
          <Toggle label="Visible" checked={item.enabled} onChange={(value) => setItem(index, { enabled: value })} />
        </div>
      ))}
      <Button size="sm" onClick={() => patch([...nav, { label: '', enabled: true, destination: 'external', url: '', children: [] }])}>
        Add link
      </Button>
    </Group>
  )
}

function HeaderPanel({ editor }: { editor: BuilderEditor }) {
  const [tab, setTab] = useState<HeaderTab>('design')
  const header = editor.config.header
  const patch = (next: Partial<typeof header>) =>
    editor.update((current) => ({ ...current, header: { ...current.header, ...next } }))

  return (
    <>
      <SubTabs label="Header settings" value={tab} options={HEADER_TABS} onChange={setTab} />

      {tab === 'design' ? (
        <>
          <Group title="Layout">
            <SelectField label="Header variant" value={normaliseHeaderLayout(header.variant)} options={HEADER_VARIANTS} onChange={(v) => patch({ variant: v })} />
            <SelectField label="Alignment" value={header.alignment}
              options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
              onChange={(v) => patch({ alignment: v })} />
            <SelectField label="Spacing" value={header.spacing} options={SPACING_OPTIONS} onChange={(v) => patch({ spacing: v })} />
            <NumberField label="Bar height (px)" min={6} max={40} value={header.height} onChange={(v) => patch({ height: v })} />
            <Toggle label="Sticky header" checked={header.sticky} onChange={(v) => patch({ sticky: v })} hint="Stays visible as the visitor scrolls." />
            <Toggle label="Transparent over hero" checked={header.transparent} onChange={(v) => patch({ transparent: v })} />
            <Toggle label="Drop shadow" checked={header.shadow} onChange={(v) => patch({ shadow: v })} />
            <Toggle label="Bottom border" checked={header.border} onChange={(v) => patch({ border: v })} />
          </Group>

          <Group title="Brand">
            <Toggle label="Show logo" checked={header.showLogo} onChange={(v) => patch({ showLogo: v })} hint="Uses the logo from your business profile." />
            <Toggle label="Show business name" checked={header.showBusinessName} onChange={(v) => patch({ showBusinessName: v })} />
            <SelectField label="Logo size" value={header.logoSize}
              options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
              onChange={(v) => patch({ logoSize: v })} />
          </Group>

          <Group title="Colours">
            <ColorField label="Background" value={header.background} onChange={(v) => patch({ background: v })} />
            <ColorField label="Text" value={header.textColor} onChange={(v) => patch({ textColor: v })} />
          </Group>
        </>
      ) : null}

      {tab === 'navigation' ? (
        <>
          <Group title="Links">
            <SelectField label="Link effect" value={header.linkEffect} options={LINK_EFFECT_OPTIONS} onChange={(v) => patch({ linkEffect: v })} />
            <Toggle label="Uppercase links" checked={header.uppercaseLinks} onChange={(v) => patch({ uppercaseLinks: v })} />
          </Group>
          <NavItemsEditor editor={editor} />
          <Group title="Call to action">
            <Toggle label="Show CTA button" checked={header.ctaEnabled} onChange={(v) => patch({ ctaEnabled: v })} />
            <TextField label="Button label" value={header.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
            <SelectField label="Destination" value={header.ctaType} options={HEADER_CTA_TYPES} onChange={(v) => patch({ ctaType: v })} />
            <SelectField label="CTA style" value={header.ctaStyle} options={CTA_STYLE_OPTIONS} onChange={(v) => patch({ ctaStyle: v })} />
          </Group>
          {header.variant === 'bar' ? (
            <Group title="Announcement bar">
              <TextField label="Message" value={header.announcement} onChange={(v) => patch({ announcement: v })} hint="Shown in the slim bar above the header." />
            </Group>
          ) : null}
          {header.variant === 'utility' ? (
            <Group title="Utility strip">
              <TextField label="Left cell" value={header.utilityLeft} onChange={(v) => patch({ utilityLeft: v })} />
              <TextField label="Right cell" value={header.utilityRight} onChange={(v) => patch({ utilityRight: v })} />
            </Group>
          ) : null}
        </>
      ) : null}

      {tab === 'mobile' ? (
        <Group title="Mobile menu">
          <SelectField label="Slides in from" value={header.drawer} options={DRAWER_OPTIONS} onChange={(v) => patch({ drawer: v })} />
          <SelectField label="Presentation" value={header.mobileStyle}
            options={[{ value: 'drawer', label: 'Slide-in drawer' }, { value: 'fullscreen', label: 'Full screen' }]}
            onChange={(v) => patch({ mobileStyle: v })} />
          <Toggle label="Show contact details" checked={header.showContactInDrawer} onChange={(v) => patch({ showContactInDrawer: v })} hint="Shows your phone, address and CTA inside the menu." />
        </Group>
      ) : null}
    </>
  )
}

// ── hero ─────────────────────────────────────────────────────────────────────

const HERO_TABS = [
  { value: 'content' as const, label: 'Content' },
  { value: 'design' as const, label: 'Design' },
  { value: 'motion' as const, label: 'Motion' },
]

function HeroPanel({ editor }: { editor: BuilderEditor }) {
  const [tab, setTab] = useState<'content' | 'design' | 'motion'>('content')
  const hero = editor.config.hero
  const patch = (next: Partial<typeof hero>) =>
    editor.update((current) => ({ ...current, hero: { ...current.hero, ...next } }))

  return (
    <>
      <SubTabs label="Hero settings" value={tab} options={HERO_TABS} onChange={setTab} />

      <div hidden={tab !== 'design'}>
        <Group title="Layout">
          <SelectField label="Hero variant" value={normaliseHeroLayout(hero.variant)} options={HERO_VARIANTS} onChange={(v) => patch({ variant: v })} />
          <Toggle label="Show hero" checked={hero.enabled} onChange={(v) => patch({ enabled: v })} />
          <SelectField label="Height" value={hero.height}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'standard', label: 'Standard' },
              { value: 'tall', label: 'Tall' },
              { value: 'screen', label: 'Full screen' },
            ]}
            onChange={(v) => patch({ height: v })} />
          <SelectField label="Text alignment" value={hero.textAlign}
            options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
            onChange={(v) => patch({ textAlign: v })} />
          <SelectField label="Mobile layout" value={hero.mobileLayout}
            options={[{ value: 'stack', label: 'Stacked' }, { value: 'image-first', label: 'Image first' }, { value: 'text-first', label: 'Text first' }]}
            onChange={(v) => patch({ mobileLayout: v })} />
        </Group>
      </div>

      <div hidden={tab !== 'content'}>
        <Group title="Content">
          <TextField label="Eyebrow" value={hero.eyebrow} onChange={(v) => patch({ eyebrow: v })} hint="Small label above the heading." />
          <TextField label="Heading" value={hero.heading} onChange={(v) => patch({ heading: v })} hint="Leave blank to use your business name." />
          <TextField label="Subheading" value={hero.subheading} onChange={(v) => patch({ subheading: v })} />
          <AreaField label="Description" value={hero.description} onChange={(v) => patch({ description: v })} />
          <Toggle label="Show logo in hero" checked={hero.showLogo} onChange={(v) => patch({ showLogo: v })} />
          <Toggle label="Show business facts" checked={hero.showFacts} onChange={(v) => patch({ showFacts: v })} hint="Location, category and phone." />
        </Group>
      </div>

      <div hidden={tab !== 'content'}>
        <Group title="Actions">
          <TextField label="Primary button" value={hero.primaryCtaLabel} onChange={(v) => patch({ primaryCtaLabel: v })} />
          <SelectField label="Primary destination" value={hero.primaryCtaType} options={HEADER_CTA_TYPES} onChange={(v) => patch({ primaryCtaType: v })} />
          <TextField label="Secondary button" value={hero.secondaryCtaLabel} onChange={(v) => patch({ secondaryCtaLabel: v })} />
          <SelectField label="Secondary destination" value={hero.secondaryCtaType} options={HEADER_CTA_TYPES} onChange={(v) => patch({ secondaryCtaType: v })} />
        </Group>
      </div>

      <div hidden={tab !== 'design'}>
        <Group title="Background">
          <ColorField label="Background colour" value={hero.backgroundColor} onChange={(v) => patch({ backgroundColor: v })} />
          <Field label={`Overlay — ${hero.overlayOpacity}%`}>
            <input type="range" min={0} max={100} step={5} value={hero.overlayOpacity}
              onChange={(event) => patch({ overlayOpacity: Number(event.target.value) })} />
          </Field>
          <SelectField label="Image position" value={hero.imagePosition}
            options={[
              { value: 'center', label: 'Center' },
              { value: 'top', label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
            ]}
            onChange={(v) => patch({ imagePosition: v })} />
          {hero.variant === 'video' ? (
            <TextField
              label="Background video URL"
              value={hero.videoUrl}
              onChange={(v) => patch({ videoUrl: v || null })}
              hint="A direct MP4 or WebM link. Leave blank to use the hero image instead."
            />
          ) : null}
          <p className="text-caption text-subtle">
            The hero image is your storefront cover — pick one with the Media button in the toolbar.
          </p>
        </Group>
      </div>

      <div hidden={tab !== 'motion'}>
        <Group title="Entrance">
          <SelectField label="Animation" value={hero.animation} options={SECTION_ANIMATION_OPTIONS} onChange={(v) => patch({ animation: v })} hint="Inherit uses the storefront's motion settings." />
        </Group>
      </div>
    </>
  )
}

// ── footer ───────────────────────────────────────────────────────────────────

const FOOTER_TABS = [
  { value: 'content' as const, label: 'Content' },
  { value: 'design' as const, label: 'Design' },
]

function FooterPanel({ editor }: { editor: BuilderEditor }) {
  const [tab, setTab] = useState<'content' | 'design'>('content')
  const footer = editor.config.footer
  const patch = (next: Partial<typeof footer>) =>
    editor.update((current) => ({ ...current, footer: { ...current.footer, ...next } }))

  return (
    <>
      <SubTabs label="Footer settings" value={tab} options={FOOTER_TABS} onChange={setTab} />

      <div hidden={tab !== 'design'}>
        <Group title="Layout">
          <SelectField label="Footer variant" value={normaliseFooterLayout(footer.variant)} options={FOOTER_VARIANTS} onChange={(v) => patch({ variant: v })} />
          <ColorField label="Background" value={footer.backgroundColor} onChange={(v) => patch({ backgroundColor: v })} />
          <ColorField label="Text" value={footer.textColor} onChange={(v) => patch({ textColor: v })} />
          <NumberField label="Vertical padding (px)" min={24} max={120} value={footer.padding} onChange={(v) => patch({ padding: v })} />
          <Toggle label="Oversized wordmark" checked={footer.showWordmark} onChange={(v) => patch({ showWordmark: v })} hint="Draws your business name at display size." />
        </Group>

        {footer.variant === 'newsletter' || footer.variant === 'split' ? (
          <Group title="Newsletter">
            <TextField label="Headline" value={footer.newsletterHeadline} onChange={(v) => patch({ newsletterHeadline: v })} />
            <TextField label="Input placeholder" value={footer.newsletterPlaceholder} onChange={(v) => patch({ newsletterPlaceholder: v })} />
            <TextField label="Button label" value={footer.newsletterButtonLabel} onChange={(v) => patch({ newsletterButtonLabel: v })} />
          </Group>
        ) : null}
      </div>

      <div hidden={tab !== 'content'}>
        <Group title="Content">
          <Toggle label="Show logo" checked={footer.showLogo} onChange={(v) => patch({ showLogo: v })} />
          <AreaField label="Description" value={footer.description} onChange={(v) => patch({ description: v })} hint="Leave blank to use your business description." />
          <TextField label="Copyright" value={footer.copyright} onChange={(v) => patch({ copyright: v })} hint="Leave blank for an automatic copyright line." />
        </Group>

        <Group title="Blocks">
          <Toggle label="Contact details" checked={footer.showContact} onChange={(v) => patch({ showContact: v })} />
          <Toggle label="Address" checked={footer.showAddress} onChange={(v) => patch({ showAddress: v })} />
          <Toggle label="Opening hours" checked={footer.showHours} onChange={(v) => patch({ showHours: v })} />
          <Toggle label="Navigation" checked={footer.showNav} onChange={(v) => patch({ showNav: v })} />
          <Toggle label="Social links" checked={footer.showSocial} onChange={(v) => patch({ showSocial: v })} />
          <Toggle label="Legal line" checked={footer.showLegal} onChange={(v) => patch({ showLegal: v })} />
        </Group>
      </div>

      <Group title="Social links">
        {footer.socials.length === 0 ? (
          <p className="text-caption text-subtle">No social links yet.</p>
        ) : null}
        {footer.socials.map((social, index) => (
          <div key={`${social.platform}-${index}`} className="grid gap-[0.3rem]">
            <div className="flex gap-[0.4rem]">
              <Input
                aria-label="Platform"
                placeholder="Instagram"
                value={social.platform}
                onChange={(event) =>
                  patch({ socials: footer.socials.map((s, i) => (i === index ? { ...s, platform: event.target.value } : s)) })
                }
              />
              <Input
                aria-label="URL"
                placeholder="https://…"
                value={social.url}
                onChange={(event) =>
                  patch({ socials: footer.socials.map((s, i) => (i === index ? { ...s, url: event.target.value } : s)) })
                }
              />
              <Button
                size="icon"
                aria-label="Remove link"
                onClick={() => patch({ socials: footer.socials.filter((_, i) => i !== index) })}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
        <Button size="sm" onClick={() => patch({ socials: [...footer.socials, { platform: '', url: '' }] })}>
          Add social link
        </Button>
      </Group>
    </>
  )
}

// ── motion ───────────────────────────────────────────────────────────────────

function MotionThemePanel({ editor }: { editor: BuilderEditor }) {
  const theme = editor.config.theme
  const patch = (next: Partial<typeof theme>) =>
    editor.update((current) => ({ ...current, theme: { ...current.theme, ...next } }))

  return (
    <>
      <Group title="Presentation">
        <SelectField label="Mode" value={theme.mode} options={MODE_OPTIONS} onChange={(v) => patch({ mode: v })} hint="The storefront's own light or dark presentation." />
        <SelectField label="Corner radius" value={theme.radius} options={RADIUS_OPTIONS} onChange={(v) => patch({ radius: v })} />
      </Group>

      <Group title="Motion">
        <SelectField label="Section entrance" value={theme.animation} options={ANIMATION_OPTIONS} onChange={(v) => patch({ animation: v })} />
        <NumberField label="Duration (ms)" min={200} max={1500} value={theme.durationMs} onChange={(v) => patch({ durationMs: v })} hint="How long an entrance takes, 200–1500ms." />
        <SelectField label="Hover effect" value={theme.hoverEffect} options={HOVER_EFFECT_OPTIONS} onChange={(v) => patch({ hoverEffect: v })} />
        <SelectField label="Page transition" value={theme.pageTransition} options={PAGE_TRANSITION_OPTIONS} onChange={(v) => patch({ pageTransition: v })} />
      </Group>
    </>
  )
}

// ── seo ──────────────────────────────────────────────────────────────────────

function SeoPanel({ editor }: { editor: BuilderEditor }) {
  const seo = editor.config.seo
  const patch = (next: Partial<typeof seo>) =>
    editor.update((current) => ({ ...current, seo: { ...current.seo, ...next } }))

  return (
    <Group title="Search & sharing">
      <TextField label="Page title" value={seo.title} onChange={(v) => patch({ title: v })} hint="Up to 70 characters." />
      <AreaField label="Meta description" value={seo.description} onChange={(v) => patch({ description: v })} hint="Up to 200 characters." />
      <TextField label="Open Graph title" value={seo.ogTitle} onChange={(v) => patch({ ogTitle: v })} />
      <AreaField label="Open Graph description" value={seo.ogDescription} onChange={(v) => patch({ ogDescription: v })} />
      <TextField label="Keywords" value={seo.keywords} onChange={(v) => patch({ keywords: v })} hint="Comma separated." />
      <p className="text-caption text-subtle">
        Your canonical URL, structured business data and a sitemap are generated automatically from your
        business profile and published pages.
      </p>
    </Group>
  )
}

// ── section ──────────────────────────────────────────────────────────────────

const SECTION_TABS = [
  { value: 'content' as const, label: 'Content' },
  { value: 'layout' as const, label: 'Layout' },
  { value: 'motion' as const, label: 'Motion' },
]

function SectionPanel({ editor }: { editor: BuilderEditor }) {
  const [tab, setTab] = useState<'content' | 'layout' | 'motion'>('content')
  const section = editor.config.sections.find((s) => s.id === editor.selectedSectionId)
  if (!section) {
    return <p className="text-meta text-muted">Select a section to edit it.</p>
  }
  const def = findSection(section.key)
  const setting = (key: string) => section.settings[key] ?? ''
  const setSetting = (key: string, value: string) =>
    editor.patchSection(section.id, { settings: { ...section.settings, [key]: value } })

  return (
    <>
      <SubTabs label="Section settings" value={tab} options={SECTION_TABS} onChange={setTab} />

      <div hidden={tab !== 'layout'}>
        <Group title="Layout">
          <SelectField
            label="Design variant"
            value={section.variant}
            options={def?.variants ?? [{ value: section.variant, label: section.variant }]}
            onChange={(v) => editor.setSectionVariant(section.id, v)}
          />
          <SelectField label="Background" value={section.background} options={SECTION_BACKGROUND_OPTIONS} onChange={(v) => editor.patchSection(section.id, { background: v })} />
          <SelectField label="Padding" value={section.padding} options={SECTION_PADDING_OPTIONS} onChange={(v) => editor.patchSection(section.id, { padding: v })} />
          <SelectField label="Alignment" value={section.alignment} options={SECTION_ALIGNMENT_OPTIONS} onChange={(v) => editor.patchSection(section.id, { alignment: v })} />
          <SelectField label="Columns" value={String(section.columns)} options={COLUMN_OPTIONS} onChange={(v) => editor.patchSection(section.id, { columns: Number(v) })} />
        </Group>
      </div>

      <div hidden={tab !== 'content'}>
        <Group title={def?.label ?? section.key}>
          <TextField label="Heading" value={section.title} onChange={(v) => editor.patchSection(section.id, { title: v })} />
          <AreaField label="Description" value={section.description} onChange={(v) => editor.patchSection(section.id, { description: v })} />
          <Toggle label="Visible" checked={section.enabled} onChange={() => editor.toggleSection(section.id)} />
        </Group>

      {section.key === 'stats' || section.key === 'faq' || section.key === 'promotions' || section.key === 'social' ? (
        <Group title="Items">
          <AreaField
            label="Items"
            rows={5}
            value={setting('items')}
            onChange={(v) => setSetting('items', v)}
            hint={
              section.key === 'faq'
                ? 'One per line: Question | Answer'
                : section.key === 'social'
                  ? 'One per line: Label | https://url'
                  : 'One per line: Value | Label'
            }
          />
        </Group>
      ) : null}

      {section.key === 'about' ? (
        <Group title="About content">
          <AreaField label="Story" rows={4} value={setting('body')} onChange={(v) => setSetting('body', v)}
            hint="Leave blank to use your business description." />
          <TextField label="Mission" value={setting('mission')} onChange={(v) => setSetting('mission', v)} />
        </Group>
      ) : null}

      {section.key === 'booking' ? (
        <Group title="Booking">
          <TextField label="Button label" value={setting('ctaLabel')} onChange={(v) => setSetting('ctaLabel', v)}
            hint="Links to your booking flow." />
        </Group>
      ) : null}

      {section.key === 'contact' ? (
        <Group title="Contact">
          <TextField label="Extra note" value={setting('note')} onChange={(v) => setSetting('note', v)} />
        </Group>
      ) : null}

      {section.key === 'richtext' ? (
        <Group title="Text">
          <AreaField label="Body" rows={5} value={setting('body')} onChange={(v) => setSetting('body', v)} />
          <TextField label="Image URL" value={setting('imageUrl')} onChange={(v) => setSetting('imageUrl', v)} hint="Optional." />
        </Group>
      ) : null}

      {section.key === 'announcement' ? (
        <Group title="Announcement">
          <TextField label="Message" value={setting('message')} onChange={(v) => setSetting('message', v)} />
        </Group>
      ) : null}

      {section.key === 'embed' ? (
        <Group title="Embed">
          <AreaField label="HTML" rows={5} value={setting('html')} onChange={(v) => setSetting('html', v)}
            hint="Rendered in a sandboxed frame — scripts cannot reach your site." />
        </Group>
      ) : null}
      </div>

      <div hidden={tab !== 'motion'}>
        <Group title="Entrance">
          <SelectField label="Animation" value={section.animation} options={SECTION_ANIMATION_OPTIONS} onChange={(v) => editor.patchSection(section.id, { animation: v })} hint="Inherit uses the storefront's motion settings." />
        </Group>
      </div>
    </>
  )
}
