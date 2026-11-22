import { describe, expect, it } from 'vitest'
import {
    cardLink,
    entriesFromPracticePath,
    isAutofillName,
    normalizeUsername,
    practiceLink,
    pronounQuery,
} from '../../src/lib/links'

describe('practiceLink', () => {
    it('puts the encoded name in the path and the sets in one pronouns param', () => {
        const link = practiceLink(
            'Sam Lee',
            ['xe', 'she'],
            'https://transbot.net',
        )
        expect(link).toBe(
            'https://transbot.net/practice/Sam%20Lee?pronouns=xe+she',
        )
    })

    it.each(['Zoë', 'a/b', 'what?', 'x#y', '100%', 'Jo & Sam'])(
        'round-trips the name %s',
        (name) => {
            const url = new URL(
                practiceLink(
                    name,
                    ['ne/nem/nir/nirs/nemself', 'he'],
                    'https://x',
                ) ?? '',
            )
            const entries = entriesFromPracticePath(url.pathname, url.search)
            expect(entries?.names[0].value).toBe(name)
            expect(entries?.pronouns.map((p) => p.value)).toEqual([
                'ne/nem/nir/nirs/nemself',
                'he',
            ])
        },
    )

    it('needs both a name and pronouns', () => {
        expect(practiceLink('', ['xe'], 'https://x')).toBeNull()
        expect(practiceLink('Sam', [], 'https://x')).toBeNull()
        expect(practiceLink('Sam', ['  '], 'https://x')).toBeNull()
    })
})

describe('pronounQuery', () => {
    it('joins sets with + and keeps slashes and colons readable', () => {
        expect(pronounQuery(['ne/nem/nir/nirs/nemself', 'she'])).toBe(
            'pronouns=ne/nem/nir/nirs/nemself+she',
        )
        expect(pronounQuery([':Sam'])).toBe('pronouns=:Sam')
        expect(pronounQuery(['null'])).toBe('pronouns=null')
        expect(pronounQuery([' ', ''])).toBe('')
    })

    it.each([
        [[':Zoë', 'they']],
        [[":O'Neil"]],
        [['ne/nem/nir/nirs/nemself', 'he', 'it']],
    ])('round-trips %j through entriesFromPracticePath', (values) => {
        const entries = entriesFromPracticePath(
            '/practice/Sam',
            `?${pronounQuery(values)}`,
        )
        expect(entries?.pronouns.map((p) => p.value)).toEqual(values)
    })
})

describe('entriesFromPracticePath, links sent before short links', () => {
    it('still reads repeated p params', () => {
        const entries = entriesFromPracticePath('/practice/Sam', '?p=xe&p=she')
        expect(entries?.pronouns.map((p) => p.value)).toEqual(['xe', 'she'])
    })

    it('still reads percent-encoded slashes', () => {
        const entries = entriesFromPracticePath(
            '/practice/Sam',
            '?p=ne%2Fnem%2Fnir%2Fnirs%2Fnemself',
        )
        expect(entries?.pronouns.map((p) => p.value)).toEqual([
            'ne/nem/nir/nirs/nemself',
        ])
    })
})

describe('entriesFromPracticePath, links sent before pronouns=', () => {
    it('still reads p= the same as pronouns=', () => {
        const old = entriesFromPracticePath('/practice/Sam', '?p=xe+she')
        const now = entriesFromPracticePath('/practice/Sam', '?pronouns=xe+she')
        expect(old).toEqual(now)
        expect(now?.pronouns.map((p) => p.value)).toEqual(['xe', 'she'])
    })

    it('splits a hand-typed p=xe&she into both sets', () => {
        const entries = entriesFromPracticePath('/practice/Sam', '?p=xe&she')
        expect(entries?.pronouns.map((p) => p.value)).toEqual(['xe', 'she'])
    })
})

describe('entriesFromPracticePath', () => {
    it('splits a hand-typed pronouns=xe&she into both sets', () => {
        const entries = entriesFromPracticePath(
            '/practice/Sam',
            '?pronouns=xe&she',
        )
        expect(entries?.pronouns.map((p) => p.value)).toEqual(['xe', 'she'])
    })

    it('reads p and pronouns together, in order', () => {
        const entries = entriesFromPracticePath(
            '/practice/Sam',
            '?pronouns=xe&p=she',
        )
        expect(entries?.pronouns.map((p) => p.value)).toEqual(['xe', 'she'])
    })

    it('returns a name alone when pronouns are missing', () => {
        const entries = entriesFromPracticePath('/practice/Sam', '')
        expect(entries?.names[0].value).toBe('Sam')
        expect(entries?.pronouns).toEqual([])
    })

    it('ignores a stray n in the query', () => {
        const entries = entriesFromPracticePath(
            '/practice/Sam',
            '?n=Eve&pronouns=xe',
        )
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

describe('isAutofillName', () => {
    it.each(['asher', 'Zoë', 'Sam Lee'])('accepts %s', (name) => {
        expect(isAutofillName(name)).toBe(true)
    })

    it.each(['', 'favicon.ico', 'a'.repeat(65)])('refuses %j', (name) => {
        expect(isAutofillName(name)).toBe(false)
    })
})
