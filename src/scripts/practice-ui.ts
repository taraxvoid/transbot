import { modeledSet, setLabel } from '../lib/pronouns/identity'
import type { Identity, PronounSet } from '../lib/pronouns/types'
import { chatPerson } from '../lib/scenes/render'
import type { Person } from '../lib/scenes/template'
import { mountChat } from './chat-ui'
import { el } from './dom'

export function mountPractice(
    root: HTMLElement,
    identity: Identity,
    rng: () => number = Math.random,
): void {
    const name = identity.names.preferred
    const person = chatPerson(identity)
    const children: Node[] = [
        el('h1', {}, name ? `Practice with ${name}` : 'Practice'),
    ]
    if (person) children.push(formsBox(identity, person))
    if (identity.askMe) children.push(askMeNote(name, identity.askMe))
    const chat = person ? el('div', { class: 'chat-mount' }) : null
    if (chat) children.push(chat)
    root.replaceChildren(...children)
    if (chat && person) {
        mountChat(chat, person, {
            reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches,
            rng,
        })
    }
}

/** Other names and every set besides the modeled one, yes before meh. */
function alsoFine(identity: Identity, modeled: PronounSet | null): string[] {
    const { preferred, accepted } = identity.names
    return [
        ...accepted.filter((n) => n !== preferred),
        ...identity.sets.filter((s) => s !== modeled).map(setLabel),
    ]
}

/** Collapsed reference card: the five forms in use, with IPA. Not graded. */
function formsBox(identity: Identity, person: Person): HTMLElement {
    const modeled = modeledSet(identity)
    const label =
        !modeled || modeled.kind === 'name'
            ? 'no pronouns, just the name'
            : modeled.label
    const forms = person.forms
    const ipa = modeled?.pronunciations ?? {}
    const rows: Array<[string, string, string | undefined]> = [
        ['Subject', forms.pronoun_subject, ipa.pronoun_subject],
        ['Object', forms.pronoun_object, ipa.pronoun_object],
        ['Possessive', forms.possessive_determiner, ipa.possessive_determiner],
        [
            'Possessive pronoun',
            forms.possessive_pronoun,
            ipa.possessive_pronoun,
        ],
        ['Reflexive', forms.reflexive, ipa.reflexive],
    ]
    const list = el('dl')
    for (const [term, form, sound] of rows) {
        list.append(
            el('dt', {}, term),
            el('dd', {}, sound ? `${form} /${sound}/` : form),
        )
    }
    const others = alsoFine(identity, modeled)
    if (others.length) {
        list.append(el('dt', {}, 'Also fine'), el('dd', {}, others.join(', ')))
    }
    return el(
        'details',
        { class: 'forms' },
        el('summary', {}, `${person.name ?? 'Pronouns'}: ${label}`),
        list,
    )
}

function askMeNote(
    name: string | null,
    mode: NonNullable<Identity['askMe']>,
): HTMLElement {
    const ask = name
        ? `ask ${name} which pronouns to use.`
        : 'ask which pronouns to use.'
    const text = mode === 'only' ? `Please ${ask}` : `You can also ${ask}`
    return el('p', { class: 'ask-me' }, text)
}
