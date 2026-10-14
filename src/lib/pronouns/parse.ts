export const SITE_PREFIX = /^https?:\/\/[^/]*pronouns\.page\/+/i

type KnownSet = {
    /** What pronouns.page resolves to this set. */
    value: string
    label: string
    /** Subject first. */
    forms: string[]
    /** The five forms pronouns.page gives `value`, in FORM_KEYS order. */
    full: string
}

/**
 * Sets people commonly type in short. Bare "ze" resolves to ze/hir on
 * pronouns.page, so ze/zir needs its own value. Order matters: a word shared
 * by several sets (only "ze") picks the first until a later word narrows it.
 */
export const KNOWN_SETS: KnownSet[] = [
    {
        value: 'she',
        label: 'she/her',
        forms: ['she', 'her', 'hers', 'herself'],
        full: 'she/her/her/hers/herself',
    },
    {
        value: 'he',
        label: 'he/him',
        forms: ['he', 'him', 'his', 'himself'],
        full: 'he/him/his/his/himself',
    },
    {
        value: 'they',
        label: 'they/them',
        forms: ['they', 'them', 'their', 'theirs', 'themself', 'themselves'],
        full: 'they/them/their/theirs/themselves',
    },
    {
        value: 'xe',
        label: 'xe/xem',
        forms: ['xe', 'xem', 'xyr', 'xyrs', 'xemself'],
        full: 'xe/xem/xyr/xyrs/xemself',
    },
    {
        value: 'ze',
        label: 'ze/hir',
        forms: ['ze', 'hir', 'hirs', 'hirself'],
        full: 'ze/hir/hir/hirs/hirself',
    },
    {
        value: 'ze/zir',
        label: 'ze/zir',
        forms: ['ze', 'zir', 'zirs', 'zirself'],
        full: 'ze/zir/zir/zirs/zirself',
    },
    {
        value: 'fae',
        label: 'fae/faer',
        forms: ['fae', 'faer', 'faers', 'faerself'],
        full: 'fae/faer/faer/faers/faerself',
    },
    {
        value: 'it',
        label: 'it/its',
        forms: ['it', 'its', 'itself'],
        full: 'it/it/its/its/itself',
    },
    {
        value: 'ey',
        label: 'ey/em',
        forms: ['ey', 'em', 'eir', 'eirs', 'emself'],
        full: 'ey/em/eir/eirs/emself',
    },
    {
        value: 'ae',
        label: 'ae/aer',
        forms: ['ae', 'aer', 'aers', 'aerself'],
        full: 'ae/aer/aer/aers/aerself',
    },
]

const CHUNK_SEPARATOR = /[\s,;]+|\b(?:and|or)\b/i
const SET_SEPARATOR = /[&+|]+/

type Group =
    | { kind: 'known'; candidates: KnownSet[] }
    | { kind: 'other'; parts: string[] }

function setsWith(word: string): KnownSet[] {
    return KNOWN_SETS.filter((set) => set.forms.includes(word))
}

function isSpecial(word: string): boolean {
    return word === 'null' || word === 'ask-me' || word.startsWith(':')
}

/** Splits one slash-joined piece, like "he/they" or "she/her/hers". */
function groupsOf(piece: string): string[] {
    const groups: Group[] = []
    for (const part of piece.split('/')) {
        const raw = part.trim()
        if (!raw) continue
        const word = raw.toLowerCase()
        const current = groups.at(-1)
        if (isSpecial(word)) {
            // :Name keeps its case, it's a name.
            groups.push({
                kind: 'other',
                parts: [word.startsWith(':') ? raw : word],
            })
            groups.push({ kind: 'other', parts: [] })
            continue
        }
        const known = setsWith(word)
        if (current?.kind === 'known') {
            const narrowed = current.candidates.filter((s) => known.includes(s))
            // A subject always starts a new set: "he/she" is two sets.
            if (narrowed.length && narrowed[0].forms[0] !== word) {
                current.candidates = narrowed
                continue
            }
        }
        if (known.length) groups.push({ kind: 'known', candidates: known })
        else if (current?.kind === 'other') current.parts.push(word)
        else groups.push({ kind: 'other', parts: [word] })
    }
    const values = groups.flatMap((g) =>
        g.kind === 'known'
            ? [g.candidates[0].value]
            : g.parts.length
              ? [g.parts.join('/')]
              : [],
    )
    // All five forms of one set: keep them as written, they're exact. But
    // pronouns.page marks every written-out set singular, even
    // they/them/their/theirs/themselves, so a common set goes back to its
    // short value, which keeps the plural flag (and the short label).
    const parts = piece.split('/').filter((p) => p.trim())
    if (values.length === 1 && parts.length === 5) {
        const full = parts.map((p) => p.trim().toLowerCase()).join('/')
        return [KNOWN_SETS.find((s) => s.full === full)?.value ?? full]
    }
    return values
}

/**
 * Turns what people type into pronouns.page values, in order: "he/they" is
 * he and they, "she/her, they/them" is she and they, and a full custom set
 * like "ae/aer/aer/aers/aerself" stays whole. Words it doesn't know pass
 * through for pronouns.page to resolve.
 */
export function parsePronounInput(text: string): string[] {
    const values = text
        .normalize('NFC')
        .replaceAll('’', "'")
        .replace(/\s*\/\s*/g, '/')
        .split(CHUNK_SEPARATOR)
        .filter((chunk): chunk is string => Boolean(chunk))
        .map((chunk) => chunk.replace(SITE_PREFIX, '').replace(/^\/+/, ''))
        .flatMap((chunk) => chunk.split(SET_SEPARATOR))
        .flatMap(groupsOf)
    return [...new Set(values)]
}

/**
 * Whether the builder must ask pronouns.page about a value before linking to
 * it. Common sets are known to resolve, and special values are local.
 */
export function needsLookup(value: string): boolean {
    return !isSpecial(value) && !KNOWN_SETS.some((s) => s.value === value)
}

/** "he/him" for a value parsePronounInput makes, else the value itself. */
export function pronounLabel(value: string): string {
    if (value === 'null') return 'name only'
    return KNOWN_SETS.find((s) => s.value === value)?.label ?? value
}
