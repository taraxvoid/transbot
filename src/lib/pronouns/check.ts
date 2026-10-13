import { type Blank, capitalize } from './drills'
import { modeledSet } from './identity'
import {
    FORM_KEYS,
    type FormKey,
    type Identity,
    type PronounSet,
} from './types'

/** Other spellings accepted for a form. Singular "themself" is valid too. */
const ALTERNATES: Record<string, string[]> = { themselves: ['themself'] }

const S: FormKey[] = ['pronoun_subject']
const O: FormKey[] = ['pronoun_object']
const D: FormKey[] = ['possessive_determiner']
const P: FormKey[] = ['possessive_pronoun']
const R: FormKey[] = ['reflexive']
const OD: FormKey[] = ['pronoun_object', 'possessive_determiner']
const DP: FormKey[] = ['possessive_determiner', 'possessive_pronoun']

/**
 * Third-person pronouns free typing knows about. A Map, not an object, so
 * words like "constructor" never match a prototype key.
 */
const LEXICON = new Map<string, FormKey[]>([
    ['he', S],
    ['him', O],
    ['his', DP],
    ['himself', R],
    ['she', S],
    ['her', OD],
    ['hers', P],
    ['herself', R],
    ['they', S],
    ['them', O],
    ['their', D],
    ['theirs', P],
    ['themself', R],
    ['themselves', R],
    ['xe', S],
    ['xem', O],
    ['xyr', D],
    ['xyrs', P],
    ['xemself', R],
    ['ze', S],
    ['zir', OD],
    ['zirs', P],
    ['zirself', R],
    ['hir', OD],
    ['hirs', P],
    ['hirself', R],
    ['ey', S],
    ['em', O],
    ['eir', D],
    ['eirs', P],
    ['emself', R],
    ['fae', S],
    ['faer', OD],
    ['faers', P],
    ['faerself', R],
])

export function normalize(text: string): string {
    return text.normalize('NFC').trim().toLowerCase().replaceAll('’', "'")
}

function spellings(form: string): string[] {
    const f = normalize(form)
    return [f, ...(ALTERNATES[f] ?? [])]
}

export type BlankResult = {
    correct: boolean
    expected: string
    pronunciation?: string
}

export function checkBlank(
    answer: string,
    blank: Blank,
    identity: Identity,
): BlankResult {
    const modeled = modeledSet(identity)
    if (!modeled)
        throw new Error('checkBlank needs an identity with a modeled set')
    const given = normalize(answer)
    // Any accepted set counts, so mixing sets within one sentence is fine.
    const correct =
        given !== '' &&
        identity.sets.some((set) =>
            spellings(set.forms[blank.key]).includes(given),
        )
    const form = modeled.forms[blank.key]
    return {
        correct,
        expected: blank.capitalize ? capitalize(form) : form,
        pronunciation: modeled.pronunciations[blank.key],
    }
}

export type Note = { text: string; suggestion?: string }

function pronounNote(
    word: string,
    keys: FormKey[],
    identity: Identity,
    modeled: PronounSet | null,
): Note | null {
    const name = identity.names.preferred
    if (identity.askMe === 'only') {
        return {
            text: name
                ? `"${word}": ask ${name} which pronouns to use.`
                : `"${word}": ask which pronouns to use.`,
        }
    }
    // Nothing on the card to compare against, and we never guess.
    if (!modeled) return null
    const suggestion = [...new Set(keys.map((key) => modeled.forms[key]))].join(
        ' or ',
    )
    if (modeled.kind === 'name') {
        return {
            text: `"${word}": ${modeled.label} goes by name, not pronouns,`,
            suggestion,
        }
    }
    const who = name ? `${name} uses` : 'The card lists'
    return { text: `"${word}": ${who} ${modeled.label},`, suggestion }
}

/**
 * Soft notes for free typing. "her" might be someone else, so notes suggest
 * rather than correct.
 */
export function checkFreeText(text: string, identity: Identity): Note[] {
    const notes: Note[] = []
    const modeled = modeledSet(identity)
    const fine = new Set([
        ...identity.sets.flatMap((set) =>
            FORM_KEYS.flatMap((key) => spellings(set.forms[key])),
        ),
        ...identity.names.accepted.map(normalize),
    ])
    const seen = new Set<string>()
    for (const [word] of text.toLowerCase().matchAll(/\p{L}+/gu)) {
        const keys = LEXICON.get(word)
        if (!keys || fine.has(word) || seen.has(word)) continue
        seen.add(word)
        const note = pronounNote(word, keys, identity, modeled)
        if (note) notes.push(note)
    }
    return notes
}
