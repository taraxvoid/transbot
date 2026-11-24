import { modeledSet, setLabel } from '../lib/pronouns/identity'
import type { Identity } from '../lib/pronouns/types'
import { chatPerson } from '../lib/scenes/render'
import type { Person } from '../lib/scenes/template'
import { mountChat } from './chat-ui'
import { el } from './dom'
import { endShare, shareBar } from './share'

export function mountPractice(
    root: HTMLElement,
    identity: Identity,
    rng: () => number = Math.random,
): void {
    const name = identity.names.preferred
    const person = chatPerson(identity)
    // Near the top for everyone, creator or visitor, with the URL as is.
    const children: Node[] = [
        el('h1', {}, heading(identity, person)),
        shareBar(window.location.href),
    ]
    if (identity.askMe) children.push(askMeNote(name, identity.askMe))
    const forms = person ? formsBox(identity, person) : null
    if (forms) children.push(forms.box)
    const chat = person ? el('div', { class: 'chat-mount' }) : null
    if (chat) children.push(chat)
    root.replaceChildren(...children)
    if (chat && person) {
        mountChat(chat, person, {
            reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches,
            rng,
            onScene: forms?.show,
            // The URL the visitor is already on, as is.
            endExtra: () => endShare(window.location.href),
        })
    }
}

/** Every yes pronoun set, primary first. Name sets don't count. */
function usedLabels(identity: Identity): string[] {
    const modeled = modeledSet(identity)
    if (!modeled) return []
    return identity.sets
        .filter((s) => s.opinion === 'yes' && s.kind !== 'name')
        .map((s) => s.label)
}

/** "Sam uses xe/xem and she/her": who the page is about and what to call them. */
function heading(identity: Identity, person: Person | null): string {
    const name = person?.name ?? identity.names.preferred
    const pronouns = person ? usedLabels(identity).join(' and ') : ''
    if (!name) return pronouns ? `Practice ${pronouns}` : 'Practice'
    if (!person) return name
    return pronouns ? `${name} uses ${pronouns}` : `${name} uses no pronouns`
}

/** Other names and every set besides the one this scene is about. */
function alsoFine(identity: Identity, person: Person): string[] {
    const { preferred, accepted } = identity.names
    return [
        ...accepted.filter((n) => n !== preferred),
        ...identity.sets
            .filter((s) =>
                s.kind === 'name' ? !!person.label : s.label !== person.label,
            )
            .map(setLabel),
    ]
}

/**
 * Collapsed reference card: the five forms the current scene uses, with IPA.
 * Not graded. `show` swaps in another set (each scene may be about a
 * different one) without closing the card.
 */
function formsBox(
    identity: Identity,
    person: Person,
): { box: HTMLElement; show: (person: Person) => void } {
    const title = el('span')
    const list = el('dl')
    const box = el(
        'details',
        { class: 'forms' },
        el(
            'summary',
            {},
            title,
            el('span', { class: 'forms-hint' }, 'Forms to use in this scene'),
        ),
        list,
    )
    function show(who: Person): void {
        const forms = who.forms
        const ipa = who.pronunciations ?? {}
        const rows: Array<[string, string, string | undefined]> = [
            ['Subject', forms.pronoun_subject, ipa.pronoun_subject],
            ['Object', forms.pronoun_object, ipa.pronoun_object],
            [
                'Possessive',
                forms.possessive_determiner,
                ipa.possessive_determiner,
            ],
            [
                'Possessive pronoun',
                forms.possessive_pronoun,
                ipa.possessive_pronoun,
            ],
            ['Reflexive', forms.reflexive, ipa.reflexive],
        ]
        title.textContent = who.label
            ? `Cheat sheet: ${who.label}`
            : 'Cheat sheet: name only'
        list.replaceChildren()
        for (const [term, form, sound] of rows) {
            list.append(
                el('dt', {}, term),
                el('dd', {}, sound ? `${form} /${sound}/` : form),
            )
        }
        const others = alsoFine(identity, who)
        if (others.length) {
            list.append(
                el('dt', {}, 'Also fine'),
                el('dd', {}, others.join(', ')),
            )
        }
    }
    show(person)
    return { box, show }
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
