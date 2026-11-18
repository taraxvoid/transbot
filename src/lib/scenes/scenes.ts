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
        group: 'sandwich remuneration',
        lines: [
            {
                from: 'a',
                text: "I accidentally ate {possessive_determiner} sandwich, I didn't see it said {name}",
            },
            {
                from: 'a',
                text: 'I hope {pronoun_subject} {is|are} not too peeved',
            },
            {
                from: 'b',
                text: 'bro you gotta make it right, that sandwich was {possessive_pronoun}',
            },
            {
                from: 'a',
                text: "I'll get {pronoun_object} a banh mi and Vietnamese iced coffee and hope it makes up to {pronoun_object}",
            },
            {
                from: 'me',
                text: 'Buy {pronoun_subject} two just in case (so I can snag one)',
            },
            {
                from: 'b',
                text: '{pronoun_subject} {has|have} got you eating out of {possessive_determiner} hand :D',
            },
        ],
    },
    {
        id: 'gift',
        group: 'belated bday for {name}',
        lines: [
            {
                from: 'a',
                text: 'dangit I forgot the bday of {name} was last week - what does {pronoun_subject} want?',
            },
            {
                from: 'b',
                text: 'A haunted doll? I saw one on ebay the other day (it certainly saw me)',
            },
            {
                from: 'a',
                text: 'Nah I want to get {pronoun_object} something a bit less.... freaky. Or more freaky?',
            },
            {
                from: 'me',
                text: 'How about something {pronoun_subject} would never buy for {reflexive}?',
            },
            {
                from: 'b',
                text: 'Good idea, Stompy goth boots and fishnets it is.',
            },
            {
                from: 'a',
                text: "I'll ask {possessive_determiner} size",
            },
        ],
    },
    {
        id: 'late',
        group: 'Grrlx Rox Show @ The Quadrangle',
        lines: [
            {
                from: 'a',
                text: 'opening band just went on, Where is {name}???',
            },
            {
                from: 'b',
                text: "{pronoun_subject} DM'd me the BART is 10m late",
            },
            {
                from: 'me',
                text: "Let's pickup {possessive_determiner} ticket and meet {pronoun_subject} at merch",
            },
            {
                from: 'me',
                text: 'The spot by the stage is {possessive_pronoun} to claim',
            },
            {
                from: 'b',
                text: "I'll get a spot near the stage like {pronoun_subject} {likes|like}!!",
            },
            {
                from: 'a',
                text: 'and nab {pronoun_object} a tour t-shirt before the merch sells out, {pronoun_subject} will treat {reflexive} to a poster too',
            },
        ],
    },
    {
        id: 'moving',
        group: 'Pizza and Chill',
        lines: [
            {
                from: 'a',
                text: 'Did you hear {name} needs help moving Sunday?',
            },
            {
                from: 'b',
                text: "TIL, let's pwn those boxes",
            },
            {
                from: 'me',
                text: "I won't make {pronoun_object} carry the ceiling mirror by {reflexive}",
            },
            {
                from: 'a',
                text: "I'll bring the detestable Hawaiian pizza, the last slice is {possessive_pronoun}",
            },
            { from: 'b', text: 'sg, cya then' },
            {
                from: 'a',
                text: "I've been training for this my whole life [flexes rippling biceps]",
            },
        ],
    },
]
