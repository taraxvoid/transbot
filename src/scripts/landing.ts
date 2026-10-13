import { cardLink, normalizeUsername, practiceLink } from '../lib/links'
import { summarize } from '../lib/pronouns/identity'
import type { Identity } from '../lib/pronouns/types'
import {
    clearSetup,
    isSetupPending,
    markSetupClicked,
    safeStorage,
} from '../lib/setup-flag'
import { add, el } from './dom'

type Lookup =
    | { kind: 'found'; identity: Identity }
    | { kind: 'not-found' }
    | { kind: 'error' }

const DEBOUNCE_MS = 400
const storage = safeStorage()

function byId<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id)
    if (!node) throw new Error(`#${id} is missing`)
    return node as T
}

const haveCard = byId<HTMLButtonElement>('have-card')
const noCard = byId<HTMLButtonElement>('no-card')
const cardPanel = byId('card-panel')
const setupPanel = byId('setup-panel')
const setupLink = byId<HTMLAnchorElement>('setup-link')
const returnPrompt = byId('return-prompt')
const notNow = byId<HTMLButtonElement>('not-now')
const username = byId<HTMLInputElement>('username')
const cardResult = byId('card-result')
const builder = byId<HTMLFormElement>('builder')
const builderName = byId<HTMLInputElement>('b-name')
const builderPronouns = byId<HTMLInputElement>('b-pronouns')
const builderResult = byId('builder-result')

// Replaces children via add(): Element.replaceChildren/append are shadowed by
// workerd's types under astro check.
function setChildren(parent: HTMLElement, ...children: Node[]): void {
    parent.textContent = ''
    add(parent, ...children)
}

function setOpen(
    button: HTMLButtonElement,
    panel: HTMLElement,
    open: boolean,
): void {
    panel.hidden = !open
    button.setAttribute('aria-expanded', String(open))
}

function copyButton(text: string): HTMLButtonElement {
    const button = el(
        'button',
        { type: 'button', class: 'secondary' },
        'Copy link',
    )
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(text)
            button.textContent = 'Copied'
        } catch {
            button.textContent = 'Copy failed, select the link instead'
        }
    })
    return button
}

function linkRow(href: string): HTMLElement {
    return el(
        'p',
        { class: 'link-out' },
        el('a', { href }, href),
        copyButton(href),
    )
}

haveCard.addEventListener('click', () =>
    setOpen(haveCard, cardPanel, cardPanel.hidden),
)
noCard.addEventListener('click', () =>
    setOpen(noCard, setupPanel, setupPanel.hidden),
)
setupLink.addEventListener('click', () => markSetupClicked(storage, Date.now()))

function circleBack(): void {
    if (!isSetupPending(storage, Date.now())) return
    returnPrompt.hidden = false
    setOpen(haveCard, cardPanel, true)
    username.focus()
}

circleBack()
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') circleBack()
})
notNow.addEventListener('click', () => {
    clearSetup(storage)
    returnPrompt.hidden = true
})

function renderLookup(name: string, lookup: Lookup): void {
    if (lookup.kind === 'not-found') {
        setChildren(
            cardResult,
            el(
                'p',
                {},
                "We couldn't find that card yet. Cards show up once they're saved on pronouns.page.",
            ),
        )
        return
    }
    if (lookup.kind === 'error') {
        setChildren(
            cardResult,
            el('p', {}, "Couldn't reach pronouns.page. Try again in a moment."),
        )
        return
    }
    const summary = summarize(lookup.identity)
    if (summary.nothingToTeach) {
        setChildren(
            cardResult,
            el(
                'p',
                {},
                "Found your card, but nothing on it is marked yes yet, so there's nothing to teach. Mark a name or pronouns as yes on pronouns.page, then check again.",
            ),
        )
        return
    }
    clearSetup(storage)
    returnPrompt.hidden = true
    const parts: Node[] = []
    if (summary.teach.length) {
        parts.push(
            el('p', {}, `transbot will teach: ${summary.teach.join(', ')}`),
        )
    }
    if (summary.accept.length) {
        parts.push(el('p', {}, `Also accepted: ${summary.accept.join(', ')}`))
    }
    if (summary.askMe) {
        parts.push(
            el('p', {}, 'Visitors will see a note to ask about pronouns.'),
        )
    }
    parts.push(linkRow(cardLink(name, window.location.origin)))
    setChildren(cardResult, ...parts)
}

let latest = 0
let timer: ReturnType<typeof setTimeout> | undefined

async function lookup(): Promise<void> {
    const id = ++latest
    const name = normalizeUsername(username.value)
    if (!name) {
        setChildren(cardResult)
        return
    }
    setChildren(cardResult, el('p', {}, 'Checking pronouns.page...'))
    let result: Lookup
    try {
        const res = await fetch(`/api/card/${encodeURIComponent(name)}`)
        if (res.status === 404) result = { kind: 'not-found' }
        else if (!res.ok) result = { kind: 'error' }
        else
            result = {
                kind: 'found',
                identity: ((await res.json()) as { identity: Identity })
                    .identity,
            }
    } catch {
        result = { kind: 'error' }
    }
    // A slower, older lookup must not replace the newest one.
    if (id !== latest) return
    renderLookup(name, result)
}

username.addEventListener('input', () => {
    // Invalidate any in-flight lookup now, not after the debounce, so a late
    // response for the old text never renders next to the new text.
    latest++
    setChildren(
        cardResult,
        ...(normalizeUsername(username.value)
            ? [el('p', {}, 'Checking pronouns.page...')]
            : []),
    )
    clearTimeout(timer)
    timer = setTimeout(() => void lookup(), DEBOUNCE_MS)
})

function updateBuilder(): void {
    const link = practiceLink(
        builderName.value,
        builderPronouns.value,
        window.location.origin,
    )
    setChildren(builderResult, ...(link ? [linkRow(link)] : []))
}

builderName.addEventListener('input', updateBuilder)
builderPronouns.addEventListener('input', updateBuilder)
builder.addEventListener('submit', (event) => {
    event.preventDefault()
    updateBuilder()
})
