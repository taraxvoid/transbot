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

/** Two different friends, neither sharing a name with the person. */
export function pickFriends(
    personName: string | null,
    rng: () => number,
): [string, string] {
    const taken = personName?.trim().toLocaleLowerCase()
    const pool = FRIEND_POOL.filter((n) => n.toLocaleLowerCase() !== taken)
    const first = Math.floor(rng() * pool.length)
    let second = Math.floor(rng() * (pool.length - 1))
    if (second >= first) second++
    return [pool[first], pool[second]]
}
