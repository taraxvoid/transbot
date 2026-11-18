import { el } from './dom'

// Set by the landing page right before it redirects to a new link, so the
// page it lands on can say "your link is ready". sessionStorage keeps it to
// this tab: whoever the link is sent to never sees the banner.
const JUST_MADE_KEY = 'transbot:just-made'

function session(): Storage | null {
    try {
        return window.sessionStorage
    } catch {
        return null
    }
}

/** `path` is pathname plus search, as location shows it after the redirect. */
export function markJustMade(path: string): void {
    try {
        session()?.setItem(JUST_MADE_KEY, path)
    } catch {
        // Storage blocked: the page just skips the banner.
    }
}

export function wasJustMade(location: Location): boolean {
    try {
        return (
            session()?.getItem(JUST_MADE_KEY) ===
            location.pathname + location.search
        )
    } catch {
        return false
    }
}

export const SHARE_TEXT = 'I made a quick way to practice my name and pronouns:'

/** What a visitor's share sheet suggests: they may not be the person named. */
export const VISITOR_SHARE_TEXT =
    'Here is a quick way to practice a name and pronouns:'

function copyButton(url: string, status: HTMLElement): HTMLButtonElement {
    const button = el('button', { type: 'button' }, 'Copy link')
    const failed = (): void => {
        button.textContent = 'Copy failed, select the link instead'
        status.textContent = 'Copy failed, select the link instead'
    }
    button.addEventListener('click', () => {
        // clipboard is missing outside secure contexts; that is a failure too.
        Promise.resolve()
            .then(() => navigator.clipboard.writeText(url))
            .then(() => {
                button.textContent = 'Copied'
                status.textContent = 'Link copied'
            })
            .catch(failed)
    })
    return button
}

function shareButton(url: string, text: string): HTMLButtonElement | null {
    const data = { url, text }
    if (typeof navigator.share !== 'function') return null
    // Older browsers have share() without canShare(); only a "no" counts.
    if ('canShare' in navigator && !navigator.canShare(data)) return null
    const button = el('button', { type: 'button', class: 'secondary' }, 'Share')
    button.addEventListener('click', () => {
        // Cancelling the share sheet rejects; nothing to report.
        navigator.share(data).catch(() => {})
    })
    return button
}

/**
 * Copy, plus Share where the browser has a share sheet. Copy is always there
 * as the fallback. Extra nodes (like a "Make your own" link) go after them.
 */
export function shareActions(
    url: string,
    text: string,
    ...extra: Node[]
): HTMLElement {
    // The button's own text changes too, but screen readers don't announce
    // that, so the result also goes to a status region.
    const status = el('span', { class: 'visually-hidden', role: 'status' })
    const actions = el('div', { class: 'link-out' }, copyButton(url, status))
    const share = shareButton(url, text)
    if (share) actions.append(share)
    actions.append(...extra, status)
    return actions
}

/** "Your link is ready" box with the link, Copy and (where supported) Share. */
export function shareBanner(url: string): HTMLElement {
    const actions = shareActions(url, SHARE_TEXT)
    return el(
        'section',
        { class: 'share', 'aria-labelledby': 'share-heading' },
        el('h2', { id: 'share-heading' }, 'Your link is ready'),
        el(
            'p',
            {},
            "Send it to family, friends or coworkers. They'll see the practice above.",
        ),
        el('p', { class: 'share-url' }, el('a', { href: url }, url)),
        actions,
    )
}

/**
 * End-of-chat box for visitors: pass on the link they already have (never a
 * new one) or go make their own. Nothing is tracked.
 */
export function endShare(url: string): HTMLElement {
    return el(
        'section',
        { class: 'share end-share', 'aria-labelledby': 'end-share-heading' },
        el('h2', { id: 'end-share-heading' }, 'Pass it on'),
        el(
            'p',
            {},
            'Send this practice to someone else who should get it right.',
        ),
        // Shown so the link can be selected by hand when Copy fails.
        el('p', { class: 'share-url' }, el('a', { href: url }, url)),
        shareActions(
            url,
            VISITOR_SHARE_TEXT,
            el('a', { href: '/', class: 'make-own' }, 'Make your own'),
        ),
    )
}
