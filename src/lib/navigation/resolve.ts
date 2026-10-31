import { NAV_SECTION_LABELS } from './config'
import type { NavAccess, NavEntry, NavSection, NavSectionKey } from './types'

/**
 * Turns the navigation configuration + the caller's backend-resolved access
 * into the sections a sidebar renders.
 *
 * This is the only place the rules live:
 *  - the entry must belong to the surface being rendered,
 *  - the persona must be allowed,
 *  - the business must be entitled to the entry's module,
 *  - the caller's role must hold the entry's permission.
 *
 * A group (an entry with children and no `to`) survives when at least one of
 * its children does, so an empty group never renders an orphan heading.
 */

const SECTION_ORDER: readonly NavSectionKey[] = [
  'overview',
  'operations',
  'growth',
  'workspace',
  'platform',
]

function hasModule(entitlements: readonly string[], key: string | undefined): boolean {
  if (!key) return true
  return entitlements.includes(key)
}

function hasPermission(permissions: readonly string[], code: string | undefined): boolean {
  if (!code) return true
  return permissions.includes(code)
}

function roleAllowed(entry: NavEntry, role: NavAccess['role']): boolean {
  if (!entry.roles || entry.roles.length === 0) return true
  return entry.roles.includes(role)
}

/** Does the caller satisfy this entry's own gates (ignoring its children)? */
function passesGates(entry: NavEntry, access: NavAccess): boolean {
  if (entry.surface !== access.surface) return false
  if (!roleAllowed(entry, access.role)) return false
  if (!hasModule(access.entitlements, entry.module)) return false
  if (!hasPermission(access.permissions, entry.permission)) return false
  return true
}

/** True when the entry should appear in the sidebar. */
export function isNavEntryVisible(entry: NavEntry, access: NavAccess): boolean {
  if (!passesGates(entry, access)) return false
  if (entry.to) return true
  // A group is visible only through a visible child.
  return (entry.children ?? []).some((child) => isNavEntryVisible(child, access))
}

/** The entry with its children filtered down to the visible ones. */
function filterEntry(entry: NavEntry, access: NavAccess): NavEntry {
  if (!entry.children || entry.children.length === 0) return entry
  const children = entry.children.filter((child) => isNavEntryVisible(child, access))
  return children.length > 0 ? { ...entry, children } : entry
}

/**
 * Sections to render for this caller, in a stable order, with empty sections
 * and inaccessible entries removed.
 */
export function resolveNavigation(entries: readonly NavEntry[], access: NavAccess): NavSection[] {
  const visible = entries.filter((entry) => isNavEntryVisible(entry, access))

  return SECTION_ORDER.flatMap((key) => {
    const items = visible.filter((entry) => entry.section === key).map((entry) => filterEntry(entry, access))
    return items.length > 0 ? [{ key, label: NAV_SECTION_LABELS[key], items }] : []
  })
}

/** Every key the caller can currently see, including nested ones. */
export function visibleNavKeys(sections: readonly NavSection[]): Set<string> {
  const keys = new Set<string>()
  for (const section of sections) {
    for (const item of section.items) {
      keys.add(item.key)
      for (const child of item.children ?? []) keys.add(child.key)
    }
  }
  return keys
}

/** Does the resolved sidebar contain this entry key? */
export function canSeeNavEntry(sections: readonly NavSection[], key: string): boolean {
  return visibleNavKeys(sections).has(key)
}

/** The entry whose route matches `pathname` most closely (longest match wins). */
export function activeNavEntry(
  sections: readonly NavSection[],
  pathname: string,
): NavEntry | null {
  const candidates: NavEntry[] = []
  for (const section of sections) {
    for (const item of section.items) {
      candidates.push(item, ...(item.children ?? []))
    }
  }

  let match: NavEntry | null = null
  let matchLength = -1

  for (const entry of candidates) {
    if (!entry.to) continue
    const href = String(entry.to)
    const matches = entry.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
    if (!matches) continue
    if (href.length > matchLength) {
      match = entry
      matchLength = href.length
    }
  }

  return match
}
