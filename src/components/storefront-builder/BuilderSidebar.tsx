import { Fragment, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  LayoutList,
  Palette,
  Plus,
  Trash2,
  Type,
  Zap,
} from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'
import { findSection } from '../../lib/storefront-builder/catalog'
import { applyTemplate, newPageId } from '../../lib/storefront-builder/defaults'
import { TEMPLATES } from '../../lib/storefront-builder/templates'
import type { StorefrontPage } from '../../lib/api/types'
import type {
  BuilderEditor,
  BuilderRegion,
} from '../../lib/storefront-builder/use-builder-editor'
import { TemplatePreviewFrame } from './TemplatePreviewFrame'
import { AddSectionDialog } from './AddSectionDialog'

/**
 * The left rail of the visual builder.
 *
 * Four tabs — Structure, Pages, Theme, Motion — mirror the storefront kit. The
 * Structure tab lists the page's regions (header, hero, footer) and its sections;
 * a section can be dragged to reorder with a drop indicator, hidden, duplicated or
 * deleted. Theme holds the template gallery; Motion holds one-tap motion presets.
 */

type Tab = 'structure' | 'pages' | 'theme' | 'motion'

const TABS: { value: Tab; label: string; icon: typeof Type }[] = [
  { value: 'structure', label: 'Structure', icon: LayoutList },
  { value: 'pages', label: 'Pages', icon: FileText },
  { value: 'theme', label: 'Theme', icon: Palette },
  { value: 'motion', label: 'Motion', icon: Zap },
]

/** The tabs that map straight onto an inspector panel. Structure has no panel of
 * its own — it shows the per-region and per-section editors instead. */
const TAB_AS_PANEL: Tab[] = ['pages', 'theme', 'motion']

function activeTab(panel: BuilderEditor['panel']): Tab {
  return (TAB_AS_PANEL as string[]).includes(panel) ? (panel as Tab) : 'structure'
}

/**
 * Instant template switching. Selecting a template re-lays-out the working
 * configuration client-side, so the preview updates on the click with no
 * backend round-trip; the choice is persisted with the rest of the draft on save.
 */
function TemplatePicker({ editor }: { editor: BuilderEditor }) {
  return (
    <div className="grid gap-[0.4rem] p-[0.6rem]">
      <p className="eyebrow px-[0.2rem]">Template</p>
      <p className="px-[0.2rem] text-caption text-subtle">
        Switching changes the design only — your content, images and booking stay.
      </p>
      <ul className="grid gap-[0.5rem]">
        {TEMPLATES.map((template) => {
          const active = template.id === editor.config.templateId
          return (
            <li key={template.id}>
              <button
                type="button"
                className={cn('sfb-template-pick', active && 'is-active')}
                aria-pressed={active}
                onClick={() => editor.update((current) => applyTemplate(current, template.id, true))}
              >
                <TemplatePreviewFrame template={template} className="sfb-template-pick-shot" />
                <span className="sfb-template-pick-meta">
                  <span className="text-meta font-medium">{template.name}</span>
                  <span className="text-caption text-subtle">{template.category}</span>
                </span>
                {active ? <Check className="size-4 shrink-0 text-success" aria-hidden="true" /> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RegionRow({
  editor,
  region,
  label,
  icon: Icon,
}: {
  editor: BuilderEditor
  region: BuilderRegion
  label: string
  icon: typeof Type
}) {
  const active = editor.panel === region
  return (
    <li>
      <button
        type="button"
        className={cn('sfb-section-row', active && 'is-selected')}
        aria-current={active ? 'true' : undefined}
        onClick={() => editor.openRegion(region)}
      >
        <Icon className="sfb-section-grip size-4" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-meta font-medium">{label}</span>
      </button>
    </li>
  )
}

function StructurePanel({
  editor,
  can,
}: {
  editor: BuilderEditor
  can: (capability: string) => boolean
}) {
  const { config } = editor
  const [adding, setAdding] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [gap, setGap] = useState<number | null>(null)
  // The dragged id is also kept in a ref: the drop handler must see it even if a
  // re-render from the drag-over hasn't landed yet.
  const dragRef = useRef<string | null>(null)

  const finishDrag = () => {
    dragRef.current = null
    setDragId(null)
    setGap(null)
  }

  return (
    <div className="grid gap-[0.3rem] p-[0.6rem]">
      <p className="eyebrow px-[0.2rem]">Page</p>
      <ul className="grid gap-[0.15rem]">
        <RegionRow editor={editor} region="header" label="Header" icon={LayoutList} />
        <RegionRow editor={editor} region="hero" label="Hero" icon={Type} />
      </ul>

      <p className="eyebrow mt-[0.2rem] px-[0.2rem]">Sections</p>
      {config.sections.length === 0 ? (
        <p className="px-[0.2rem] text-caption text-subtle">No sections yet. Add one below.</p>
      ) : null}

      <ul
        className="grid gap-[0.15rem]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const id = dragRef.current ?? dragId
          if (id && gap !== null) editor.moveSectionTo(id, gap)
          finishDrag()
        }}
      >
        {config.sections.map((section, index) => {
          const def = findSection(section.key)
          const selected = editor.selectedSectionId === section.id
          const allowed = !def?.capability || can(def.capability)
          return (
            <Fragment key={section.id}>
              {gap === index ? <li className="sfb-drop-indicator" data-testid="drop-indicator" aria-hidden="true" /> : null}
              <li
                className={cn(
                  'sfb-section-row',
                  selected && 'is-selected',
                  !section.enabled && 'is-off',
                  dragId === section.id && 'is-dragging',
                )}
                draggable
                data-testid={`section-row-${section.key}`}
                onDragStart={() => { dragRef.current = section.id; setDragId(section.id) }}
                onDragEnd={finishDrag}
                onDragOver={(event) => {
                  event.preventDefault()
                  const rect = event.currentTarget.getBoundingClientRect()
                  const after = event.clientY - rect.top > rect.height / 2
                  setGap(index + (after ? 1 : 0))
                }}
                onClick={() => editor.select(section.id)}
              >
                <GripVertical className="sfb-section-grip size-4" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta font-medium">
                    {section.title || def?.label || section.key}
                  </span>
                  <span className="block truncate text-caption text-subtle">
                    {def?.label ?? section.key} · {section.variant}
                    {allowed ? '' : ' · hidden by plan'}
                  </span>
                </span>
                <span className="flex items-center gap-[0.1rem]">
                  <button type="button" className="btn-icon" aria-label="Move up" disabled={index === 0}
                    onClick={(event) => { event.stopPropagation(); editor.moveSection(section.id, -1) }}>
                    <ChevronUp className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-icon" aria-label="Move down" disabled={index === config.sections.length - 1}
                    onClick={(event) => { event.stopPropagation(); editor.moveSection(section.id, 1) }}>
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-icon" aria-label={section.enabled ? 'Hide section' : 'Show section'}
                    onClick={(event) => { event.stopPropagation(); editor.toggleSection(section.id) }}>
                    {section.enabled ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                  </button>
                  <button type="button" className="btn-icon" aria-label="Duplicate section"
                    onClick={(event) => { event.stopPropagation(); editor.duplicateSection(section.id) }}>
                    <Copy className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-icon" aria-label="Delete section"
                    onClick={(event) => { event.stopPropagation(); editor.removeSection(section.id) }}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            </Fragment>
          )
        })}
        {gap === config.sections.length ? <li className="sfb-drop-indicator" data-testid="drop-indicator" aria-hidden="true" /> : null}
      </ul>

      <Button size="sm" onClick={() => setAdding(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Add section
      </Button>

      <ul className="mt-[0.2rem] grid gap-[0.15rem]">
        <RegionRow editor={editor} region="footer" label="Footer" icon={LayoutList} />
        <RegionRow editor={editor} region="seo" label="SEO & sharing" icon={Type} />
      </ul>

      <AddSectionDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(key, variant) => {
          editor.addSection(key, undefined, variant)
          setAdding(false)
        }}
      />
    </div>
  )
}

const PAGE_KINDS = [
  { value: 'custom', label: 'Custom page' },
  { value: 'services', label: 'Services' },
  { value: 'about', label: 'About' },
  { value: 'contact', label: 'Contact' },
  { value: 'team', label: 'Team' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'booking', label: 'Booking' },
]

function PagesPanel({ editor }: { editor: BuilderEditor }) {
  const pages = [...editor.config.pages].sort((a, b) => a.order - b.order)
  const setPages = (next: StorefrontPage[]) =>
    editor.update((current) => ({
      ...current,
      pages: next.map((page, index) => ({ ...page, order: index * 10 })),
    }))

  return (
    <div className="grid gap-[0.5rem] p-[0.6rem]">
      <p className="eyebrow px-[0.2rem]">Pages</p>
      <p className="px-[0.2rem] text-caption text-subtle">
        Each page carries its own hero and sections once a design template is applied. The home page
        uses the storefront-wide hero and sections.
      </p>

      {pages.map((page, index) => (
        <div key={page.id} className="grid gap-[0.4rem] rounded-md border border-line p-[0.6rem]">
          <div className="flex items-center justify-between gap-[0.4rem]">
            <span className="text-caption font-semibold text-subtle">
              {page.kind === 'home' ? 'Home (always first)' : `Position ${index + 1}`}
            </span>
            <span className="flex items-center gap-[0.1rem]">
              <Button size="icon" aria-label={`Move ${page.title} up`} disabled={index === 0}
                onClick={() => { const next = [...pages]; const [m] = next.splice(index, 1); next.splice(index - 1, 0, m); setPages(next) }}>
                ↑
              </Button>
              <Button size="icon" aria-label={`Move ${page.title} down`} disabled={index === pages.length - 1}
                onClick={() => { const next = [...pages]; const [m] = next.splice(index, 1); next.splice(index + 1, 0, m); setPages(next) }}>
                ↓
              </Button>
              <Button size="icon" aria-label={`Delete ${page.title}`} disabled={page.kind === 'home'}
                onClick={() => setPages(pages.filter((p) => p.id !== page.id))}>
                ×
              </Button>
            </span>
          </div>
          <label className="grid gap-[0.2rem]">
            <span className="text-caption text-subtle">Title</span>
            <input
              className="rounded-md border border-line bg-bg px-[0.5rem] py-[0.35rem] text-meta"
              value={page.title}
              onChange={(event) => setPages(pages.map((p) => (p.id === page.id ? { ...p, title: event.target.value } : p)))}
            />
          </label>
          {page.kind !== 'home' ? (
            <label className="grid gap-[0.2rem]">
              <span className="text-caption text-subtle">Page type</span>
              <select
                className="rounded-md border border-line bg-bg px-[0.5rem] py-[0.35rem] text-meta"
                value={page.kind}
                onChange={(event) => setPages(pages.map((p) => (p.id === page.id ? { ...p, kind: event.target.value } : p)))}
              >
                {PAGE_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>{kind.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-[0.4rem] text-meta">
            <input
              type="checkbox"
              checked={page.showInNav}
              onChange={(event) => setPages(pages.map((p) => (p.id === page.id ? { ...p, showInNav: event.target.checked } : p)))}
            />
            Show in navigation
          </label>
        </div>
      ))}

      <Button size="sm" onClick={() => setPages([...pages, {
        id: newPageId(), title: 'New page', slug: 'new-page', kind: 'custom',
        showInNav: true, order: pages.length * 10, seoTitle: null, seoDescription: null,
        hero: null, sections: null,
      }])}>
        <Plus className="size-4" aria-hidden="true" />
        Add page
      </Button>
    </div>
  )
}

/** One-tap motion presets — each writes straight to the theme's motion tokens. */
const MOTION_PRESETS = [
  { id: 'none', label: 'None', hint: 'No entrance or hover motion.', animation: 'none', durationMs: 200, hoverEffect: 'none', pageTransition: 'none' },
  { id: 'calm', label: 'Calm', hint: 'Soft fades only.', animation: 'fade', durationMs: 500, hoverEffect: 'none', pageTransition: 'fade' },
  { id: 'standard', label: 'Standard', hint: 'Slides up on scroll, lifts on hover.', animation: 'up', durationMs: 600, hoverEffect: 'lift', pageTransition: 'fade' },
  { id: 'lively', label: 'Lively', hint: 'Zoom entrances and hover, sliding page changes.', animation: 'zoom', durationMs: 750, hoverEffect: 'zoom', pageTransition: 'slide' },
] as const

function MotionPanel({ editor }: { editor: BuilderEditor }) {
  const theme = editor.config.theme
  const patch = (next: Partial<typeof theme>) =>
    editor.update((current) => ({ ...current, theme: { ...current.theme, ...next } }))

  return (
    <div className="grid gap-[0.5rem] p-[0.6rem]">
      <p className="eyebrow px-[0.2rem]">Motion</p>
      <p className="px-[0.2rem] text-caption text-subtle">
        A preset sets the whole storefront's motion. Fine-tune each value in the Motion panel on the
        right, or override a single section from its own Motion sub-tab.
      </p>
      <ul className="grid gap-[0.4rem]">
        {MOTION_PRESETS.map((preset) => {
          const active =
            theme.animation === preset.animation &&
            theme.hoverEffect === preset.hoverEffect &&
            theme.pageTransition === preset.pageTransition
          return (
            <li key={preset.id}>
              <button
                type="button"
                className={cn('sfb-add-item', active && 'is-active')}
                aria-pressed={active}
                onClick={() =>
                  patch({
                    animation: preset.animation,
                    durationMs: preset.durationMs,
                    hoverEffect: preset.hoverEffect,
                    pageTransition: preset.pageTransition,
                  })
                }
              >
                <span className="min-w-0">
                  <span className="block text-meta font-medium">{preset.label}</span>
                  <span className="block truncate text-caption text-subtle">{preset.hint}</span>
                </span>
                {active ? <Check className="size-4 shrink-0 text-success" aria-hidden="true" /> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function BuilderSidebar({
  editor,
  can,
}: {
  editor: BuilderEditor
  can: (capability: string) => boolean
}) {
  const tab = activeTab(editor.panel)

  return (
    <div className="sfb-pane sfb-pane-left grid gap-0">
      <nav className="sfb-tabs" role="tablist" aria-label="Builder panels">
        {TABS.map((item) => {
          const Icon = item.icon
          const active = tab === item.value
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`builder-tab-${item.value}`}
              onClick={() => editor.setPanel(item.value)}
              className={cn('sfb-tab', active && 'is-active')}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {tab === 'structure' ? <StructurePanel editor={editor} can={can} /> : null}
      {tab === 'pages' ? <PagesPanel editor={editor} /> : null}
      {tab === 'theme' ? <TemplatePicker editor={editor} /> : null}
      {tab === 'motion' ? <MotionPanel editor={editor} /> : null}
    </div>
  )
}
