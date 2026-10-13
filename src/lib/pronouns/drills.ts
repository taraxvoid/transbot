import { FORM_KEYS, type FormKey, type Forms } from './types'

export const XE_FORMS: Forms = {
    pronoun_subject: 'xe',
    pronoun_object: 'xem',
    possessive_determiner: 'xyr',
    possessive_pronoun: 'xyrs',
    reflexive: 'xemself',
}

export type Blank = { key: FormKey; capitalize: boolean }
export type Drill = { parts: Array<string | Blank> }

/** Past tense on purpose, so verbs agree with singular and plural sets. */
export const SANDWICH_TEMPLATES: readonly string[] = [
    '{pronoun_subject} bought a sandwich, I ate {possessive_determiner} sandwich, I bought {pronoun_object} a new sandwich.',
    'The sandwich is {possessive_pronoun}.',
    '{pronoun_subject} made it {reflexive}.',
]

const XE_ROLES = new Map<string, FormKey>(
    FORM_KEYS.map((key) => [XE_FORMS[key], key]),
)
const PLACEHOLDER = /\{(\w+)\}/g
const SENTENCE_START = /(^|[.!?]\s+)$/

export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Splits "xyrs." into ["", "xyrs", "."]. Inner apostrophes stay in the word. */
function splitToken(token: string): [string, string, string] {
    const match = token.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u)
    return match ? [match[1], match[2], match[3]] : ['', token, '']
}

/**
 * Turns filled-in example sentences into templates such as
 * "I met {pronoun_object} recently." Each sentence is aligned word by word
 * with the same sentence for xe, whose forms are all distinct, to learn which
 * form each word is.
 */
export function templatize(
    examples: string[],
    forms: Forms,
    xeExamples: string[],
): string[] {
    const templates: string[] = []
    examples.forEach((sentence, i) => {
        const xe = xeExamples[i]
        if (!xe) return
        const tokens = sentence.split(' ')
        const xeTokens = xe.split(' ')
        if (tokens.length !== xeTokens.length) return
        let aligned = true
        let blanks = 0
        const out = tokens.map((token, j) => {
            const role = XE_ROLES.get(splitToken(xeTokens[j])[1].toLowerCase())
            if (!role) return token
            const [lead, word, trail] = splitToken(token)
            if (word.toLowerCase() !== forms[role].toLowerCase()) {
                aligned = false
                return token
            }
            blanks++
            return `${lead}{${role}}${trail}`
        })
        if (aligned && blanks > 0) templates.push(out.join(' '))
    })
    return templates
}

export function parseTemplate(template: string): Drill {
    const parts: Drill['parts'] = []
    let last = 0
    for (const match of template.matchAll(PLACEHOLDER)) {
        const key = match[1] as FormKey
        if (!FORM_KEYS.includes(key)) continue
        const start = match.index ?? 0
        if (start > last) parts.push(template.slice(last, start))
        parts.push({
            key,
            capitalize: SENTENCE_START.test(template.slice(0, start)),
        })
        last = start + match[0].length
    }
    if (last < template.length) parts.push(template.slice(last))
    return { parts }
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
}

/** The sandwich lines first, then the examples in random order. */
export function drillsFor(templates: string[], rng: () => number): Drill[] {
    return [...SANDWICH_TEMPLATES, ...shuffle(templates, rng)].map(
        parseTemplate,
    )
}
