import { entriesFromPracticePath, pronounQuery } from '../lib/links'
import { loadIdentity } from '../lib/pronouns/load'
import { parsePronounInput } from '../lib/pronouns/parse'
import { el } from './dom'
import { mountPractice } from './practice-ui'

function askPronouns(root: HTMLElement, name: string): void {
    const input = el('input', {
        id: 'ask-pronouns',
        autocomplete: 'off',
        autocapitalize: 'none',
        spellcheck: 'false',
        required: '',
        'aria-describedby': 'ask-pronouns-hint',
    })
    const form = el(
        'form',
        {},
        el(
            'label',
            { for: 'ask-pronouns' },
            `Which pronouns does ${name} use?`,
        ),
        input,
        el(
            'p',
            { id: 'ask-pronouns-hint', class: 'hint' },
            'Type them however you like: he/they, xe, or all five forms like ae/aer/aer/aers/aerself. Type null to practice using just the name.',
        ),
        el('button', { type: 'submit' }, 'Start practicing'),
    )
    form.addEventListener('submit', (event) => {
        event.preventDefault()
        const query = pronounQuery(
            parsePronounInput((input as HTMLInputElement).value),
        )
        if (!query) return
        const url = new URL(window.location.href)
        url.search = query
        window.location.assign(url)
    })
    root.replaceChildren(el('h1', {}, 'Practice'), form)
    input.focus()
}

async function start(): Promise<void> {
    const root = document.getElementById('practice')
    if (!root) return
    // Old /practice#n=... links are no longer read; they land on the
    // missing-name message below.
    const { pathname, search } = window.location
    const entries = entriesFromPracticePath(pathname, search)
    // A name with no p: ask for pronouns instead of guessing. `p=null` is
    // the explicit way to practice with just the name.
    if (entries?.names.length && !entries.pronouns.length) {
        askPronouns(root, entries.names[0].value)
        return
    }
    if (!entries) {
        root.replaceChildren(
            el('h1', {}, 'Practice'),
            el(
                'p',
                {},
                'This link is missing a name. ',
                el('a', { href: '/' }, 'Make a practice link'),
                '.',
            ),
        )
        return
    }
    root.replaceChildren(
        el('p', { role: 'status' }, 'Loading pronouns from pronouns.page...'),
    )
    // Only the pronoun set goes to pronouns.page. The name stays here.
    const identity = await loadIdentity(entries)
    if (!identity) {
        root.replaceChildren(
            el('h1', {}, 'Practice'),
            el(
                'p',
                { role: 'alert' },
                "Couldn't reach pronouns.page. Try again in a moment.",
            ),
        )
        return
    }
    mountPractice(root, identity)
    const unknown =
        entries.pronouns.length > 0 &&
        identity.sets.length === 0 &&
        identity.askMe === null
    if (unknown) {
        root.querySelector('h1')?.after(
            el(
                'p',
                { role: 'alert' },
                "pronouns.page doesn't have these pronouns yet, so there's nothing to practice here. ",
                el('a', { href: '/' }, 'Make a practice link'),
                '.',
            ),
        )
    }
}

void start()
