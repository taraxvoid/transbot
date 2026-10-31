import { cardLink, normalizeUsername, practiceLink } from '../lib/links'
import { getPronouns } from '../lib/pronouns/client'
import { summarize } from '../lib/pronouns/identity'
import {
    needsLookup,
    parsePronounInput,
    pronounLabel,
} from '../lib/pronouns/parse'
import type { Identity } from '../lib/pronouns/types'
import {
    clearSetup,
    isSetupPending,
    markSetupClicked,
    safeStorage,
} from '../lib/setup-flag'
import { el } from './dom'

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

const setupLink = byId<HTMLAnchorElement>('setup-link')
const returnPrompt = byId('return-prompt')
const notNow = byId<HTMLButtonElement>('not-now')
const username = byId<HTMLInputElement>('username')
const cardResult = byId('card-result')
const builder = byId<HTMLFormElement>('builder')
const builderName = byId<HTMLInputElement>('b-name')
const builderPicks = [
    ...byId('b-pronouns').querySelectorAll<HTMLInputElement>(
        'input[type=checkbox]',
    ),
]
const builderOther = byId<HTMLInputElement>('b-other')
const builderOrder = byId('b-order')
const builderResult = byId('builder-result')

const CHECKING = 'Checking pronouns.page...'

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

setupLink.addEventListener('click', () => markSetupClicked(storage, Date.now()))

function circleBack(): void {
    if (!isSetupPending(storage, Date.now())) return
    // Only take focus the first time, or when nothing else has it, so coming
    // back to the tab never steals focus from a field being typed in.
    const firstTime = returnPrompt.hidden
    returnPrompt.hidden = false
    const active = document.activeElement
    if (firstTime || !active || active === document.body) username.focus()
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
        cardResult.replaceChildren(
            el(
                'p',
                {},
                "We couldn't find that card yet. Cards show up once they're saved on pronouns.page.",
            ),
        )
        return
    }
    if (lookup.kind === 'error') {
        cardResult.replaceChildren(
            el('p', {}, "Couldn't reach pronouns.page. Try again in a moment."),
        )
        return
    }
    const summary = summarize(lookup.identity)
    if (summary.nothingToTeach) {
        cardResult.replaceChildren(
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
    cardResult.replaceChildren(...parts)
}

let latest = 0
let timer: ReturnType<typeof setTimeout> | undefined

async function lookup(): Promise<void> {
    const id = ++latest
    const name = normalizeUsername(username.value)
    if (!name) {
        cardResult.replaceChildren()
        return
    }
    cardResult.replaceChildren(el('p', {}, 'Checking pronouns.page...'))
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
    // Re-inserting the same text would make the live region announce it
    // again on every keystroke, so only touch the DOM when it changes.
    const checking = normalizeUsername(username.value) !== null
    if (!checking) cardResult.replaceChildren()
    else if (cardResult.textContent !== CHECKING) {
        cardResult.replaceChildren(el('p', {}, CHECKING))
    }
    clearTimeout(timer)
    timer = setTimeout(() => void lookup(), DEBOUNCE_MS)
})

/** Checked sets in the order they were picked; the first is modeled. */
let picked: string[] = []

function builderPronouns(): string[] {
    return [...new Set([...picked, ...parsePronounInput(builderOther.value)])]
}

type Known = 'found' | 'not-found'

/** Typed values pronouns.page has answered for. Errors aren't kept. */
const known = new Map<string, Known>()
let builderRun = 0
let builderTimer: ReturnType<typeof setTimeout> | undefined

async function checkPronoun(value: string): Promise<Known | 'error'> {
    const cached = known.get(value)
    if (cached) return cached
    // Only the pronoun value goes to pronouns.page, never the name.
    const result = await getPronouns(value)
    if (!result.ok && result.reason === 'error') return 'error'
    const answer = result.ok ? 'found' : 'not-found'
    known.set(value, answer)
    return answer
}

function setBuilderResult(...nodes: Node[]): void {
    // Same text again would make the live region repeat itself.
    const text = nodes.map((n) => n.textContent).join('')
    if (nodes.length && builderResult.textContent === text) return
    builderResult.replaceChildren(...nodes)
}

function renderBuilder(
    link: string,
    checked: string[],
    answers: Array<Known | 'error'>,
): void {
    const missing = checked.filter((_, i) => answers[i] === 'not-found')
    if (missing.length) {
        const quoted = missing.map((v) => `"${v}"`).join(' or ')
        setBuilderResult(
            el(
                'p',
                {},
                `pronouns.page doesn't have ${quoted} yet. You can write out all five forms, like ae/aer/aer/aers/aerself.`,
            ),
        )
    } else if (answers.includes('error')) {
        setBuilderResult(
            el(
                'p',
                {},
                "Couldn't reach pronouns.page to check those pronouns. Try again in a moment.",
            ),
        )
    } else setBuilderResult(linkRow(link))
}

function updateBuilder(): void {
    // Any older check still in flight is now stale.
    const run = ++builderRun
    clearTimeout(builderTimer)
    const pronouns = builderPronouns()
    const order =
        pronouns.length > 1
            ? `Practice sentences use ${pronounLabel(pronouns[0])}. Also accepted: ${pronouns.slice(1).map(pronounLabel).join(', ')}.`
            : ''
    if (builderOrder.textContent !== order) builderOrder.textContent = order
    const link = practiceLink(
        builderName.value,
        pronouns,
        window.location.origin,
    )
    if (!link) {
        setBuilderResult()
        return
    }
    // A link is only offered for pronouns pronouns.page has: no guessing.
    const toCheck = pronouns.filter(needsLookup)
    const cached = toCheck.map((v) => known.get(v))
    if (cached.every((answer) => answer !== undefined)) {
        renderBuilder(link, toCheck, cached as Known[])
        return
    }
    setBuilderResult(el('p', {}, CHECKING))
    builderTimer = setTimeout(async () => {
        const answers = await Promise.all(toCheck.map(checkPronoun))
        if (run === builderRun) renderBuilder(link, toCheck, answers)
    }, DEBOUNCE_MS)
}

for (const box of builderPicks) {
    // Restored form state after a reload keeps DOM order, which is the best
    // guess at pick order there is.
    if (box.checked) picked.push(box.value)
    box.addEventListener('change', () => {
        picked = picked.filter((v) => v !== box.value)
        if (box.checked) picked.push(box.value)
        updateBuilder()
    })
}
updateBuilder()
builderName.addEventListener('input', updateBuilder)
builderOther.addEventListener('input', updateBuilder)
builder.addEventListener('submit', (event) => {
    event.preventDefault()
    updateBuilder()
})
