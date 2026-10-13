import { describe, expect, it } from 'vitest'
import { checkBlank, checkFreeText } from '../../src/lib/pronouns/check'
import type { RawProfile, RawPronoun } from '../../src/lib/pronouns/client'
import type { Blank } from '../../src/lib/pronouns/drills'
import {
    buildIdentity,
    entriesFromFragment,
    entriesFromProfile,
} from '../../src/lib/pronouns/identity'
import type { Entries, Identity } from '../../src/lib/pronouns/types'
import { fixtureResponse, loadPronounFixture } from '../fixtures/resolve'

const xe = loadPronounFixture('xe')
const fetched: Record<string, RawPronoun | null> = {
    xe,
    she: loadPronounFixture('she'),
    they: loadPronounFixture('they'),
    'xe&she': loadPronounFixture('xe&she'),
    'ae/aer/aer/aers/aerself': loadPronounFixture('ae/aer/aer/aers/aerself'),
}

function fromFragment(hash: string): Identity {
    return buildIdentity(
        entriesFromFragment(hash) as Entries,
        fetched,
        xe.examples,
    )
}

async function testcard(): Promise<Identity> {
    const raw = (await fixtureResponse(
        '/profile/get/testcard',
    ).json()) as RawProfile
    return buildIdentity(
        entriesFromProfile(raw) as Entries,
        fetched,
        xe.examples,
    )
}

const blank = (key: Blank['key'], capitalize = false): Blank => ({
    key,
    capitalize,
})

describe('checkBlank', () => {
    const identity = fromFragment('#n=Sam&p=xe%26she')

    it('accepts the modeled form, ignoring case and spaces', () => {
        expect(checkBlank('  XEM ', blank('pronoun_object'), identity)).toEqual(
            {
                correct: true,
                expected: 'xem',
                pronunciation: 'zɛm',
            },
        )
    })

    it('accepts any listed set, so mixing sets is fine', () => {
        expect(
            checkBlank('her', blank('possessive_determiner'), identity).correct,
        ).toBe(true)
    })

    it('shows the modeled form, capitalized at a sentence start', () => {
        expect(
            checkBlank('he', blank('pronoun_subject', true), identity),
        ).toEqual({
            correct: false,
            expected: 'Xe',
            pronunciation: 'zi',
        })
    })

    it('treats an empty answer as a miss', () => {
        expect(checkBlank('', blank('reflexive'), identity).correct).toBe(false)
    })

    it('handles irregular neopronouns where forms repeat', () => {
        const ae = fromFragment('#n=Sam&p=ae/aer/aer/aers/aerself')
        expect(checkBlank('aer', blank('pronoun_object'), ae).correct).toBe(
            true,
        )
        expect(
            checkBlank('aer', blank('possessive_determiner'), ae).correct,
        ).toBe(true)
        expect(
            checkBlank('aers', blank('possessive_pronoun'), ae).correct,
        ).toBe(true)
    })

    it('accepts singular themself for themselves', () => {
        const they = fromFragment('#n=Sam&p=they')
        expect(checkBlank('themself', blank('reflexive'), they).correct).toBe(
            true,
        )
    })

    it('accepts the name in a pronoun slot for null, with curly apostrophes', () => {
        const name = fromFragment('#n=Sam&p=null')
        expect(checkBlank('sam', blank('pronoun_subject'), name).correct).toBe(
            true,
        )
        expect(
            checkBlank('Sam’s', blank('possessive_determiner'), name).correct,
        ).toBe(true)
    })

    it('accepts meh sets but models only yes sets', async () => {
        const identity = await testcard()
        const result = checkBlank('them', blank('pronoun_object'), identity)
        expect(result).toMatchObject({ correct: true, expected: 'xem' })
    })

    it('grades a private set like any other miss', async () => {
        const result = checkBlank(
            'aer',
            blank('pronoun_object'),
            await testcard(),
        )
        expect(result).toEqual({
            correct: false,
            expected: 'xem',
            pronunciation: 'zɛm',
        })
    })
})

describe('checkFreeText', () => {
    it('suggests the modeled form for an unlisted pronoun', () => {
        expect(
            checkFreeText('Sam said he was tired', fromFragment('#n=Sam&p=xe')),
        ).toEqual([{ text: '"he": Sam uses xe/xem,', suggestion: 'xe' }])
    })

    it('offers both forms for an ambiguous word', () => {
        expect(checkFreeText('I saw her', fromFragment('#n=Sam&p=xe'))).toEqual(
            [{ text: '"her": Sam uses xe/xem,', suggestion: 'xem or xyr' }],
        )
    })

    it('flags each word once', () => {
        expect(
            checkFreeText('he and he', fromFragment('#n=Sam&p=xe')),
        ).toHaveLength(1)
    })

    it('does not flag listed sets, accepted names or other words', async () => {
        expect(
            checkFreeText(
                'Sammy said she and xe and they ate the constructor',
                await testcard(),
            ),
        ).toEqual([])
    })

    it('never reacts to private entries', async () => {
        expect(
            checkFreeText('Hiddenname gave aer the book', await testcard()),
        ).toEqual([])
    })

    it('never reacts to names marked no (they never reach the browser)', async () => {
        expect(checkFreeText('Oldname went home', await testcard())).toEqual([])
    })

    it('suggests the name when the card uses no pronouns', () => {
        expect(
            checkFreeText('she left', fromFragment('#n=Sam&p=null')),
        ).toEqual([
            {
                text: '"she": Sam goes by name, not pronouns,',
                suggestion: 'Sam',
            },
        ])
    })

    it('never infers pronouns from a name alone', () => {
        expect(
            checkFreeText('Sam said she was tired', fromFragment('#n=Sam')),
        ).toEqual([])
    })

    it('points to asking when ask-me comes first', () => {
        const identity = buildIdentity(
            {
                names: [{ value: 'Kit', opinion: 'yes' }],
                pronouns: [{ value: 'ask-me', opinion: 'yes' }],
            },
            fetched,
            xe.examples,
        )
        expect(checkFreeText('he left', identity)).toEqual([
            { text: '"he": ask Kit which pronouns to use.' },
        ])
    })
})
