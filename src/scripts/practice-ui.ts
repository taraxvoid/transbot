import { modeledSet, setLabel } from '../lib/pronouns/identity'
import type { Identity, PronounSet } from '../lib/pronouns/types'
import { chatPerson } from '../lib/scenes/render'
import type { Person } from '../lib/scenes/template'
import { mountChat } from './chat-ui'
import { el } from './dom'
import { shareBanner, wasJustMade } from './share'

export function mountPractice(
    root: HTMLElement,
    identity: Identity,
    rng: () => number = Math.random,
): void {
    const name = identity.names.preferred
    const person = chatPerson(identity)
    const children: Node[] = [el('h1', {}, heading(identity, person))]
    if (identity.askMe) children.push(askMeNote(name, identity.askMe))
    if (person) children.push(formsBox(identity, person))
    const chat = person ? el('div', { class: 'chat-mount' }) : null
    if (chat && person) children.push(chatIntro(person), chat)
    // Last, so the creator sees the practice first, as visitors will.
    if (wasJustMade(window.location)) {
        children.push(shareBanner(window.location.href))
    }
    root.replaceChildren(...children)
    if (chat && person) {
        mountChat(chat, person, {
            reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches,
            rng,
        })
    }
}

/** Pronouns as the label shows them, or null for name-only. */
function pronounLabel(modeled: PronounSet | null): string | null {
    return modeled && modeled.kind !== 'name' ? modeled.label : null
}

/** "Sam uses xe/xem": who the page is about and what to call them. */
function heading(identity: Identity, person: Person | null): string {
    const name = person?.name ?? identity.names.preferred
    const pronouns = person ? pronounLabel(modeledSet(identity)) : null
    if (!name) return pronouns ? `Practice ${pronouns}` : 'Practice'
    if (!person) return name
    return pronouns ? `${name} uses ${pronouns}` : `${name} uses no pronouns`
}

function chatIntro(person: Person): HTMLElement {
    const who = person.name ?? 'them'
    return el(
        'p',
        { class: 'chat-intro' },
        `Practice in the group chat below: friends talk about ${who}, and your replies are typed out for you. Press Send to post each one.`,
    )
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
    const pronouns = pronounLabel(modeled)
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
        el(
            'summary',
            {},
            pronouns ? `All forms of ${pronouns}` : 'Using just the name',
        ),
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
