import { describe, expect, it } from 'vitest'
import type { RawPronoun } from '../../src/lib/pronouns/client'
import {
    buildIdentity,
    entriesFromQuery,
} from '../../src/lib/pronouns/identity'
import { FORM_KEYS, type Identity } from '../../src/lib/pronouns/types'
import { FRIEND_POOL, pickFriends } from '../../src/lib/scenes/friends'
import {
    chatPerson,
    pickPerson,
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

function identity(query: string): Identity {
    const entries = entriesFromQuery(query)
    if (!entries) throw new Error(`no entries for ${query}`)
    return buildIdentity(entries, fetched, xe.examples)
}

function person(query: string): Person {
    const p = chatPerson(identity(query))
    if (!p) throw new Error(`no person for ${query}`)
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

describe('secondary sets', () => {
    const both = () => person('n=Tara&p=xe&p=she')

    it('keeps other yes sets as secondary, but not meh ones', () => {
        expect(both().forms.pronoun_subject).toBe('xe')
        expect(both().secondary?.map((s) => s.forms.pronoun_subject)).toEqual([
            'she',
        ])
        expect(person('n=Tara&p=xe').secondary).toBeUndefined()
    })

    it('gives each secondary a one in three chance', () => {
        const p = both()
        expect(pickPerson(p, () => 0).forms.pronoun_subject).toBe('she')
        expect(pickPerson(p, () => 0.33).forms.pronoun_subject).toBe('she')
        expect(pickPerson(p, () => 0.34).forms.pronoun_subject).toBe('xe')
        expect(pickPerson(p, () => 0.99).forms.pronoun_subject).toBe('xe')
    })

    it('keeps the name from a :Name set in pronoun scenes', () => {
        const p = person('p=:Kai&p=xe')
        expect(p.name).toBe('Kai')
        expect(p.secondary?.[0].name).toBe('Kai')
        const q = person('p=xe&p=:Kai')
        expect(q.name).toBe('Kai')
        expect(q.forms.pronoun_subject).toBe('xe')
    })

    it('never makes the primary less likely than one secondary', () => {
        const mk = (n: number): Person => ({
            ...both(),
            secondary: Array.from({ length: n }, (_, i) => ({
                ...both(),
                name: `s${i}`,
            })),
        })
        for (const n of [1, 2, 3, 5]) {
            const counts = new Map<string, number>()
            const steps = 6000
            const person = mk(n)
            for (let i = 0; i < steps; i++) {
                const who = pickPerson(person, () => (i + 0.5) / steps)
                counts.set(
                    who.name ?? '',
                    (counts.get(who.name ?? '') ?? 0) + 1,
                )
            }
            const primary = counts.get('Tara') ?? 0
            for (let i = 0; i < n; i++) {
                expect(primary).toBeGreaterThanOrEqual(
                    (counts.get(`s${i}`) ?? 0) - 1,
                )
            }
        }
    })

    it('uses both sets across a session', () => {
        const used = new Set<string>()
        for (let seed = 1; seed < 20; seed++) {
            for (const scene of renderSession(both(), seeded(seed))) {
                const text = scene.lines.map((l) => l.text).join(' ')
                if (/\bxe\b/i.test(text)) used.add('xe')
                if (/\bshe\b/i.test(text)) used.add('she')
            }
        }
        expect(used).toEqual(new Set(['xe', 'she']))
    })
})

describe('pickFriends', () => {
    it('never repeats a friend or takes the person name', () => {
        for (let seed = 1; seed < 300; seed++) {
            const [a, b] = pickFriends(['sam'], seeded(seed))
            expect(a).not.toBe(b)
            expect([a, b]).not.toContain('Sam')
            expect(FRIEND_POOL).toContain(a)
            expect(FRIEND_POOL).toContain(b)
        }
    })

    it('never takes a name used in place of pronouns', () => {
        const p = person('n=Tara&p=:Kai')
        expect(p.name).toBe('Tara')
        for (let seed = 1; seed < 300; seed++) {
            for (const scene of renderSession(p, seeded(seed))) {
                const friends = scene.lines.map((l) => l.sender)
                expect(friends).not.toContain('Kai')
                expect(friends).not.toContain('Tara')
            }
        }
    })

    it('matches names regardless of Unicode normalization', () => {
        const decomposed = 'Luci\u0301a'
        for (let seed = 1; seed < 300; seed++) {
            expect(pickFriends([decomposed], seeded(seed))).not.toContain(
                'Lucía',
            )
        }
    })

    it('works without a name', () => {
        const [a, b] = pickFriends([null], () => 0.999)
        expect(a).not.toBe(b)
    })
})

describe('renderScene', () => {
    it('fills senders and text', () => {
        const scene = renderScene(SCENES[0], person('n=Tara&p=xe'), [
            'Alex',
            'Priya',
        ])
        expect(scene.lines.slice(0, 2)).toEqual([
            {
                from: 'a',
                sender: 'Alex',
                text: 'I accidentally ate xyr sandwich the other day',
            },
            {
                from: 'a',
                sender: 'Alex',
                text: 'It even had a sign with Tara on it and everything',
            },
        ])
        expect(scene.lines.find((l) => l.from === 'me')?.sender).toBe('You')
    })

    it('fills templates in the group title', () => {
        const scene = renderScene(
            { ...SCENES[0], group: 'belated bday for {name}' },
            person('n=Tara&p=xe'),
            ['Alex', 'Priya'],
        )
        expect(scene.group).toBe('belated bday for Tara')
    })

    it('renders every scene for every kind of set without leftover slots', () => {
        for (const query of [
            'n=Tara&p=xe',
            'n=Sam&p=they',
            'n=Tara',
            'n=Tara&p=:void',
            'p=she',
        ]) {
            for (const scene of renderSession(person(query), seeded(7))) {
                expect(scene.group).not.toMatch(/[{}]/)
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

    it('uses every pronoun form somewhere in the scenes', () => {
        const used = new Set(
            SCENES.flatMap((s) => s.lines).flatMap((l) => slotsIn(l.text)),
        )
        for (const key of FORM_KEYS) {
            expect(used, `scenes use ${key}`).toContain(key)
        }
    })

    it('every scene has exactly one me line', () => {
        for (const scene of SCENES) {
            expect(scene.lines.filter((l) => l.from === 'me')).toHaveLength(1)
        }
    })

    for (const line of SCENES.flatMap((s) => s.lines)) {
        it(`follows the writing rules: ${line.text}`, () => {
            // "{name}'s" is a safe possessive; any other slot + clitic
            // ("they's", "xe'd") is not.
            expect(line.text.replace(/\{name\}'s\b/g, '')).not.toMatch(
                /\}['’](s|re|ll|d|ve|m)\b/,
            )
            expect(line.text.replace(/\{[^{}]*\}/g, '')).not.toMatch(
                THIRD_PERSON,
            )
            expect(line.text).not.toMatch(/[—←-⇿]/)
            // Verb pairs only agree with the pronoun, never with {name}.
            expect(line.text).not.toMatch(/\{name\}\s+\{[^{}]*\|/)
        })
    }
})
