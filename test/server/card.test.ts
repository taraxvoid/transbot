import { describe, expect, it } from 'vitest'
import { type CardCache, getCard } from '../../src/lib/server/card'
import { fixtureFetch, TEST_BASE } from '../fixtures/fixture-fetch'

class MemoryCache implements CardCache {
    store = new Map<string, Response>()
    async match(req: Request) {
        return this.store.get(req.url)?.clone()
    }
    async put(req: Request, res: Response) {
        this.store.set(req.url, res.clone())
    }
}

describe('getCard', () => {
    it('returns the filtered identity and caches it for an hour', async () => {
        const cache = new MemoryCache()
        const result = await getCard('testcard', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
            cache,
        })
        expect(result.status).toBe('found')
        const [cached] = cache.store.values()
        expect(cached.headers.get('cache-control')).toBe('max-age=3600')
    })

    it('serves a cached card without calling pronouns.page', async () => {
        const cache = new MemoryCache()
        await getCard('testcard', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
            cache,
        })
        const log: string[] = []
        const again = await getCard('TestCard', {
            base: TEST_BASE,
            fetch: fixtureFetch(log),
            cache,
        })
        expect(again.status).toBe('found')
        expect(log).toEqual([])
    })

    it('never caches not-found, so a new card shows up right away', async () => {
        const cache = new MemoryCache()
        const first = await getCard('fresh', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
            cache,
        })
        expect(first.status).toBe('not-found')
        expect(cache.store.size).toBe(0)
        const created = (async (input: RequestInfo | URL) =>
            fixtureFetch()(
                String(input).replace('/fresh', '/testcard'),
            )) as unknown as typeof fetch
        const second = await getCard('fresh', {
            base: TEST_BASE,
            fetch: created,
            cache,
        })
        expect(second.status).toBe('found')
    })

    it('reports and never caches upstream errors in any set', async () => {
        const cache = new MemoryCache()
        const flaky = (async (input: RequestInfo | URL) =>
            String(input).includes('/pronouns/they')
                ? new Response('down', { status: 502 })
                : fixtureFetch()(input)) as unknown as typeof fetch
        const result = await getCard('testcard', {
            base: TEST_BASE,
            fetch: flaky,
            cache,
        })
        expect(result).toEqual({ status: 'error' })
        expect(cache.store.size).toBe(0)
    })

    it('rejects invalid usernames without fetching', async () => {
        const log: string[] = []
        for (const bad of ['', '../admin', 'a b', 'x'.repeat(65)]) {
            expect(
                await getCard(bad, {
                    base: TEST_BASE,
                    fetch: fixtureFetch(log),
                    cache: null,
                }),
            ).toEqual({ status: 'not-found' })
        }
        expect(log).toEqual([])
    })

    it('works without a cache', async () => {
        const result = await getCard('testcard', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
            cache: null,
        })
        expect(result.status).toBe('found')
    })
})
