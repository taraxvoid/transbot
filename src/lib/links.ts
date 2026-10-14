/** pronouns.page usernames; also keeps paths like ../ out of API calls. */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

export function isValidUsername(value: string): boolean {
    return USERNAME_PATTERN.test(value) && !/^\.+$/.test(value)
}

/** `pronouns` are pronouns.page values, first one modeled; see parsePronounInput. */
export function practiceLink(
    name: string,
    pronouns: string[],
    origin: string,
): string | null {
    const n = name.trim()
    const values = pronouns.map((p) => p.trim()).filter(Boolean)
    if (!n || !values.length) return null
    const params = new URLSearchParams({ n })
    for (const p of values) params.append('p', p)
    // The fragment never reaches a server, so the name stays in the browser.
    return `${origin}/practice#${params}`
}

export function cardLink(username: string, origin: string): string {
    return `${origin}/@${username}`
}

/** Accepts "name", "@name" or a pasted pronouns.page profile URL. */
export function normalizeUsername(input: string): string | null {
    const value = input
        .trim()
        .replace(/^https?:\/\/[^/]+\/+/i, '')
        .replace(/^@/, '')
        .replace(/\/+$/, '')
    return isValidUsername(value) ? value : null
}
