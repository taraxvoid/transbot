import { describe, expect, it } from 'vitest'
import type { RawProfile, RawPronoun } from '../../src/lib/pronouns/client'
import {
    buildIdentity,
    entriesFromProfile,
    entriesFromQuery,
    modeledSet,
    normalizePronounValue,
    pronounValuesToFetch,
    summarize,
    VOID_FORMS,
} from '../../src/lib/pronouns/identity'
import type { Entries } from '../../src/lib/pronouns/types'
import { fixtureResponse, loadPronounFixture } from '../fixtures/resolve'

const xe = loadPronounFixture('xe')
const fetched: Record<string, RawPronoun | null> = {
    xe,
    she: loadPronounFixture('she'),
    they: loadPronounFixture('they'),
    'xe&she': loadPronounFixture('xe&she'),
    any: null,
}

async function profile(username: string): Promise<RawProfile> {
    return (await fixtureResponse(
        `/profile/get/${username}`,
    ).json()) as RawProfile
}

async function identityFor(username: string) {
    const entries = entriesFromProfile(await profile(username))
    if (!entries) throw new Error('no en profile')
    return buildIdentity(entries, fetched, xe.examples)
}

describe('entriesFromProfile', () => {
    it('keeps yes and meh, and drops no, close, jokingly and custom', async () => {
        const entries = entriesFromProfile(await profile('testcard'))
        expect(entries?.names).toEqual([
            { value: 'Sam', opinion: 'yes' },
            { value: 'Sammy', opinion: 'meh' },
        ])
        expect(entries?.pronouns.map((p) => p.value)).toEqual([
            'xe&she',
            'they',
            'null',
            'ask-me',
        ])
    })

    it('accepts profiles keyed by locale', () => {
        const entries = entriesFromProfile({
            username: 'x',
            profiles: {
                en: { names: [{ value: 'Ari', opinion: 'yes' }], pronouns: [] },
            },
        })
        expect(entries?.names).toEqual([{ value: 'Ari', opinion: 'yes' }])
    })

    it('returns null without an en profile', () => {
        expect(
            entriesFromProfile({ username: 'x', profiles: [{ locale: 'de' }] }),
        ).toBeNull()
    })
})

describe('entriesFromQuery', () => {
    it('splits an encoded compound set', () => {
        expect(entriesFromQuery('?n=Sam&p=xe%26she')).toEqual({
            names: [{ value: 'Sam', opinion: 'yes' }],
            pronouns: [
                { value: 'xe', opinion: 'yes' },
                { value: 'she', opinion: 'yes' },
            ],
        })
    })

    it('repairs a hand-typed & inside p', () => {
        expect(entriesFromQuery('?n=Sam&p=xe&she')?.pronouns).toEqual([
            { value: 'xe', opinion: 'yes' },
            { value: 'she', opinion: 'yes' },
        ])
    })

    it('reads repeated p in order', () => {
        expect(entriesFromQuery('?n=Sam&p=he&p=they&p=he')?.pronouns).toEqual([
            { value: 'he', opinion: 'yes' },
            { value: 'they', opinion: 'yes' },
        ])
    })

    it('parses human shorthand in p', () => {
        expect(entriesFromQuery('?n=Sam&p=he%2Fthey')?.pronouns).toEqual([
            { value: 'he', opinion: 'yes' },
            { value: 'they', opinion: 'yes' },
        ])
    })

    it('keeps a hand-typed & in a name out of p', () => {
        expect(entriesFromQuery('?n=Sam&Jo&p=xe')).toEqual({
            names: [{ value: 'Sam&Jo', opinion: 'yes' }],
            pronouns: [{ value: 'xe', opinion: 'yes' }],
        })
        expect(entriesFromQuery('?n=Sam&Jo')?.pronouns).toEqual([])
    })

    it('drops stray empty keys that follow neither n nor p', () => {
        expect(entriesFromQuery('?stray&n=Sam&p=xe')).toEqual({
            names: [{ value: 'Sam', opinion: 'yes' }],
            pronouns: [{ value: 'xe', opinion: 'yes' }],
        })
    })

    it('decodes + as a space in names', () => {
        expect(entriesFromQuery('?n=Sam+Lee&p=they')?.names[0].value).toBe(
            'Sam Lee',
        )
    })

    it('allows a name without pronouns and pronouns without a name', () => {
        expect(entriesFromQuery('?n=Sam')?.pronouns).toEqual([])
        expect(entriesFromQuery('?p=xe')?.names).toEqual([])
    })

    it('returns null for an empty query', () => {
        expect(entriesFromQuery('')).toBeNull()
        expect(entriesFromQuery('?')).toBeNull()
    })
})

describe('normalizePronounValue', () => {
    it('strips pronouns.page URLs and leading slashes', () => {
        expect(normalizePronounValue('/they')).toBe('they')
        expect(normalizePronounValue('https://en.pronouns.page/xe')).toBe('xe')
    })
})

describe('pronounValuesToFetch', () => {
    it('skips special values and dropped entries', async () => {
        const entries = entriesFromProfile(await profile('testcard')) as Entries
        expect(pronounValuesToFetch(entries)).toEqual(['xe&she', 'they'])
    })
})

describe('buildIdentity', () => {
    it('splits compound sets and orders yes before meh', async () => {
        const identity = await identityFor('testcard')
        expect(identity.sets.map((s) => [s.label, s.opinion])).toEqual([
            ['xe/xem', 'yes'],
            ['she/her', 'yes'],
            ['they/them', 'meh'],
            ['Sam', 'meh'],
        ])
        expect(identity.names).toEqual({
            preferred: 'Sam',
            accepted: ['Sam', 'Sammy'],
        })
        expect(identity.askMe).toBe('note')
        expect(modeledSet(identity)?.label).toBe('xe/xem')
        expect(modeledSet(identity)?.pronunciations.pronoun_object).toBe('zɛm')
    })

    it('never carries no, private, close or jokingly entries', async () => {
        const json = JSON.stringify(await identityFor('testcard'))
        for (const hidden of [
            'Oldname',
            'Hiddenname',
            'Samwise',
            'Sprocket',
            'lock-alt',
            'secret circle',
            'private bio',
            'aerself',
            'voidself',
            '"he"',
        ]) {
            expect(json).not.toContain(hidden)
        }
    })

    it('models null as the name in every slot', async () => {
        const identity = await identityFor('nullfirst')
        expect(modeledSet(identity)?.forms).toEqual({
            pronoun_subject: 'Jo',
            pronoun_object: 'Jo',
            possessive_determiner: "Jo's",
            possessive_pronoun: "Jo's",
            reflexive: 'Joself',
        })
        expect(identity.templates).toContain(
            'I think {pronoun_subject} is very nice.',
        )
    })

    it('drops null when there is no yes name to use', () => {
        const identity = buildIdentity(
            { names: [], pronouns: [{ value: 'null', opinion: 'yes' }] },
            fetched,
            xe.examples,
        )
        expect(identity.sets).toEqual([])
    })

    it('resolves :void and :Name locally', () => {
        const identity = buildIdentity(
            {
                names: [],
                pronouns: [
                    { value: ':void', opinion: 'yes' },
                    { value: ':Kai', opinion: 'meh' },
                ],
            },
            fetched,
            xe.examples,
        )
        expect(identity.sets[0].forms).toEqual(VOID_FORMS)
        expect(identity.sets[0].label).toBe("void/void's")
        expect(identity.sets[1]).toMatchObject({ kind: 'name', label: 'Kai' })
    })

    it('replaces drills when ask-me is the first yes entry', async () => {
        const identity = await identityFor('askfirst')
        expect(identity.askMe).toBe('only')
        expect(modeledSet(identity)).toBeNull()
        expect(identity.templates).toEqual([])
    })

    it('skips unresolvable sets and models the next yes set', () => {
        const identity = buildIdentity(
            {
                names: [{ value: 'Ari', opinion: 'yes' }],
                pronouns: [
                    { value: 'any', opinion: 'yes' },
                    { value: 'they', opinion: 'yes' },
                ],
            },
            fetched,
            xe.examples,
        )
        expect(modeledSet(identity)?.label).toBe('they/them')
        expect(identity.templates).toContain(
            '{pronoun_subject} are really beautiful.',
        )
    })

    it('never infers pronouns from a name alone', () => {
        const entries = entriesFromQuery('?n=Sam') as Entries
        const identity = buildIdentity(entries, fetched, xe.examples)
        expect(identity.sets).toEqual([])
        expect(modeledSet(identity)).toBeNull()
    })
})

describe('summarize', () => {
    it('lists what is taught and what is accepted', async () => {
        expect(summarize(await identityFor('testcard'))).toEqual({
            teach: ['Sam', 'xe/xem', 'she/her'],
            accept: ['Sammy', 'they/them', 'Sam instead of pronouns'],
            askMe: 'note',
            nothingToTeach: false,
        })
    })

    it('teaches no sets when ask-me comes first', async () => {
        expect(summarize(await identityFor('askfirst'))).toEqual({
            teach: ['Kit'],
            accept: ['xe/xem'],
            askMe: 'only',
            nothingToTeach: false,
        })
    })

    it('flags a card with nothing marked yes', async () => {
        expect(summarize(await identityFor('mehonly')).nothingToTeach).toBe(
            true,
        )
    })
})

describe('plural', () => {
    it('comes from pronouns.page per set, and name and void sets are singular', () => {
        const id = buildIdentity(
            {
                names: [{ value: 'Tara', opinion: 'yes' }],
                pronouns: ['they', 'xe&she', 'null', ':void'].map((value) => ({
                    value,
                    opinion: 'yes' as const,
                })),
            },
            fetched,
            xe.examples,
        )
        expect(id.sets.map((s) => [s.label, s.plural])).toEqual([
            ['they/them', true],
            ['xe/xem', false],
            ['she/her', false],
            ['Tara', false],
            ["void/void's", false],
        ])
    })

    it('treats a they subject as plural even when the API says singular', () => {
        const id = buildIdentity(
            { names: [], pronouns: [{ value: 'tw', opinion: 'yes' }] },
            { tw: { ...fetched.they, plural: [false] } as RawPronoun },
            xe.examples,
        )
        expect(id.sets[0].plural).toBe(true)
    })
})
