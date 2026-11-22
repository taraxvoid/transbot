import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ALIASES, resolveAlias } from '../../src/lib/aliases'

describe('aliases', () => {
    it('resolves case-insensitively', () => {
        expect(resolveAlias('tara')).toBe('/profile/taravie')
        expect(resolveAlias('TARA')).toBe('/profile/taravie')
    })

    it('returns null for unknown names and prototype keys', () => {
        expect(resolveAlias('nobody')).toBeNull()
        expect(resolveAlias('constructor')).toBeNull()
        expect(resolveAlias('__proto__')).toBeNull()
    })

    it('keys are lowercase and valid single path segments', () => {
        for (const key of Object.keys(ALIASES)) {
            expect(key).toMatch(/^[a-z0-9_-]+$/)
        }
    })

    it('targets are practice links or profile cards', () => {
        for (const target of Object.values(ALIASES)) {
            expect(target).toMatch(
                /^\/(practice\/[^/?#]+\?p=\S+|profile\/[\w.-]+)$/,
            )
        }
    })

    it('no alias shadows an existing top-level path', () => {
        const taken = readdirSync('src/pages').map((f) =>
            f.replace(/\.(astro|ts)$/, '').toLowerCase(),
        )
        for (const key of Object.keys(ALIASES)) {
            expect(taken).not.toContain(key)
            expect([
                'api',
                'practice',
                'profile',
                'index',
                '404',
            ]).not.toContain(key)
        }
    })
})
