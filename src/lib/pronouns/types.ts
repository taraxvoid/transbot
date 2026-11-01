export const FORM_KEYS = [
    'pronoun_subject',
    'pronoun_object',
    'possessive_determiner',
    'possessive_pronoun',
    'reflexive',
] as const

export type FormKey = (typeof FORM_KEYS)[number]
export type Forms = Record<FormKey, string>
export type Pronunciations = Partial<Record<FormKey, string>>

/** A name or pronoun value after private and ignored opinions are dropped. */
export type Entry = { value: string; opinion: 'yes' | 'meh' }
export type Entries = { names: Entry[]; pronouns: Entry[] }

export type PronounSet = {
    /** 'name' means "use the name instead of pronouns" (null, :Name). */
    kind: 'pronouns' | 'name'
    /** "xe/xem", "void/void's", or the name for kind 'name'. */
    label: string
    forms: Forms
    /** Verb agreement: "they are", not "they is". Name and void sets are singular. */
    plural: boolean
    pronunciations: Pronunciations
    opinion: 'yes' | 'meh'
}

/** Everything the browser gets about a person. Already filtered. */
export type Identity = {
    names: { preferred: string | null; accepted: string[] }
    /** yes sets in card order, then meh sets in card order. */
    sets: PronounSet[]
    /** 'only': ask-me is the first yes entry, no drills. 'note': elsewhere. */
    askMe: 'only' | 'note' | null
    /** Example sentences with {form_key} placeholders, for the modeled set. */
    templates: string[]
}
