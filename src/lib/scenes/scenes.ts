export type Line = { from: 'a' | 'b' | 'me'; text: string }
export type Scene = { id: string; group: string; lines: Line[] }

/**
 * Writing rules (unit-tested where possible):
 * - No contraction right after a slot ("xe is", not "xe's"): "they's" and
 *   "Tara's" (for "Tara is") break.
 * - Verb pairs like {is|are} only agree with {pronoun_subject}. After {name}
 *   use a plain singular verb.
 * - No third-person pronouns outside slots, so the only ones on screen are
 *   the person's.
 * - Nothing that reads as a fact about the real person.
 * - No em dashes or unicode arrows.
 */
export const SCENES: readonly Scene[] = [
    {
        id: 'lunch',
        group: 'Lunch crew',
        lines: [
            { from: 'a', text: 'Is {name} still coming Saturday?' },
            {
                from: 'b',
                text: 'Yes! {pronoun_subject} said {pronoun_subject} {is|are} free after 1',
            },
            {
                from: 'a',
                text: 'Which place {does|do} {pronoun_subject} like?',
            },
            {
                from: 'b',
                text: 'The ramen spot. {pronoun_subject} loved {possessive_determiner} bowl last time',
            },
            {
                from: 'me',
                text: "Sure, let's confirm the time with {pronoun_object}",
            },
            { from: 'a', text: "Perfect, I'll text {pronoun_object} now" },
        ],
    },
    {
        id: 'gift',
        group: 'Gift ideas',
        lines: [
            { from: 'a', text: 'Birthday ideas for {name}?' },
            { from: 'b', text: 'A scarf? I saw a green one at the market' },
            {
                from: 'a',
                text: 'Wait, is the green scarf in the group photo {possessive_pronoun}?',
            },
            {
                from: 'me',
                text: 'No, {possessive_pronoun} is the red one. Green would be new',
            },
            {
                from: 'b',
                text: 'Great. {pronoun_subject} would never buy it for {reflexive}',
            },
            {
                from: 'me',
                text: "I'll chip in. Let's give it to {pronoun_object} at lunch",
            },
        ],
    },
    {
        id: 'late',
        group: 'Show tonight',
        lines: [
            { from: 'a', text: 'Doors open at 7. Where is {name}?' },
            {
                from: 'me',
                text: '{pronoun_subject} texted. {possessive_determiner} train is late',
            },
            { from: 'b', text: 'Should we wait for {pronoun_object} outside?' },
            {
                from: 'me',
                text: "Yes, let's hold {possessive_determiner} ticket until {pronoun_subject} {gets|get} here",
            },
            { from: 'a', text: "Deal. I'll grab {pronoun_object} a drink" },
        ],
    },
    {
        id: 'moving',
        group: 'Moving crew',
        lines: [
            { from: 'a', text: 'Who is helping {name} move on Sunday?' },
            {
                from: 'b',
                text: 'Me! {pronoun_subject} {has|have} so many boxes',
            },
            {
                from: 'me',
                text: "Count me in. Let's not make {pronoun_object} carry the couch by {reflexive}",
            },
            {
                from: 'a',
                text: 'Ha. {pronoun_subject} tried to lift it {reflexive} last time',
            },
            { from: 'b', text: 'See you all at 10' },
        ],
    },
]
