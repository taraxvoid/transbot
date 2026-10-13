import {
    checkBlank,
    checkFreeText,
    type Note,
    normalize,
} from '../lib/pronouns/check'
import { type Blank, drillsFor } from '../lib/pronouns/drills'
import { modeledSet, summarize } from '../lib/pronouns/identity'
import type { Identity } from '../lib/pronouns/types'
import { add, el } from './dom'

export function mountPractice(
    root: HTMLElement,
    identity: Identity,
    rng: () => number = Math.random,
): void {
    const name = identity.names.preferred
    const modeled = modeledSet(identity)
    const children: Node[] = [cardSummary(identity)]
    if (identity.askMe) children.push(askMeNote(name, identity.askMe))
    if (modeled) children.push(drillSection(identity, rng))
    // ask-me first means only the note: no drills and no free typing.
    if ((name || modeled) && identity.askMe !== 'only') {
        children.push(freeSection(identity))
    }
    root.replaceChildren(...children)
}

function cardSummary(identity: Identity): HTMLElement {
    const summary = summarize(identity)
    const name = identity.names.preferred
    const list = el('dl')
    if (summary.teach.length) {
        add(list, el('dt', {}, 'Use'), el('dd', {}, summary.teach.join(', ')))
    }
    if (summary.accept.length) {
        add(
            list,
            el('dt', {}, 'Also fine'),
            el('dd', {}, summary.accept.join(', ')),
        )
    }
    const section = el(
        'section',
        { class: 'card-summary' },
        el('h1', {}, name ? `Practice with ${name}` : 'Practice'),
    )
    if (list.childElementCount) add(section, list)
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

function feedbackText(answer: string, blank: Blank, identity: Identity) {
    const result = checkBlank(answer, blank, identity)
    const ipa = result.pronunciation ? ` /${result.pronunciation}/` : ''
    if (!result.correct) {
        return { correct: false, text: `It's ${result.expected}${ipa} here.` }
    }
    if (normalize(answer) === normalize(result.expected)) {
        return { correct: true, text: `Correct: ${result.expected}${ipa}` }
    }
    return {
        correct: true,
        text: `That works too. Most often: ${result.expected}${ipa}`,
    }
}

function drillSection(identity: Identity, rng: () => number): HTMLElement {
    const drills = drillsFor(identity.templates, rng)
    const progress = el('p', { class: 'hint' })
    const sentence = el('p', { class: 'drill-sentence' })
    const check = el('button', { type: 'submit' }, 'Check')
    const next = el('button', { type: 'button', class: 'secondary' }, 'Next')
    const form = el(
        'form',
        { class: 'drill-form' },
        sentence,
        el('div', { class: 'drill-actions' }, check, next),
    )
    const feedback = el('ul', { class: 'feedback', 'aria-live': 'polite' })
    const section = el(
        'section',
        { class: 'drills', 'aria-labelledby': 'drills-heading' },
        el('h2', { id: 'drills-heading' }, 'Fill in the blanks'),
        progress,
        form,
        feedback,
    )

    let index = 0
    let inputs: HTMLInputElement[] = []
    let blanks: Blank[] = []

    function show(focus: boolean): void {
        const drill = drills[index]
        progress.textContent = `Sentence ${index + 1} of ${drills.length}`
        inputs = []
        blanks = []
        sentence.replaceChildren(
            ...drill.parts.map((part) => {
                if (typeof part === 'string')
                    return document.createTextNode(part)
                const input = el('input', {
                    type: 'text',
                    autocomplete: 'off',
                    autocapitalize: 'none',
                    spellcheck: 'false',
                })
                inputs.push(input)
                blanks.push(part)
                return input
            }),
        )
        inputs.forEach((input, i) => {
            input.setAttribute(
                'aria-label',
                `Blank ${i + 1} of ${inputs.length}`,
            )
        })
        feedback.replaceChildren()
        check.hidden = false
        next.hidden = true
        if (focus) inputs[0]?.focus()
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault()
        if (check.hidden) return
        feedback.replaceChildren(
            ...blanks.map((blank, i) => {
                inputs[i].readOnly = true
                const { correct, text } = feedbackText(
                    inputs[i].value,
                    blank,
                    identity,
                )
                return el('li', { class: correct ? 'correct' : 'try' }, text)
            }),
        )
        check.hidden = true
        next.hidden = false
        next.textContent = index + 1 < drills.length ? 'Next' : 'Start over'
        next.focus()
    })

    next.addEventListener('click', () => {
        index = (index + 1) % drills.length
        show(true)
    })

    show(false)
    return section
}

function noteItem(note: Note): HTMLElement {
    const item = el('li', { class: 'try' }, note.text)
    if (note.suggestion) add(item, ' try ', el('em', {}, note.suggestion), '?')
    return item
}

function freeSection(identity: Identity): HTMLElement {
    const name = identity.names.preferred
    const prompt = name
        ? `Tell me what ${name} did this weekend.`
        : "Tell me about this person's weekend."
    const textarea = el('textarea', { id: 'free-text', rows: '4' })
    const notes = el('ul', { class: 'feedback', 'aria-live': 'polite' })
    const form = el(
        'form',
        { class: 'free-form' },
        el('label', { for: 'free-text' }, prompt),
        textarea,
        el('button', { type: 'submit' }, 'Check'),
    )
    form.addEventListener('submit', (event) => {
        event.preventDefault()
        if (!textarea.value.trim()) {
            notes.replaceChildren()
            return
        }
        const found = checkFreeText(textarea.value, identity)
        notes.replaceChildren(
            ...(found.length
                ? found.map(noteItem)
                : [el('li', { class: 'correct' }, 'Nothing to flag. Nice.')]),
        )
    })
    return el(
        'section',
        { class: 'free', 'aria-labelledby': 'free-heading' },
        el('h2', { id: 'free-heading' }, 'Say it your way'),
        form,
        notes,
    )
}
