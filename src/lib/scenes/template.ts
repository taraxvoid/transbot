import { FORM_KEYS, type FormKey, type Forms } from '../pronouns/types'

/** Who the chat is about, already resolved from the identity. */
export type Person = {
    /** Preferred name, or null for the "our friend" fallback. */
    name: string | null
    forms: Forms
    plural: boolean
}

export const NO_NAME = 'our friend'

const SLOT = /\{([^{}]+)\}/g
const SENTENCE_START = /(^|[.!?]\s+)$/

export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

function isFormKey(key: string): key is FormKey {
    return (FORM_KEYS as readonly string[]).includes(key)
}

function resolveSlot(slot: string, person: Person): string {
    if (slot === 'name') return person.name ?? NO_NAME
    if (isFormKey(slot)) return person.forms[slot]
    const pair = slot.split('|')
    if (pair.length === 2 && pair[0] && pair[1]) {
        return person.plural ? pair[1] : pair[0]
    }
    throw new Error(`Unknown template slot {${slot}}`)
}

/** The slots a template uses, in order, without braces. */
export function slotsIn(template: string): string[] {
    return [...template.matchAll(SLOT)].map((m) => m[1])
}

/**
 * Fills `{name}`, the five form keys and `{singular|plural}` verb pairs.
 * A slot at the start of a sentence is capitalized.
 */
export function fill(template: string, person: Person): string {
    let out = ''
    let last = 0
    for (const match of template.matchAll(SLOT)) {
        const start = match.index ?? 0
        out += template.slice(last, start)
        const value = resolveSlot(match[1], person)
        out += SENTENCE_START.test(out) ? capitalize(value) : value
        last = start + match[0].length
    }
    return out + template.slice(last)
}
