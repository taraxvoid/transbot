import { isValidUsername } from '../links'
import { type ClientOptions, getProfile } from '../pronouns/client'
import { entriesFromProfile } from '../pronouns/identity'
import { loadIdentity } from '../pronouns/load'
import type { Identity } from '../pronouns/types'

export const CARD_TTL_SECONDS = 3600

export type CardCache = {
    match(request: Request): Promise<Response | undefined>
    put(request: Request, response: Response): Promise<void>
}

export type CardDeps = ClientOptions & { cache: CardCache | null }

export type CardResult =
    | { status: 'found'; identity: Identity }
    | { status: 'not-found' }
    | { status: 'error' }

function cacheKey(username: string): Request {
    return new Request(
        `https://transbot.net/__card/v1/${username.toLowerCase()}`,
    )
}

/**
 * The filtered identity for a pronouns.page username. Only found cards are
 * cached, so someone who just saved a card isn't stuck with a stale miss.
 */
export async function getCard(
    username: string,
    deps: CardDeps,
): Promise<CardResult> {
    if (!isValidUsername(username)) return { status: 'not-found' }
    const key = cacheKey(username)
    const hit = await deps.cache?.match(key).catch(() => undefined)
    if (hit)
        return { status: 'found', identity: (await hit.json()) as Identity }

    const profile = await getProfile(username, deps)
    if (!profile.ok) return { status: profile.reason }
    const entries = entriesFromProfile(profile.data)
    if (!entries) return { status: 'not-found' }
    const identity = await loadIdentity(entries, deps)
    if (!identity) return { status: 'error' }

    await deps.cache
        ?.put(
            key,
            new Response(JSON.stringify(identity), {
                headers: {
                    'content-type': 'application/json',
                    'cache-control': `max-age=${CARD_TTL_SECONDS}`,
                },
            }),
        )
        .catch(() => {
            // A failed cache write only costs a refetch next time.
        })
    return { status: 'found', identity }
}
