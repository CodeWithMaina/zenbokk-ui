import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Eye,
  History,
  ImagePlus,
  Monitor,
  Moon,
  Redo2,
  Rocket,
  RotateCcw,
  Save,
  Smartphone,
  Sun,
  Tablet,
  Undo2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { SegmentedControl } from '../components/ui/segmented-control'
import {
  BuilderInspector,
  BuilderPreview,
  BuilderSidebar,
  MediaLibraryDialog,
  RevisionHistoryPanel,
  toPreviewProfile,
  useEditorCapabilities,
} from '../components/storefront-builder'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import type { CapabilityKey } from '../lib/entitlements'
import { MODULE } from '../lib/entitlements'
import { formatDateTime } from '../lib/format'
import type { StorefrontRevision } from '../lib/api/types'
import {
  mergeConfig,
  useBuilderEditor,
  usePublishStorefront,
  useResetStorefrontDraft,
  useRestoreStorefrontRevision,
  useSaveStorefrontDraft,
  useStorefrontBuilder,
  useStorefrontRevision,
} from '../lib/storefront-builder'

export const Route = createFileRoute('/dashboard/storefront/builder')({
  component: StorefrontBuilderPage,
})

type Device = 'desktop' | 'tablet' | 'mobile'

export function StorefrontBuilderPage() {
  const { business, hasModule } = useDashboardContext()
  const enabled = hasModule(MODULE.storefront)

  const builder = useStorefrontBuilder(enabled)
  const [device, setDevice] = useState<Device>('desktop')

  const draftConfig = useMemo(
    () => (builder.data ? mergeConfig(builder.data.draft) : null),
    [builder.data],
  )
  const editor = useBuilderEditor(draftConfig ?? mergeConfig(null))

  const save = useSaveStorefrontDraft(business.id)
  const publish = usePublishStorefront(business.id)
  const reset = useResetStorefrontDraft(business.id)
  const restore = useRestoreStorefrontRevision(business.id)

  // Version history: the panel, and the +historical preview+ it can open. The
  // preview is a separate piece of state from the editor, so looking at an old
  // version can never touch the draft being edited.
  const [historyOpen, setHistoryOpen] = useState(false)
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(null)
  const [mediaOpen, setMediaOpen] = useState(false)
  const previewRevision = useStorefrontRevision(previewRevisionId)

  // The draft version the editor last saw. Echoed to the API on save / publish /
  // restore so a concurrent write is refused instead of silently overwritten.
  const draftVersionRef = useRef(0)
  useEffect(() => {
    if (builder.data) draftVersionRef.current = builder.data.draftVersion
  }, [builder.data])

  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedConfigRef = useRef<string>('')

  const { can } = useEditorCapabilities(hasModule, business)
  const previewProfile = useMemo(() => toPreviewProfile(business, can), [business, can])

  // Autosave on config changes with debounce (3 seconds)
  useEffect(() => {
    if (!editor.dirty) {
      setAutosaveStatus('idle')
      return
    }

    // Cancel previous timeout
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)

    setAutosaveStatus('saving')
    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        const configStr = JSON.stringify(editor.config)
        if (configStr === lastSavedConfigRef.current) {
          setAutosaveStatus('idle')
          return
        }

        const next = await save.mutateAsync({
          config: editor.config,
          expectedVersion: draftVersionRef.current,
        })
        if (next?.draft) {
          editor.markSaved(mergeConfig(next.draft))
          draftVersionRef.current = next.draftVersion
          lastSavedConfigRef.current = JSON.stringify(next.draft)
          setAutosaveStatus('idle')
        }
      } catch (error) {
        console.error('Autosave failed:', error)
        setAutosaveStatus('error')
        // Will retry on next change
      }
    }, 3000)

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
    }
  }, [editor.config, editor.dirty, save])

  // Warn before losing unsaved draft edits on a hard navigation.
  useEffect(() => {
    if (!editor.dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [editor.dirty])

  const saving = save.isPending || publish.isPending

  async function onSaveDraft() {
    const next = await save.mutateAsync({
      config: editor.config,
      expectedVersion: draftVersionRef.current,
    })
    if (next?.draft) {
      draftVersionRef.current = next.draftVersion
      editor.markSaved(mergeConfig(next.draft))
    }
  }

  async function onPublish() {
    const next = await publish.mutateAsync({
      config: editor.config,
      expectedVersion: draftVersionRef.current,
    })
    if (next?.draft) {
      draftVersionRef.current = next.draftVersion
      editor.markSaved(mergeConfig(next.draft))
    }
  }

  async function onReset() {
    const next = await reset.mutateAsync()
    if (next?.draft) {
      draftVersionRef.current = next.draftVersion
      editor.markSaved(mergeConfig(next.draft))
    }
  }

  /**
   * Restore a historical version into the draft.
   *
   * The live storefront is not touched — that still needs an explicit publish —
   * and a failure leaves the editor exactly as it was. Resolves `false` so the
   * confirmation dialog can report the problem without closing.
   */
  async function onRestoreRevision(revision: StorefrontRevision): Promise<boolean> {
    try {
      const result = await restore.mutateAsync({
        revisionId: revision.id,
        expectedVersion: draftVersionRef.current,
      })
      draftVersionRef.current = result.state.draftVersion
      editor.update(() => mergeConfig(result.state.draft))
      setPreviewRevisionId(null)
      return true
    } catch {
      // The mutation's own onError has already surfaced the reason.
      return false
    }
  }

  // A historical preview is read-only: it swaps the *rendered* configuration and
  // never the editor's draft.
  const previewConfig = useMemo(
    () =>
      previewRevisionId && previewRevision.data
        ? mergeConfig(previewRevision.data.configuration)
        : editor.config,
    [previewRevisionId, previewRevision.data, editor.config],
  )

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Storefront editor" description="Build your public page." />
        <Card className="p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">Storefront module not enabled</h2>
          <p className="mt-[0.25rem] text-meta text-muted">
            The editor is part of the Storefront module. Upgrade to build your page.
          </p>
          <Link to="/dashboard/settings" className="btn btn-primary mt-[0.8rem] no-underline">
            View plans
          </Link>
        </Card>
      </div>
    )
  }

  if (builder.isLoading || !draftConfig) {
    return (
      <div>
        <PageHeader title="Storefront editor" description="Build your public page." />
        <div className="grid gap-[1rem] lg:grid-cols-[17rem_minmax(0,1fr)_20rem]">
          <Card className="h-[30rem] animate-pulse" />
          <Card className="h-[30rem] animate-pulse" />
          <Card className="h-[30rem] animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Storefront editor"
        description="Drag, restyle and preview your page. Changes are saved as a draft until you publish."
        actions={
          <div className="sfb-toolbar">
            <SegmentedControl<Device>
              label="Preview size"
              value={device}
              onValueChange={setDevice}
              options={[
                { value: 'desktop', label: <Monitor className="size-4" aria-hidden="true" /> },
                { value: 'tablet', label: <Tablet className="size-4" aria-hidden="true" /> },
                { value: 'mobile', label: <Smartphone className="size-4" aria-hidden="true" /> },
              ]}
            />
            <Button variant="ghost" onClick={editor.undo} disabled={!editor.canUndo} aria-label="Undo">
              <Undo2 className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" onClick={editor.redo} disabled={!editor.canRedo} aria-label="Redo">
              <Redo2 className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" onClick={() => setMediaOpen(true)} data-testid="builder-media">
              <ImagePlus className="size-4" aria-hidden="true" />
              Media
            </Button>
            <Button
              variant="ghost"
              data-testid="builder-dark-toggle"
              aria-pressed={editor.config.theme.mode === 'dark'}
              aria-label="Toggle dark storefront"
              onClick={() =>
                editor.update((current) => ({
                  ...current,
                  theme: { ...current.theme, mode: current.theme.mode === 'dark' ? 'light' : 'dark' },
                }))
              }
            >
              {editor.config.theme.mode === 'dark'
                ? <Sun className="size-4" aria-hidden="true" />
                : <Moon className="size-4" aria-hidden="true" />}
            </Button>
            <Button variant="ghost" onClick={() => setHistoryOpen(true)} data-testid="builder-history">
              <History className="size-4" aria-hidden="true" />
              History
            </Button>
            <Button variant="ghost" onClick={() => void onReset()} disabled={reset.isPending}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Restore
            </Button>
            <Button onClick={() => void onSaveDraft()} disabled={saving || !editor.dirty}>
              <Save className="size-4" aria-hidden="true" />
              {save.isPending ? 'Saving…' : 'Save draft'}
            </Button>
            <Button variant="primary" onClick={() => void onPublish()} disabled={saving}>
              <Rocket className="size-4" aria-hidden="true" />
              {publish.isPending ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        }
      />

      <div className="mb-[0.8rem] flex flex-wrap items-center gap-[0.6rem] text-meta">
        {editor.dirty && autosaveStatus === 'saving' ? (
          <span className="inline-flex items-center gap-[0.4rem] text-muted">
            <span className="inline-block size-[0.45rem] rounded-round bg-muted animate-pulse" aria-hidden="true" />
            Autosaving…
          </span>
        ) : autosaveStatus === 'error' ? (
          <span className="inline-flex items-center gap-[0.4rem] text-error">
            <span className="size-[0.45rem] rounded-round bg-error" aria-hidden="true" />
            Autosave failed
          </span>
        ) : editor.dirty ? (
          <span className="inline-flex items-center gap-[0.4rem] text-warning">
            <span className="size-[0.45rem] rounded-round bg-warning" aria-hidden="true" />
            Unsaved changes
          </span>
        ) : (
          <span className="text-muted">
            {builder.data?.hasUnpublishedChanges
              ? 'Draft saved — not yet published.'
              : 'Draft matches the published storefront.'}
          </span>
        )}
        <a
          href={`${window.location.origin}/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className="link inline-flex items-center gap-[0.3rem]"
        >
          <Eye className="size-[0.9rem]" aria-hidden="true" />
          Open live storefront
        </a>
      </div>

      <div className="sfb-shell">
        <BuilderSidebar editor={editor} can={(capability) => can(capability as CapabilityKey)} />

        <div className="sfb-pane">
          {previewRevisionId ? (
            <div
              data-testid="historical-preview-banner"
              className="mb-[0.8rem] flex flex-wrap items-center justify-between gap-[0.6rem] rounded-md border border-info bg-info-soft px-[0.8rem] py-[0.6rem] text-meta text-info-ink"
            >
              <span className="inline-flex items-center gap-[0.4rem]">
                <History className="size-4" aria-hidden="true" />
                {previewRevision.isPending
                  ? 'Loading that version…'
                  : previewRevision.data
                    ? `Viewing version #${previewRevision.data.revision.revisionNumber} from ${formatDateTime(previewRevision.data.revision.createdAt)}. Your draft is unchanged.`
                    : 'That version could not be loaded.'}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setPreviewRevisionId(null)}>
                Return to current draft
              </Button>
            </div>
          ) : null}
          <BuilderPreview
            config={previewConfig}
            business={previewProfile}
            can={can}
            device={device}
            selectedSectionId={editor.selectedSectionId}
            onSelectSection={editor.select}
          />
        </div>

        <BuilderInspector editor={editor} hasMediaLibrary={hasModule(MODULE.gallery)} />
      </div>

      <MediaLibraryDialog
        open={mediaOpen}
        businessId={business.id}
        enabled={hasModule(MODULE.gallery)}
        onClose={() => setMediaOpen(false)}
        onSelect={(mediaId) => {
          editor.update((current) => ({ ...current, hero: { ...current.hero, backgroundMediaId: mediaId } }))
          setMediaOpen(false)
        }}
      />

      <RevisionHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        draftVersion={builder.data?.draftVersion ?? 0}
        publishedAt={builder.data?.publishedAt ?? null}
        hasUnsavedChanges={editor.dirty}
        activeRevisionId={previewRevisionId}
        onPreview={(revision) => setPreviewRevisionId(revision.id)}
        onRestore={onRestoreRevision}
      />
    </div>
  )
}
