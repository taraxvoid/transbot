import { entriesFromFragment } from './pronouns/identity'
import type { Entries } from './pronouns/types'

/** pronouns.page usernames; also keeps paths like ../ out of API calls. */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

export function isValidUsername(value: string): boolean {
    return USERNAME_PATTERN.test(value) && !/^\.+$/.test(value)
}

/** `pronouns` are pronouns.page values, first one modeled; see parsePronounInput. */
export function practiceLink(
    name: string,
    pronouns: string[],
    origin: string,
): string | null {
    const n = name.trim()
    const values = pronouns.map((p) => p.trim()).filter(Boolean)
    if (!n || !values.length) return null
    const params = new URLSearchParams()
    for (const p of values) params.append('p', p)
    return `${origin}/practice/${encodeURIComponent(n)}?${params}`
}

/** Reads /practice/<name>?p=<pronouns>. Names use the same rules as fragments. */
export function entriesFromPracticePath(
    pathname: string,
    search: string,
): Entries | null {
    const raw = pathname.replace(/^\/practice\/?/, '').replace(/\/+$/, '')
    let name: string
    try {
        name = decodeURIComponent(raw)
    } catch {
        return null
    }
    if (!name.trim()) return null
    // Name first so a stray n= in the query never wins; the fragment parser
    // also rejoins a hand-typed `p=xe&she`.
    return entriesFromFragment(
        `#${new URLSearchParams({ n: name })}&${search.replace(/^\?/, '')}`,
    )
}

export function cardLink(username: string, origin: string): string {
    return `${origin}/profile/${username}`
}

/** Accepts "name", "@name" or a pasted pronouns.page profile URL. */
export function normalizeUsername(input: string): string | null {
    const value = input
        .trim()
        .replace(/^https?:\/\/[^/]+\/+/i, '')
        .replace(/^@/, '')
        .replace(/\/+$/, '')
    return isValidUsername(value) ? value : null
}
