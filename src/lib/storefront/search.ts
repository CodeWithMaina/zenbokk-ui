/**
 * Storefront search and grouping helpers.
 *
 * Kept out of the components that use them so those files export components
 * only (which is what Fast Refresh needs), and so the same matching rule is
 * applied by the services grid, the roster, the search page and the booking
 * wizard instead of each writing its own.
 */

/**
 * The categories a set of services actually uses, in catalogue order.
 *
 * Uncategorised services are simply not represented — there is no "Other" chip,
 * because a business that has not filed a service under a category has not
 * claimed one.
 */
export function serviceCategories(names: (string | null)[]): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const name of names) {
    if (!name || seen.has(name)) continue
    seen.add(name)
    ordered.push(name)
  }
  return ordered
}

/** The distinct job titles a roster uses, in roster order. */
export function staffRoles(names: (string | null)[]): string[] {
  return serviceCategories(names)
}

/** Case-insensitive match across every haystack field. */
export function matchesQuery(
  query: string,
  ...haystacks: (string | null | undefined)[]
): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return haystacks.some((value) => value?.toLowerCase().includes(needle))
}

/** Resolve a member's assigned service ids to their published names. */
export function resolveServiceNames(
  serviceIds: string[],
  nameById: Map<string, string>,
): string[] {
  return serviceIds
    .map((id) => nameById.get(id))
    .filter((name): name is string => Boolean(name))
}
