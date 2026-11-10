import { entriesFromPracticePath, pronounQuery } from '../lib/links'
import { loadIdentity } from '../lib/pronouns/load'
import { el } from './dom'
import { pronounPicker } from './picker'
import { mountPractice } from './practice-ui'

/** Shows the server-rendered picker form for a link with a name and no p. */
function askPronouns(root: HTMLElement, name: string): void {
    const form = document.getElementById('ask-form')
    const legend = document.getElementById('ask-legend')
    const error = document.getElementById('ask-error')
    if (!(form instanceof HTMLFormElement) || !legend || !error) return
    legend.textContent = `Which pronouns does ${name} use?`
    const picker = pronounPicker('ask')
    picker.onChange(() => {
        error.textContent = ''
    })
    form.addEventListener('submit', (event) => {
        event.preventDefault()
        // No pronouns.page check here: an unknown value lands on the
        // unknown-pronouns message.
        const query = pronounQuery(picker.values())
        if (!query) {
            error.textContent =
                'Pick at least one, or type them under Other pronouns.'
            return
        }
        const url = new URL(window.location.href)
        url.search = query
        window.location.assign(url)
    })
    root.replaceChildren(el('h1', {}, 'Practice'), form)
    form.hidden = false
    form.querySelector<HTMLInputElement>('input[type=checkbox]')?.focus()
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
    // The link listed pronouns and none resolved: say so instead of falling
    // back to the name-only chat, which would be a guess.
    const unknown =
        entries.pronouns.length > 0 &&
        identity.sets.length === 0 &&
        identity.askMe === null
    if (unknown) {
        const name = identity.names.preferred
        root.replaceChildren(
            el('h1', {}, name ? `Practice with ${name}` : 'Practice'),
            el(
                'p',
                { role: 'alert' },
                "pronouns.page doesn't have these pronouns yet, so there's nothing to practice here. ",
                el('a', { href: '/' }, 'Make a practice link'),
                '.',
            ),
        )
        return
    }
    mountPractice(root, identity)
}

void start()
