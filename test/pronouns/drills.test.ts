import { describe, expect, it } from 'vitest'
import {
    type Blank,
    drillsFor,
    parseTemplate,
    SANDWICH_TEMPLATES,
    shuffle,
    templatize,
    XE_FORMS,
} from '../../src/lib/pronouns/drills'
import type { Forms } from '../../src/lib/pronouns/types'
import { loadPronounFixture } from '../fixtures/resolve'

const xe = loadPronounFixture('xe')
const she = loadPronounFixture('she')
const they = loadPronounFixture('they')

function seeded(seed: number): () => number {
    let s = seed
    return () => {
        s = (s * 16807) % 2147483647
        return s / 2147483647
    }
}

describe('parseTemplate', () => {
    it('splits the sandwich line into text and three blanks', () => {
        expect(parseTemplate(SANDWICH_TEMPLATES[0]).parts).toEqual([
            { key: 'pronoun_subject', capitalize: true },
            ' bought a sandwich, I ate ',
            { key: 'possessive_determiner', capitalize: false },
            ' sandwich, I bought ',
            { key: 'pronoun_object', capitalize: false },
            ' a new sandwich.',
        ])
    })

    it('capitalizes a blank that starts a later sentence', () => {
        const blank = parseTemplate('Hi. {pronoun_subject} left.')
            .parts[1] as Blank
        expect(blank.capitalize).toBe(true)
    })

    it('leaves unknown placeholders as text', () => {
        expect(parseTemplate('a {nope} b').parts).toEqual(['a {nope} b'])
    })
})

describe('templatize', () => {
    it('turns xe examples into templates', () => {
        const templates = templatize(xe.examples, XE_FORMS, xe.examples)
        expect(templates).toContain('I think {pronoun_subject} is very nice.')
        expect(templates).toContain(
            '{pronoun_subject} told me that the house is {possessive_pronoun}.',
        )
    })

    it('tells object her from possessive her by aligning with xe', () => {
        const forms = she.morphemes as Forms
        const templates = templatize(she.examples, forms, xe.examples)
        expect(templates).toContain('I met {pronoun_object} recently.')
        expect(templates).toContain('Is this {possessive_determiner} dog?')
    })

    it('keeps plural verb agreement from the set itself', () => {
        const forms = they.morphemes as Forms
        const templates = templatize(they.examples, forms, xe.examples)
        expect(templates).toContain('{pronoun_subject} are really beautiful.')
        expect(templates).toContain(
            '{pronoun_subject} said {pronoun_subject} would rather do it {reflexive}.',
        )
    })

    it('skips sentences that do not line up', () => {
        expect(
            templatize(['I think xe is nice'], XE_FORMS, [
                'I think xe is very nice.',
            ]),
        ).toEqual([])
    })
})

describe('drillsFor', () => {
    it('starts with the sandwich lines, then every example', () => {
        const drills = drillsFor(
            ['A {pronoun_subject}.', 'B {reflexive}.'],
            seeded(1),
        )
        expect(drills).toHaveLength(5)
        expect(drills.slice(0, 3)).toEqual(
            SANDWICH_TEMPLATES.map(parseTemplate),
        )
    })

    it('shuffles deterministically for a seeded rng', () => {
        const items = [1, 2, 3, 4, 5, 6]
        expect(shuffle(items, seeded(7))).toEqual(shuffle(items, seeded(7)))
        expect([...shuffle(items, seeded(7))].sort()).toEqual(items)
        expect(items).toEqual([1, 2, 3, 4, 5, 6])
    })
})
