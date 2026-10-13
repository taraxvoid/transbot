import { describe, expect, it } from 'vitest'
import { loadIdentity } from '../../src/lib/pronouns/load'
import { fixtureFetch, TEST_BASE } from '../fixtures/fixture-fetch'

describe('loadIdentity', () => {
    it('fetches the listed set and xe examples, nothing else', async () => {
        const log: string[] = []
        const identity = await loadIdentity(
            {
                names: [{ value: 'Sam', opinion: 'yes' }],
                pronouns: [{ value: 'xe&she', opinion: 'yes' }],
            },
            { base: TEST_BASE, fetch: fixtureFetch(log) },
        )
        expect(identity?.sets.map((s) => s.label)).toEqual([
            'xe/xem',
            'she/her',
        ])
        expect(log.sort()).toEqual(['/v3/pronouns/xe', '/v3/pronouns/xe&she'])
    })

    it('treats an unknown set as unresolvable, not as an error', async () => {
        const identity = await loadIdentity(
            { names: [], pronouns: [{ value: 'notaset', opinion: 'yes' }] },
            { base: TEST_BASE, fetch: fixtureFetch() },
        )
        expect(identity?.sets).toEqual([])
    })

    it('returns null when a fetch fails', async () => {
        const failing = (async (input: RequestInfo | URL) =>
            String(input).endsWith('/they')
                ? new Response('down', { status: 503 })
                : fixtureFetch()(input)) as unknown as typeof fetch
        expect(
            await loadIdentity(
                { names: [], pronouns: [{ value: 'they', opinion: 'yes' }] },
                { base: TEST_BASE, fetch: failing },
            ),
        ).toBeNull()
    })
})
