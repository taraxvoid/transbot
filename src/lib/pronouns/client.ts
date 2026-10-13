import type { FormKey, Pronunciations } from './types'

export const DEFAULT_API_BASE = 'https://en.pronouns.page/api/public/v3'
const TIMEOUT_MS = 5000

export type RawPronoun = {
    canonicalName: string
    name: string
    nullPronoun: boolean
    plural: boolean[]
    /** Compound sets join forms with `&`: "xe&she". */
    morphemes: Record<FormKey, string>
    /** IPA; for compound sets usually only the first set has any. */
    pronunciations: Pronunciations
    /** Filled in with the first set's forms. */
    examples: string[]
}

export type RawEntry = { value: string; opinion: string }

export type RawLocaleProfile = {
    locale: string
    names?: RawEntry[]
    pronouns?: RawEntry[]
}

export type RawProfile = {
    username: string
    profiles:
        | RawLocaleProfile[]
        | Record<string, Omit<RawLocaleProfile, 'locale'>>
}

export type Fetched<T> =
    | { ok: true; data: T }
    | { ok: false; reason: 'not-found' | 'error' }

export type ClientOptions = { base?: string; fetch?: typeof fetch }

/** Encodes a pronoun value but keeps the `/`, `&` and `:` it uses. */
export function pronounPath(value: string): string {
    return value
        .split('/')
        .map((part) =>
            encodeURIComponent(part)
                .replaceAll('%26', '&')
                .replaceAll('%3A', ':'),
        )
        .join('/')
}

async function getJson<T>(
    path: string,
    opts: ClientOptions,
): Promise<Fetched<T>> {
    const base = opts.base ?? DEFAULT_API_BASE
    // Called as a plain function: `opts.fetch(...)` would bind `this` to opts,
    // which browsers reject with "Illegal invocation".
    const fetchFn = opts.fetch ?? fetch
    try {
        const res = await fetchFn(`${base}${path}`, {
            headers: { accept: 'application/json' },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (res.status === 404) return { ok: false, reason: 'not-found' }
        if (!res.ok) return { ok: false, reason: 'error' }
        return { ok: true, data: (await res.json()) as T }
    } catch {
        return { ok: false, reason: 'error' }
    }
}

export async function getPronouns(
    value: string,
    opts: ClientOptions = {},
): Promise<Fetched<RawPronoun>> {
    const result = await getJson<RawPronoun>(
        `/pronouns/${pronounPath(value)}`,
        opts,
    )
    if (result.ok && !result.data?.morphemes) {
        return { ok: false, reason: 'not-found' }
    }
    return result
}

export async function getProfile(
    username: string,
    opts: ClientOptions = {},
): Promise<Fetched<RawProfile>> {
    const result = await getJson<RawProfile>(
        `/profile/get/${encodeURIComponent(username)}`,
        opts,
    )
    if (
        result.ok &&
        (typeof result.data?.profiles !== 'object' ||
            result.data.profiles === null)
    ) {
        return { ok: false, reason: 'not-found' }
    }
    return result
}
