import type {
    RawEntry,
    RawLocaleProfile,
    RawProfile,
    RawPronoun,
} from './client'
import { templatize, XE_FORMS } from './drills'
import { parsePronounInput, SITE_PREFIX } from './parse'
import {
    type Entries,
    type Entry,
    FORM_KEYS,
    type Forms,
    type Identity,
    type PronounSet,
} from './types'

type BareSet = Omit<PronounSet, 'opinion'>
type Resolved = { sets: BareSet[]; examples: string[] | null }

// Only these survive. close, jokingly and every custom opinion (anything that
// isn't a built-in key, so new custom opinions are private by default) are
// dropped here, before anything is displayed, taught or graded. no is dropped
// too: those names are often deadnames, and transbot never republishes them.
const KEPT = new Set(['yes', 'meh'])

export const VOID_FORMS: Forms = {
    pronoun_subject: 'void',
    pronoun_object: 'void',
    possessive_determiner: "void's",
    possessive_pronoun: "void's",
    reflexive: 'voidself',
}

export function normalizePronounValue(value: string): string {
    return value.trim().replace(SITE_PREFIX, '').replace(/^\/+/, '')
}

function keep(
    raw: RawEntry[] | undefined,
    clean: (value: string) => string,
): Entry[] {
    const kept: Entry[] = []
    for (const entry of raw ?? []) {
        if (typeof entry?.value !== 'string' || !KEPT.has(entry.opinion)) {
            continue
        }
        const value = clean(entry.value)
        if (value)
            kept.push({ value, opinion: entry.opinion as Entry['opinion'] })
    }
    return kept
}

export function entriesFromProfile(profile: RawProfile): Entries | null {
    const locales: RawLocaleProfile[] = Array.isArray(profile.profiles)
        ? profile.profiles
        : Object.entries(profile.profiles ?? {}).map(([locale, p]) => ({
              ...p,
              locale,
          }))
    const en = locales.find((p) => p?.locale === 'en')
    if (!en) return null
    return {
        names: keep(en.names, (v) => v.trim()),
        pronouns: keep(en.pronouns, normalizePronounValue),
    }
}

export function entriesFromFragment(hash: string): Entries | null {
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    let name = params.get('n')?.trim() ?? ''
    const typed: string[] = []
    // A hand-typed `p=xe&she` or `n=Sam&Jo` arrives as the key plus an empty
    // `she` / `Jo` key. Rejoin an empty key to whichever of n or p came
    // right before it, so no part of a name ever ends up in p (which is
    // fetched from pronouns.page). Other stray keys are dropped.
    let last: 'n' | 'p' | null = null
    for (const [key, value] of params) {
        if (key === 'n') last = key
        else if (key === 'p') {
            last = key
            typed.push(value)
        } else if (value === '' && last === 'n' && name) name += `&${key}`
        else if (value === '' && last === 'p' && typed.at(-1)?.trim()) {
            typed[typed.length - 1] += `&${key}`
        }
    }
    // Each p may be typed by hand, like `he/they`, so parse it like the
    // builder does.
    const pronouns = [...new Set(typed.flatMap(parsePronounInput))]
    if (!name && !pronouns.length) return null
    return {
        names: name ? [{ value: name, opinion: 'yes' }] : [],
        pronouns: pronouns.map((value) => ({ value, opinion: 'yes' })),
    }
}

function isSpecial(value: string): boolean {
    return value === 'null' || value === 'ask-me' || value.startsWith(':')
}

export function pronounValuesToFetch(entries: Entries): string[] {
    return [
        ...new Set(
            entries.pronouns
                .filter((e) => !isSpecial(e.value))
                .map((e) => e.value),
        ),
    ]
}

function labelFor(forms: Forms): string {
    const second =
        forms.pronoun_object === forms.pronoun_subject
            ? forms.possessive_determiner
            : forms.pronoun_object
    return `${forms.pronoun_subject}/${second}`
}

/** The name in every slot, same shape pronouns.page uses for :Name. */
export function nameForms(name: string): Forms {
    return {
        pronoun_subject: name,
        pronoun_object: name,
        possessive_determiner: `${name}'s`,
        possessive_pronoun: `${name}'s`,
        reflexive: `${name}self`,
    }
}

/** "Use the name instead of pronouns". */
function nameSet(name: string): BareSet {
    return {
        kind: 'name',
        label: name,
        forms: nameForms(name),
        plural: false,
        pronunciations: {},
    }
}

function splitSets(raw: RawPronoun): BareSet[] {
    const forms = FORM_KEYS.map((key) =>
        (raw.morphemes?.[key] ?? '').split('&'),
    )
    const sounds = FORM_KEYS.map((key) =>
        (raw.pronunciations?.[key] ?? '').split('&'),
    )
    const count = Math.min(...forms.map((f) => f.length))
    const sets: BareSet[] = []
    for (let i = 0; i < count; i++) {
        const setForms = Object.fromEntries(
            FORM_KEYS.map((key, k) => [key, forms[k][i].trim()]),
        ) as Forms
        if (FORM_KEYS.some((key) => !setForms[key])) continue
        const pronunciations = Object.fromEntries(
            FORM_KEYS.flatMap((key, k) =>
                sounds[k][i]?.trim() ? [[key, sounds[k][i].trim()]] : [],
            ),
        )
        sets.push({
            kind: 'pronouns',
            label: labelFor(setForms),
            forms: setForms,
            // pronouns.page marks written-out sets singular, even
            // they/them/their/theirs/themself, so trust the subject too.
            plural:
                raw.plural?.[i] === true ||
                setForms.pronoun_subject.toLowerCase() === 'they',
            pronunciations,
        })
    }
    return sets
}

function resolveEntry(
    value: string,
    preferred: string | null,
    fetched: Record<string, RawPronoun | null>,
): Resolved | null {
    if (value === 'null') {
        return preferred ? { sets: [nameSet(preferred)], examples: null } : null
    }
    if (value === ':void') {
        const set: BareSet = {
            kind: 'pronouns',
            label: labelFor(VOID_FORMS),
            forms: VOID_FORMS,
            plural: false,
            pronunciations: {},
        }
        return { sets: [set], examples: null }
    }
    if (value.startsWith(':')) {
        const name = value.slice(1).trim()
        return name ? { sets: [nameSet(name)], examples: null } : null
    }
    const raw = fetched[value]
    if (!raw) return null
    const sets = splitSets(raw)
    return sets.length ? { sets, examples: raw.examples ?? [] } : null
}

function uniqueCaseless(values: string[]): string[] {
    const seen = new Set<string>()
    return values.filter((v) => {
        const key = v.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

export function buildIdentity(
    entries: Entries,
    fetched: Record<string, RawPronoun | null>,
    xeExamples: string[],
): Identity {
    const preferred =
        entries.names.find((n) => n.opinion === 'yes')?.value ?? null
    const accepted = uniqueCaseless(entries.names.map((n) => n.value))

    const sets: PronounSet[] = []
    let askMe: Identity['askMe'] = null
    let modeledExamples: string[] | null = null
    let sawYes = false
    const ordered = [
        ...entries.pronouns.filter((e) => e.opinion === 'yes'),
        ...entries.pronouns.filter((e) => e.opinion === 'meh'),
    ]
    for (const entry of ordered) {
        const opinion = entry.opinion as PronounSet['opinion']
        const firstYes = opinion === 'yes' && !sawYes
        if (entry.value === 'ask-me') {
            if (firstYes) askMe = 'only'
            else askMe ??= 'note'
            sawYes ||= opinion === 'yes'
            continue
        }
        const resolved = resolveEntry(entry.value, preferred, fetched)
        if (!resolved) continue
        if (firstYes) modeledExamples = resolved.examples
        sawYes ||= opinion === 'yes'
        for (const set of resolved.sets) {
            if (!sets.some((s) => s.label === set.label)) {
                sets.push({ ...set, opinion })
            }
        }
    }

    const identity: Identity = {
        names: { preferred, accepted },
        sets,
        askMe,
        templates: [],
    }
    const modeled = modeledSet(identity)
    if (modeled) {
        // Name and void sets have no examples of their own; xe's sentences
        // are singular and fit them.
        identity.templates = modeledExamples
            ? templatize(modeledExamples, modeled.forms, xeExamples)
            : templatize(xeExamples, XE_FORMS, xeExamples)
    }
    return identity
}

/** The set the site teaches: the first yes set, unless ask-me comes first. */
export function modeledSet(identity: Identity): PronounSet | null {
    if (identity.askMe === 'only') return null
    const first = identity.sets[0]
    return first?.opinion === 'yes' ? first : null
}

export function setLabel(set: PronounSet): string {
    return set.kind === 'name' ? `${set.label} instead of pronouns` : set.label
}

export type Summary = {
    teach: string[]
    accept: string[]
    askMe: Identity['askMe']
    nothingToTeach: boolean
}

export function summarize(identity: Identity): Summary {
    const { preferred, accepted } = identity.names
    const yes = identity.sets.filter((s) => s.opinion === 'yes')
    const meh = identity.sets.filter((s) => s.opinion === 'meh')
    // With ask-me first, nothing is taught; later yes sets are only accepted.
    const askFirst = identity.askMe === 'only'
    return {
        teach: [
            ...(preferred ? [preferred] : []),
            ...(askFirst ? [] : yes.map(setLabel)),
        ],
        accept: [
            ...accepted.filter((n) => n !== preferred),
            ...(askFirst ? yes.map(setLabel) : []),
            ...meh.map(setLabel),
        ],
        askMe: identity.askMe,
        nothingToTeach:
            preferred === null && yes.length === 0 && identity.askMe !== 'only',
    }
}
