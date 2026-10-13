import { type ClientOptions, getPronouns, type RawPronoun } from './client'
import { buildIdentity, pronounValuesToFetch } from './identity'
import type { Entries, Identity } from './types'

/**
 * Fetches every listed set plus xe (its examples are the drill templates).
 * Returns null on any upstream error, so a card never silently loses a set.
 * A set pronouns.page doesn't know (404) is skipped instead.
 */
export async function loadIdentity(
    entries: Entries,
    opts: ClientOptions = {},
): Promise<Identity | null> {
    const values = pronounValuesToFetch(entries)
    // xe is fetched once even when the card lists it.
    const requests = values.includes('xe') ? values : [...values, 'xe']
    const results = await Promise.all(
        requests.map((value) => getPronouns(value, opts)),
    )
    const xe = results[requests.indexOf('xe')]
    if (!xe.ok) return null
    if (results.some((r) => !r.ok && r.reason === 'error')) return null
    const fetched: Record<string, RawPronoun | null> = {}
    values.forEach((value, i) => {
        const result = results[i]
        fetched[value] = result.ok ? result.data : null
    })
    return buildIdentity(entries, fetched, xe.data.examples)
}
