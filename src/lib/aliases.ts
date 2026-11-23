/**
 * Vanity links: `/<alias>` redirects to a practice link or a pronouns.page
 * card. Keys are lowercase. Targets are either `/practice/<Name>?p=<pronouns>`
 * (no pronouns.page card needed) or `/profile/<username>` (follows card edits).
 * Add someone with one line here plus a row in test/lib/aliases.test.ts.
 */
export const ALIASES: Readonly<Record<string, string>> = {
    tara: '/profile/taraxvoid',
}

/** Case-insensitive; null for unknown names. Own-property check so `constructor` etc. 404. */
export function resolveAlias(name: string): string | null {
    const key = name.toLowerCase()
    return Object.hasOwn(ALIASES, key) ? ALIASES[key] : null
}
