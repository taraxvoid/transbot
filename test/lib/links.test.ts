import { describe, expect, it } from 'vitest'
import {
    cardLink,
    entriesFromPracticePath,
    normalizeUsername,
    practiceLink,
} from '../../src/lib/links'

describe('practiceLink', () => {
    it('puts the encoded name in the path and the shorthand in p', () => {
        const link = practiceLink('Sam Lee', 'xe&she', 'https://transbot.net')
        expect(link).toBe('https://transbot.net/practice/Sam%20Lee?p=xe%26she')
    })

    it.each(['Zoë', 'a/b', 'what?', 'x#y', '100%', 'Jo & Sam'])(
        'round-trips the name %s',
        (name) => {
            const url = new URL(
                practiceLink(name, 'ae/aer/aer/aers/aerself', 'https://x') ??
                    '',
            )
            const entries = entriesFromPracticePath(url.pathname, url.search)
            expect(entries?.names[0].value).toBe(name)
            expect(entries?.pronouns[0].value).toBe('ae/aer/aer/aers/aerself')
        },
    )

    it('needs both a name and pronouns', () => {
        expect(practiceLink('', 'xe', 'https://x')).toBeNull()
        expect(practiceLink('Sam', '  ', 'https://x')).toBeNull()
    })
})

describe('entriesFromPracticePath', () => {
    it('keeps a hand-typed p=xe&she together', () => {
        const entries = entriesFromPracticePath('/practice/Sam', '?p=xe&she')
        expect(entries?.pronouns[0].value).toBe('xe&she')
    })

    it('returns a name alone when p is missing', () => {
        const entries = entriesFromPracticePath('/practice/Sam', '')
        expect(entries?.names[0].value).toBe('Sam')
        expect(entries?.pronouns).toEqual([])
    })

    it('ignores a stray n in the query', () => {
        const entries = entriesFromPracticePath('/practice/Sam', '?n=Eve&p=xe')
        expect(entries?.names[0].value).toBe('Sam')
    })

    it('rejects an empty or malformed name', () => {
        expect(entriesFromPracticePath('/practice', '?p=xe')).toBeNull()
        expect(entriesFromPracticePath('/practice/%E0%A4%A', '')).toBeNull()
    })
})

describe('cardLink', () => {
    it('builds the /profile link', () => {
        expect(cardLink('taravie', 'https://transbot.net')).toBe(
            'https://transbot.net/profile/taravie',
        )
    })
})

describe('normalizeUsername', () => {
    it('accepts a bare name, an @name and a pasted profile URL', () => {
        expect(normalizeUsername(' taravie ')).toBe('taravie')
        expect(normalizeUsername('@taravie')).toBe('taravie')
        expect(normalizeUsername('https://en.pronouns.page/@taravie/')).toBe(
            'taravie',
        )
    })

    it('rejects anything that is not a username', () => {
        expect(normalizeUsername('')).toBeNull()
        expect(normalizeUsername('two words')).toBeNull()
        expect(normalizeUsername('..')).toBeNull()
    })
})
