import { describe, expect, it } from 'vitest'
import { cardLink, normalizeUsername, practiceLink } from '../../src/lib/links'
import { entriesFromFragment } from '../../src/lib/pronouns/identity'

describe('practiceLink', () => {
    it('encodes the name and shorthand into the fragment', () => {
        const link = practiceLink('Sam Lee', 'xe&she', 'https://transbot.net')
        expect(link).toBe('https://transbot.net/practice#n=Sam+Lee&p=xe%26she')
    })

    it('round-trips through entriesFromFragment', () => {
        const link = practiceLink(
            ' Zoë ',
            'ae/aer/aer/aers/aerself',
            'https://x',
        )
        const entries = entriesFromFragment(new URL(link ?? '').hash)
        expect(entries?.names[0].value).toBe('Zoë')
        expect(entries?.pronouns[0].value).toBe('ae/aer/aer/aers/aerself')
    })

    it('needs both a name and pronouns', () => {
        expect(practiceLink('', 'xe', 'https://x')).toBeNull()
        expect(practiceLink('Sam', '  ', 'https://x')).toBeNull()
    })
})

describe('cardLink', () => {
    it('builds the /@ link', () => {
        expect(cardLink('taravie', 'https://transbot.net')).toBe(
            'https://transbot.net/@taravie',
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
