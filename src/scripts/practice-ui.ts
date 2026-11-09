import { summarize } from '../lib/pronouns/identity'
import type { Identity } from '../lib/pronouns/types'
import { chatPerson } from '../lib/scenes/render'
import { mountChat } from './chat-ui'
import { el } from './dom'

export function mountPractice(
    root: HTMLElement,
    identity: Identity,
    rng: () => number = Math.random,
): void {
    const name = identity.names.preferred
    const person = chatPerson(identity)
    const children: Node[] = [cardSummary(identity)]
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

function cardSummary(identity: Identity): HTMLElement {
    const summary = summarize(identity)
    const name = identity.names.preferred
    const list = el('dl')
    if (summary.teach.length) {
        list.append(el('dt', {}, 'Use'), el('dd', {}, summary.teach.join(', ')))
    }
    if (summary.accept.length) {
        list.append(
            el('dt', {}, 'Also fine'),
            el('dd', {}, summary.accept.join(', ')),
        )
    }
    const section = el(
        'section',
        { class: 'card-summary' },
        el('h1', {}, name ? `Practice with ${name}` : 'Practice'),
    )
    if (list.childElementCount) section.append(list)
    return section
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
