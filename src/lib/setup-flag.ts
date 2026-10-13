// Remembers, in this browser only, that someone clicked "Set up your
// pronouns.page card", so the page can ask for the username when they come
// back. It never leaves the browser.
export const SETUP_KEY = 'transbot:setup-clicked'
export const SETUP_TTL_MS = 14 * 24 * 60 * 60 * 1000

export type FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function safeStorage(): FlagStorage | null {
    try {
        const storage = window.localStorage
        storage.getItem(SETUP_KEY)
        return storage
    } catch {
        return null
    }
}

export function markSetupClicked(
    storage: FlagStorage | null,
    now: number,
): void {
    try {
        storage?.setItem(SETUP_KEY, String(now))
    } catch {
        // Storage blocked: the page works without the reminder.
    }
}

export function clearSetup(storage: FlagStorage | null): void {
    try {
        storage?.removeItem(SETUP_KEY)
    } catch {
        // Storage blocked: nothing to clear.
    }
}

export function isSetupPending(
    storage: FlagStorage | null,
    now: number,
): boolean {
    try {
        const raw = storage?.getItem(SETUP_KEY)
        if (!raw) return false
        const at = Number(raw)
        if (!Number.isFinite(at) || at > now || now - at > SETUP_TTL_MS) {
            clearSetup(storage)
            return false
        }
        return true
    } catch {
        return false
    }
}
