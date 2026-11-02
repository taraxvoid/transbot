/**
 * Made-up friends in the group chat. About half gender-ambiguous or enby
 * names; the rest about two thirds femme and one third masc. Scenes never
 * refer to a friend with a third-person pronoun.
 */
export const FRIEND_POOL: readonly string[] = [
    'Alex',
    'Sam',
    'Jordan',
    'Riley',
    'Quinn',
    'Avery',
    'Rowan',
    'Sage',
    'Kai',
    'River',
    'Jules',
    'Robin',
    'Priya',
    'Maya',
    'Nina',
    'Lucía',
    'Hana',
    'Zoe',
    'Imani',
    'Leah',
    'Marcus',
    'Theo',
    'Diego',
    'Omar',
]

/** NFC so a decomposed "Lucía" typed in a link matches the pool's. */
function nameKey(name: string): string {
    return name.normalize('NFC').trim().toLowerCase()
}

/**
 * Two different friends, neither sharing a name with the person: their
 * preferred name or a name used in place of pronouns (`:Kai`).
 */
export function pickFriends(
    personNames: ReadonlyArray<string | null>,
    rng: () => number,
): [string, string] {
    const taken = new Set(personNames.flatMap((n) => (n ? [nameKey(n)] : [])))
    const pool = FRIEND_POOL.filter((n) => !taken.has(nameKey(n)))
    const first = Math.floor(rng() * pool.length)
    let second = Math.floor(rng() * (pool.length - 1))
    if (second >= first) second++
    return [pool[first], pool[second]]
}
