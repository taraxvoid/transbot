import { describe, expect, it } from 'vitest'
import type { RawPronoun } from '../../src/lib/pronouns/client'
import {
    buildIdentity,
    entriesFromFragment,
} from '../../src/lib/pronouns/identity'
import { FORM_KEYS, type Identity } from '../../src/lib/pronouns/types'
import { FRIEND_POOL, pickFriends } from '../../src/lib/scenes/friends'
import {
    chatPerson,
    renderScene,
    renderSession,
} from '../../src/lib/scenes/render'
import { SCENES } from '../../src/lib/scenes/scenes'
import { fill, type Person, slotsIn } from '../../src/lib/scenes/template'
import { loadPronounFixture } from '../fixtures/resolve'

const xe = loadPronounFixture('xe')
const they = loadPronounFixture('they')
const fetched: Record<string, RawPronoun | null> = {
    xe,
    they,
    she: loadPronounFixture('she'),
    'xe&she': loadPronounFixture('xe&she'),
    // pronouns.page marks written-out sets singular, even this one.
    'they/them/their/theirs/themself': { ...they, plural: [false] },
}

function identity(hash: string): Identity {
    const entries = entriesFromFragment(hash)
    if (!entries) throw new Error(`no entries for ${hash}`)
    return buildIdentity(entries, fetched, xe.examples)
}

function person(hash: string): Person {
    const p = chatPerson(identity(hash))
    if (!p) throw new Error(`no person for ${hash}`)
    return p
}

function seeded(seed: number): () => number {
    let s = seed
    return () => {
        s = (s * 16807) % 2147483647
        return s / 2147483647
    }
}

const AGREEMENT = 'Which place {does|do} {pronoun_subject} like?'

describe('fill', () => {
    it('agrees verbs with singular and plural sets', () => {
        expect(fill(AGREEMENT, person('n=Tara&p=xe'))).toBe(
            'Which place does xe like?',
        )
        expect(fill(AGREEMENT, person('n=Sam&p=they'))).toBe(
            'Which place do they like?',
        )
        expect(fill(AGREEMENT, person('n=Tara&p=null'))).toBe(
            'Which place does Tara like?',
        )
        expect(fill(AGREEMENT, person('n=Tara&p=:void'))).toBe(
            'Which place does void like?',
        )
    })

    it('models the first set of a compound and keeps it singular', () => {
        expect(fill(AGREEMENT, person('n=Tara&p=xe%26she'))).toBe(
            'Which place does xe like?',
        )
    })

    it('treats written-out they/them as plural', () => {
        const p = person('n=Sam&p=they/them/their/theirs/themself')
        expect(p.plural).toBe(true)
        expect(fill(AGREEMENT, p)).toBe('Which place do they like?')
    })

    it('capitalizes slots at the start of a sentence only', () => {
        const p = person('n=Tara&p=xe')
        expect(
            fill('{pronoun_subject} texted. {possessive_determiner} train', p),
        ).toBe('Xe texted. Xyr train')
        expect(fill('Yes! {pronoun_subject} said {pronoun_subject}', p)).toBe(
            'Yes! Xe said xe',
        )
    })

    it('says "our friend" when there is no name', () => {
        const p = person('p=xe')
        expect(p.name).toBeNull()
        expect(fill('Where is {name}?', p)).toBe('Where is our friend?')
        expect(fill('{name} is late', p)).toBe('Our friend is late')
    })

    it('throws on an unknown slot', () => {
        expect(() => fill('{nmae}', person('n=Tara&p=xe'))).toThrow(/nmae/)
    })
})

describe('chatPerson', () => {
    it('uses the name when there is no yes pronoun set', () => {
        expect(person('n=Tara')).toEqual({
            name: 'Tara',
            forms: {
                pronoun_subject: 'Tara',
                pronoun_object: 'Tara',
                possessive_determiner: "Tara's",
                possessive_pronoun: "Tara's",
                reflexive: 'Taraself',
            },
            plural: false,
        })
    })

    it('uses a :Name set as the name when there is no preferred name', () => {
        expect(person('p=:Kai').name).toBe('Kai')
    })

    it('has no chat when ask-me comes first', () => {
        expect(chatPerson(identity('n=Tara&p=ask-me&p=xe'))).toBeNull()
    })

    it('still chats when ask-me comes later', () => {
        expect(person('n=Tara&p=xe&p=ask-me').forms.pronoun_subject).toBe('xe')
    })

    it('has no chat with no name and no known pronouns', () => {
        expect(chatPerson(identity('p=zzz'))).toBeNull()
    })
})

describe('pickFriends', () => {
    it('never repeats a friend or takes the person name', () => {
        for (let seed = 1; seed < 300; seed++) {
            const [a, b] = pickFriends('sam', seeded(seed))
            expect(a).not.toBe(b)
            expect([a, b]).not.toContain('Sam')
            expect(FRIEND_POOL).toContain(a)
            expect(FRIEND_POOL).toContain(b)
        }
    })

    it('works without a name', () => {
        const [a, b] = pickFriends(null, () => 0.999)
        expect(a).not.toBe(b)
    })
})

describe('renderScene', () => {
    it('fills senders and text', () => {
        const scene = renderScene(SCENES[0], person('n=Tara&p=xe'), [
            'Alex',
            'Priya',
        ])
        expect(scene.group).toBe('Lunch crew')
        expect(scene.lines.slice(0, 2)).toEqual([
            {
                from: 'a',
                sender: 'Alex',
                text: 'Is Tara still coming Saturday?',
            },
            {
                from: 'b',
                sender: 'Priya',
                text: 'Yes! Xe said xe is free after 1',
            },
        ])
        expect(scene.lines.find((l) => l.from === 'me')?.sender).toBe('You')
    })

    it('renders every scene for every kind of set without leftover slots', () => {
        for (const hash of [
            'n=Tara&p=xe',
            'n=Sam&p=they',
            'n=Tara',
            'n=Tara&p=:void',
            'p=she',
        ]) {
            for (const scene of renderSession(person(hash), seeded(7))) {
                for (const line of scene.lines) {
                    expect(line.text).not.toMatch(/[{}]/)
                }
            }
        }
    })
})

describe('scene data', () => {
    const THIRD_PERSON =
        /\b(he|him|his|himself|she|her|hers|herself|they|them|their|theirs|themself|themselves)\b/i

    it('has 4 scenes with unique ids', () => {
        expect(SCENES).toHaveLength(4)
        expect(new Set(SCENES.map((s) => s.id)).size).toBe(4)
    })

    it('uses {name} in every scene', () => {
        for (const scene of SCENES) {
            expect(
                scene.lines.some((l) => slotsIn(l.text).includes('name')),
            ).toBe(true)
        }
    })

    it('covers every form in a me line and in a friend line', () => {
        const me = new Set<string>()
        const friends = new Set<string>()
        for (const line of SCENES.flatMap((s) => s.lines)) {
            for (const slot of slotsIn(line.text)) {
                ;(line.from === 'me' ? me : friends).add(slot)
            }
        }
        for (const key of FORM_KEYS) {
            expect(me, `me lines use ${key}`).toContain(key)
            expect(friends, `friend lines use ${key}`).toContain(key)
        }
    })

    it('every scene has at least one me line', () => {
        for (const scene of SCENES) {
            expect(scene.lines.some((l) => l.from === 'me')).toBe(true)
        }
    })

    for (const line of SCENES.flatMap((s) => s.lines)) {
        it(`follows the writing rules: ${line.text}`, () => {
            expect(line.text).not.toMatch(/\}['’](s|re|ll|d|ve|m)\b/)
            expect(line.text.replace(/\{[^{}]*\}/g, '')).not.toMatch(
                THIRD_PERSON,
            )
            expect(line.text).not.toMatch(/[—←-⇿]/)
            // Verb pairs only agree with the pronoun, never with {name}.
            expect(line.text).not.toMatch(/\{name\}\s+\{[^{}]*\|/)
        })
    }
})
