import { entriesFromFragment } from '../lib/pronouns/identity'
import { loadIdentity } from '../lib/pronouns/load'
import { el } from './dom'
import { mountPractice } from './practice-ui'

async function start(): Promise<void> {
    const root = document.getElementById('practice')
    if (!root) return
    const entries = entriesFromFragment(window.location.hash)
    if (!entries) {
        root.replaceChildren(
            el('h1', {}, 'Practice'),
            el(
                'p',
                {},
                'This link is missing a name and pronouns. ',
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
        root.querySelector('h1')?.insertAdjacentElement(
            'afterend',
            el(
                'p',
                { role: 'alert' },
                "pronouns.page doesn't know those pronouns. Check the spelling, or write all five forms, like ae/aer/aer/aers/aerself.",
            ),
        )
    }
}

void start()
window.addEventListener('hashchange', () => void start())
