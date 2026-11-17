import { cardLink, normalizeUsername, practiceLink } from '../lib/links'
import { getPronouns } from '../lib/pronouns/client'
import { summarize } from '../lib/pronouns/identity'
import { needsLookup } from '../lib/pronouns/parse'
import type { Identity } from '../lib/pronouns/types'
import {
    clearSetup,
    isSetupPending,
    markSetupClicked,
    safeStorage,
} from '../lib/setup-flag'
import { pronounPicker } from './picker'
import { markJustMade } from './share'

type Lookup =
    | { kind: 'found'; identity: Identity }
    | { kind: 'not-found' }
    | { kind: 'error' }

const storage = safeStorage()

function byId<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id)
    if (!node) throw new Error(`#${id} is missing`)
    return node as T
}

const setupLink = byId<HTMLAnchorElement>('setup-link')
const returnPrompt = byId('return-prompt')
const notNow = byId<HTMLButtonElement>('not-now')
const cardForm = byId<HTMLFormElement>('card-form')
const username = byId<HTMLInputElement>('username')
const cardResult = byId('card-result')
const builder = byId<HTMLFormElement>('builder')
const builderName = byId<HTMLInputElement>('b-name')
const nameError = byId('b-name-error')
const builderPicker = pronounPicker('b')
const pronounsFieldset = byId('b-pronouns')
const pronounsError = byId('b-pronouns-error')
const builderStatus = byId('builder-status')

const CHECKING = 'Checking pronouns.page...'

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

/** Shows `message` on a field, or clears it when `message` is empty. */
function setError(
    field: HTMLElement,
    error: HTMLElement,
    message: string,
): void {
    if (error.textContent !== message) error.textContent = message
    // aria-invalid isn't allowed on a fieldset; its error is in its
    // aria-describedby instead.
    if (!(field instanceof HTMLInputElement)) return
    if (message) field.setAttribute('aria-invalid', 'true')
    else field.removeAttribute('aria-invalid')
}

/** Goes to a link just made here, so its page offers Copy and Share. */
function goTo(href: string): void {
    const url = new URL(href, window.location.origin)
    markJustMade(url.pathname + url.search)
    window.location.assign(url)
}

async function fetchCard(name: string): Promise<Lookup> {
    try {
        const res = await fetch(`/api/card/${encodeURIComponent(name)}`)
        if (res.status === 404) return { kind: 'not-found' }
        if (!res.ok) return { kind: 'error' }
        const body = (await res.json()) as { identity: Identity }
        return { kind: 'found', identity: body.identity }
    } catch {
        return { kind: 'error' }
    }
}

function lookupProblem(lookup: Lookup): string | null {
    if (lookup.kind === 'not-found') {
        return "We couldn't find that card yet. Cards show up once they're saved on pronouns.page."
    }
    if (lookup.kind === 'error') {
        return "Couldn't reach pronouns.page. Try again in a moment."
    }
    if (summarize(lookup.identity).nothingToTeach) {
        return "Found your card, but nothing on it is marked yes yet, so there's nothing to teach. Mark a name or pronouns as yes on pronouns.page, then try again."
    }
    return null
}

let cardBusy = false

cardForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (cardBusy) return
    const raw = username.value.trim()
    const name = normalizeUsername(raw)
    if (!name) {
        setError(
            username,
            cardResult,
            raw
                ? "That doesn't look like a pronouns.page username. Use letters, numbers, dots, dashes or underscores."
                : 'Enter your pronouns.page username or profile link.',
        )
        username.focus()
        return
    }
    cardBusy = true
    setError(username, cardResult, '')
    cardResult.textContent = CHECKING
    const problem = lookupProblem(await fetchCard(name))
    cardBusy = false
    if (problem) {
        setError(username, cardResult, problem)
        username.focus()
        return
    }
    clearSetup(storage)
    goTo(cardLink(name, window.location.origin))
})

username.addEventListener('input', () => {
    if (!cardBusy) setError(username, cardResult, '')
})

type Known = 'found' | 'not-found'

/** Typed values pronouns.page has answered for. Errors aren't kept. */
const known = new Map<string, Known>()

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

let builderBusy = false

builder.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (builderBusy) return
    builderStatus.textContent = ''
    // The first one is the one practiced.
    const pronouns = builderPicker.values()
    const nameMissing = !builderName.value.trim()
    setError(builderName, nameError, nameMissing ? 'Enter your name.' : '')
    setError(
        pronounsFieldset,
        pronounsError,
        pronouns.length
            ? ''
            : 'Pick at least one, or type them under Custom pronouns.',
    )
    if (nameMissing) {
        builderName.focus()
        return
    }
    if (!pronouns.length) {
        pronounsFieldset.querySelector<HTMLInputElement>('input')?.focus()
        return
    }
    const link = practiceLink(
        builderName.value,
        pronouns,
        window.location.origin,
    )
    if (!link) return
    // A link is only made for pronouns pronouns.page has: no guessing.
    const toCheck = pronouns.filter(needsLookup)
    if (toCheck.length) {
        builderBusy = true
        builderStatus.textContent = CHECKING
        const answers = await Promise.all(toCheck.map(checkPronoun))
        builderBusy = false
        builderStatus.textContent = ''
        const missing = toCheck.filter((_, i) => answers[i] === 'not-found')
        if (missing.length) {
            const quoted = missing.map((v) => `"${v}"`).join(' or ')
            setError(
                pronounsFieldset,
                pronounsError,
                `pronouns.page doesn't have ${quoted} yet. You can write out all five forms, like ae/aer/aer/aers/aerself.`,
            )
            byId('b-other').focus()
            return
        }
        if (answers.includes('error')) {
            builderStatus.textContent =
                "Couldn't reach pronouns.page to check those pronouns. Try again in a moment."
            return
        }
    }
    goTo(link)
})

builderName.addEventListener('input', () => {
    if (builderName.value.trim()) setError(builderName, nameError, '')
})
builderPicker.onChange(() => {
    if (builderPicker.values().length) {
        setError(pronounsFieldset, pronounsError, '')
    }
})
