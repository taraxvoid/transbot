import { describe, expect, it } from 'vitest'
import {
    getProfile,
    getPronouns,
    pronounPath,
} from '../../src/lib/pronouns/client'
import { fixtureFetch, TEST_BASE } from '../fixtures/fixture-fetch'

describe('pronounPath', () => {
    it('keeps the separators pronouns.page uses', () => {
        expect(pronounPath('xe&she')).toBe('xe&she')
        expect(pronounPath('ae/aer/aer/aers/aerself')).toBe(
            'ae/aer/aer/aers/aerself',
        )
        expect(pronounPath(':void')).toBe(':void')
    })

    it('encodes everything else', () => {
        expect(pronounPath('a b?')).toBe('a%20b%3F')
    })
})

describe('getPronouns', () => {
    it('returns a compound set as one response', async () => {
        const result = await getPronouns('xe&she', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
        })
        expect(result.ok && result.data.morphemes.pronoun_subject).toBe(
            'xe&she',
        )
    })

    it('requests written-out sets with their slashes', async () => {
        const log: string[] = []
        const result = await getPronouns('ae/aer/aer/aers/aerself', {
            base: TEST_BASE,
            fetch: fixtureFetch(log),
        })
        expect(result.ok).toBe(true)
        expect(log).toEqual(['/v3/pronouns/ae/aer/aer/aers/aerself'])
    })

    it('maps 404 to not-found', async () => {
        const result = await getPronouns('notaset', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
        })
        expect(result).toEqual({ ok: false, reason: 'not-found' })
    })

    it('maps 5xx and network failures to error', async () => {
        const failing = (async () =>
            new Response('oops', { status: 503 })) as unknown as typeof fetch
        const throwing = (async () => {
            throw new TypeError('network down')
        }) as unknown as typeof fetch
        expect(await getPronouns('xe', { fetch: failing })).toEqual({
            ok: false,
            reason: 'error',
        })
        expect(await getPronouns('xe', { fetch: throwing })).toEqual({
            ok: false,
            reason: 'error',
        })
    })
})

describe('getProfile', () => {
    it('returns a profile', async () => {
        const result = await getProfile('testcard', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
        })
        expect(result.ok && result.data.username).toBe('testcard')
    })

    it('maps a missing user to not-found', async () => {
        const result = await getProfile('nobody', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
        })
        expect(result).toEqual({ ok: false, reason: 'not-found' })
    })

    it('treats a 200 without profiles as not-found', async () => {
        const empty = (async () => Response.json({})) as unknown as typeof fetch
        expect(await getProfile('x', { fetch: empty })).toEqual({
            ok: false,
            reason: 'not-found',
        })
    })
})
