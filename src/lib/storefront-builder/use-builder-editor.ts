import { useCallback, useEffect, useRef, useState } from 'react'
import type { StorefrontConfig, StorefrontSection } from '../api/types'
import { normaliseVariant } from './catalog'
import { makeSection, resequence } from './defaults'

export type BuilderPanel =
  | 'structure' | 'pages' | 'theme' | 'motion'
  | 'header' | 'hero' | 'footer' | 'seo' | 'section'

/** The page regions the Structure tab lists above and below the section list. */
export type BuilderRegion = 'header' | 'hero' | 'footer' | 'seo'

export type BuilderEditor = {
  config: StorefrontConfig
  dirty: boolean
  selectedSectionId: string | null
  panel: BuilderPanel
  canUndo: boolean
  canRedo: boolean
  /** Replace the configuration, recording an undo step. */
  update: (updater: (current: StorefrontConfig) => StorefrontConfig) => void
  /** Replace the configuration WITHOUT an undo step (used for drag previews). */
  replace: (config: StorefrontConfig) => void
  select: (sectionId: string | null) => void
  setPanel: (panel: BuilderPanel) => void
  /** Open a page region (header/hero/footer/seo) in the inspector. */
  openRegion: (region: BuilderRegion) => void
  undo: () => void
  redo: () => void
  markSaved: (config: StorefrontConfig) => void
  addSection: (key: string, atIndex?: number, variant?: string) => void
  removeSection: (id: string) => void
  duplicateSection: (id: string) => void
  toggleSection: (id: string) => void
  moveSection: (id: string, direction: -1 | 1) => void
  /** Move a section to a final index, for drag-and-drop reordering. */
  moveSectionTo: (id: string, toIndex: number) => void
  setSectionVariant: (id: string, variant: string) => void
  patchSection: (id: string, patch: Partial<StorefrontSection>) => void
}

const HISTORY_LIMIT = 50

/**
 * Editor state for the visual builder: the working configuration plus an undo /
 * redo history and the section operations the sidebar drives. Deliberately plain
 * React state — the server owns persistence, so the editor only has to be correct
 * and immediate.
 */
export function useBuilderEditor(initial: StorefrontConfig): BuilderEditor {
  const [config, setConfig] = useState<StorefrontConfig>(initial)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial))
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [panel, setPanel] = useState<BuilderPanel>('structure')
  const history = useRef<StorefrontConfig[]>([])
  const future = useRef<StorefrontConfig[]>([])
  const [version, setVersion] = useState(0)

  // A new server state (first load, or after publish) re-seeds the editor.
  const seed = useRef(JSON.stringify(initial))
  useEffect(() => {
    const next = JSON.stringify(initial)
    if (next === seed.current) return
    seed.current = next
    setConfig(initial)
    setSavedSnapshot(next)
    history.current = []
    future.current = []
    setSelectedSectionId(null)
    setVersion((v) => v + 1)
  }, [initial])

  const update = useCallback((updater: (current: StorefrontConfig) => StorefrontConfig) => {
    setConfig((current) => {
      const next = updater(current)
      history.current.push(current)
      if (history.current.length > HISTORY_LIMIT) history.current.shift()
      future.current = []
      return next
    })
    setVersion((v) => v + 1)
  }, [])

  const replace = useCallback((next: StorefrontConfig) => {
    setConfig(next)
    setVersion((v) => v + 1)
  }, [])

  const undo = useCallback(() => {
    const previous = history.current.pop()
    if (!previous) return
    setConfig((current) => {
      future.current.push(current)
      return previous
    })
    setVersion((v) => v + 1)
  }, [])

  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    setConfig((current) => {
      history.current.push(current)
      return next
    })
    setVersion((v) => v + 1)
  }, [])

  const markSaved = useCallback((next: StorefrontConfig) => {
    setConfig(next)
    seed.current = JSON.stringify(next)
    setSavedSnapshot(JSON.stringify(next))
    history.current = []
    future.current = []
    setVersion((v) => v + 1)
  }, [])

  const addSection = useCallback(
    (key: string, atIndex?: number, variant?: string) => {
      const section = makeSection(key, variant)
      update((current) => {
        const sections = [...current.sections]
        sections.splice(atIndex ?? sections.length, 0, section)
        return { ...current, sections: resequence(sections) }
      })
      setSelectedSectionId(section.id)
      setPanel('section')
    },
    [update],
  )

  const removeSection = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        sections: resequence(current.sections.filter((s) => s.id !== id)),
      }))
      setSelectedSectionId((current) => (current === id ? null : current))
    },
    [update],
  )

  const duplicateSection = useCallback(
    (id: string) => {
      update((current) => {
        const index = current.sections.findIndex((s) => s.id === id)
        if (index < 0) return current
        const source = current.sections[index]
        const copy: StorefrontSection = {
          ...source,
          id: makeSection(source.key).id,
          settings: { ...source.settings },
        }
        const sections = [...current.sections]
        sections.splice(index + 1, 0, copy)
        return { ...current, sections: resequence(sections) }
      })
    },
    [update],
  )

  const toggleSection = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        sections: current.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
      }))
    },
    [update],
  )

  const moveSection = useCallback(
    (id: string, direction: -1 | 1) => {
      update((current) => {
        const index = current.sections.findIndex((s) => s.id === id)
        const target = index + direction
        if (index < 0 || target < 0 || target >= current.sections.length) return current
        const sections = [...current.sections]
        const [moved] = sections.splice(index, 1)
        sections.splice(target, 0, moved)
        return { ...current, sections: resequence(sections) }
      })
    },
    [update],
  )

  const moveSectionTo = useCallback(
    (id: string, gapIndex: number) => {
      update((current) => {
        const from = current.sections.findIndex((s) => s.id === id)
        if (from < 0) return current
        const sections = [...current.sections]
        const [moved] = sections.splice(from, 1)
        // `gapIndex` is the insertion gap in the *current* order, so a move
        // downwards lands one slot earlier once the row itself is removed.
        const target = gapIndex > from ? gapIndex - 1 : gapIndex
        const clamped = Math.max(0, Math.min(target, sections.length))
        sections.splice(clamped, 0, moved)
        return { ...current, sections: resequence(sections) }
      })
    },
    [update],
  )

  const setSectionVariant = useCallback(
    (id: string, variant: string) => {
      update((current) => ({
        ...current,
        sections: current.sections.map((s) =>
          s.id === id ? { ...s, variant: normaliseVariant(s.key, variant) } : s,
        ),
      }))
    },
    [update],
  )

  const patchSection = useCallback(
    (id: string, patch: Partial<StorefrontSection>) => {
      update((current) => ({
        ...current,
        sections: current.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }))
    },
    [update],
  )

  const hasSelected = config.sections.some((s) => s.id === selectedSectionId)
  const dirty = JSON.stringify(config) !== savedSnapshot
  // `version` participates so the memo recomputes after every mutation.
  void version

  return {
    config,
    dirty,
    selectedSectionId: hasSelected ? selectedSectionId : null,
    // A section that has since been deleted falls back to the Structure tab.
    panel: panel === 'section' && !hasSelected ? 'structure' : panel,
    canUndo: history.current.length > 0,
    canRedo: future.current.length > 0,
    update,
    replace,
    select: (id) => {
      setSelectedSectionId(id)
      setPanel(id ? 'section' : 'structure')
    },
    setPanel,
    openRegion: (region) => {
      setSelectedSectionId(null)
      setPanel(region)
    },
    undo,
    redo,
    markSaved,
    addSection,
    removeSection,
    duplicateSection,
    toggleSection,
    moveSection,
    moveSectionTo,
    setSectionVariant,
    patchSection,
  }
}
