import {
    endMessage,
    initial,
    type Step,
    stepsFor,
} from '../lib/scenes/playback'
import {
    type RenderedLine,
    type RenderedScene,
    renderSession,
} from '../lib/scenes/render'
import type { Person } from '../lib/scenes/template'
import { el } from './dom'

export type ChatOptions = { reduceMotion: boolean; rng?: () => number }

const SVG = 'http://www.w3.org/2000/svg'

function sendIcon(): SVGSVGElement {
    const svg = document.createElementNS(SVG, 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    const path = document.createElementNS(SVG, 'path')
    path.setAttribute('d', 'M12 19V5M5 12l7-7 7 7')
    svg.append(path)
    return svg
}

function hidden(text: string): HTMLElement {
    return el('span', { class: 'visually-hidden' }, text)
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/** The two friends in a scene, in the order they first speak. */
function friendsIn(scene: RenderedScene): string[] {
    return [
        ...new Set(
            scene.lines.filter((l) => l.from !== 'me').map((l) => l.sender),
        ),
    ]
}

/**
 * The group chat: friends' lines play on their own, the visitor's line waits
 * in the compose bar until Send. Text only ever goes in via el()/textContent.
 */
export function mountChat(
    container: HTMLElement,
    person: Person,
    options: ChatOptions,
): void {
    const { reduceMotion, rng = Math.random } = options
    const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth'

    const group = el('h2', { class: 'chat-group' })
    const avatars = el('div', { class: 'avatars', 'aria-hidden': 'true' })
    const members = el('p', { class: 'visually-hidden' })
    // Focusable so the keyboard can scroll it where browsers don't make
    // scrollers focusable on their own (Safari).
    const thread = el('ol', {
        class: 'thread',
        role: 'log',
        'aria-label': 'Messages',
        tabindex: '0',
    })
    const composeText = el('p', { id: 'compose-text', class: 'compose-text' })
    const send = el('button', {
        type: 'button',
        class: 'send',
        'aria-label': 'Send',
        'aria-describedby': 'compose-text',
        'aria-disabled': 'true',
    })
    send.append(sendIcon())
    const panel = el(
        'section',
        { class: 'chat', 'aria-label': 'Group chat' },
        el('header', { class: 'chat-header' }, avatars, group, members),
        thread,
        el('div', { class: 'compose' }, composeText, send),
    )
    const after = el('div', { class: 'chat-after' })
    container.replaceChildren(panel, after)

    // Set only while a turn waits for Send, so extra presses do nothing.
    let pendingSend: (() => void) | null = null
    send.addEventListener('click', () => {
        const resolve = pendingSend
        if (!resolve) return
        pendingSend = null
        resolve()
    })

    function show(item: HTMLElement): void {
        thread.append(item)
        // Scroll the thread only; scrollIntoView would also move the page.
        thread.scrollTo({ top: thread.scrollHeight, behavior })
    }

    function friendBubble(line: RenderedLine, firstInRun: boolean): void {
        const item = el('li', { class: 'them' })
        if (firstInRun) item.append(el('p', { class: 'sender' }, line.sender))
        else item.append(hidden(`${line.sender}: `))
        item.append(el('p', { class: 'text' }, line.text))
        show(item)
    }

    function myBubble(line: RenderedLine): void {
        for (const old of thread.querySelectorAll('.delivered')) old.remove()
        show(
            el(
                'li',
                { class: 'me' },
                hidden('You: '),
                el('p', { class: 'text' }, line.text),
                el(
                    'p',
                    { class: 'delivered', 'aria-hidden': 'true' },
                    'Delivered',
                ),
            ),
        )
    }

    async function friendStep(step: Extract<Step, { kind: 'friend' }>) {
        if (!reduceMotion) {
            const typing = el(
                'li',
                { class: 'typing', 'aria-hidden': 'true' },
                el('span', { class: 'dot' }),
                el('span', { class: 'dot' }),
                el('span', { class: 'dot' }),
            )
            show(typing)
            await wait(step.delay)
            typing.remove()
        }
        friendBubble(step.line, step.firstInRun)
    }

    async function turn(line: RenderedLine): Promise<void> {
        composeText.textContent = line.text
        send.setAttribute('aria-disabled', 'false')
        if (!reduceMotion) send.classList.add('pulse')
        await new Promise<void>((resolve) => {
            pendingSend = resolve
        })
        composeText.textContent = ''
        send.setAttribute('aria-disabled', 'true')
        send.classList.remove('pulse')
        myBubble(line)
    }

    let session = renderSession(person, rng)

    async function play(index: number): Promise<void> {
        const scene = session.at(index)
        if (!scene) return
        const friends = friendsIn(scene)
        group.textContent = scene.group
        avatars.replaceChildren(
            ...[...friends, 'You'].map((name) =>
                el('span', { class: 'avatar' }, initial(name)),
            ),
        )
        members.textContent = `${friends.join(', ')} and you`
        thread.replaceChildren()
        after.replaceChildren()
        for (const step of stepsFor(scene)) {
            if (step.kind === 'friend') await friendStep(step)
            else await turn(step.line)
        }
        if (index + 1 < session.length) {
            const next = el('button', { type: 'button' }, 'Next chat')
            next.addEventListener('click', () => {
                void play(index + 1)
                send.focus()
            })
            after.replaceChildren(next)
            next.focus()
            return
        }
        const again = el('button', { type: 'button' }, 'Start over')
        again.addEventListener('click', () => {
            session = renderSession(person, rng)
            void play(0)
            send.focus()
        })
        after.replaceChildren(
            el('p', { class: 'chat-end' }, endMessage(person.name)),
            again,
        )
        again.focus()
    }

    void play(0)
}
