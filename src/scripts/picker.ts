import { orderHint, parsePronounInput } from '../lib/pronouns/parse'

export type Picker = {
    /** Checked sets in pick order, then what Other parses to; no repeats. */
    values(): string[]
    onChange(listener: () => void): void
}

/** Wires up a PronounPicker rendered with the same `prefix`. */
export function pronounPicker(prefix: string): Picker {
    const fieldset = document.getElementById(`${prefix}-pronouns`)
    const other = document.getElementById(`${prefix}-other`)
    const order = document.getElementById(`${prefix}-order`)
    if (!fieldset || !(other instanceof HTMLInputElement) || !order) {
        throw new Error(`PronounPicker "${prefix}" is missing`)
    }
    const boxes = [
        ...fieldset.querySelectorAll<HTMLInputElement>('input[type=checkbox]'),
    ]
    const listeners: Array<() => void> = []
    let picked: string[] = []

    const values = (): string[] => [
        ...new Set([...picked, ...parsePronounInput(other.value)]),
    ]

    function changed(): void {
        const hint = orderHint(values())
        if (order && order.textContent !== hint) order.textContent = hint
        for (const listener of listeners) listener()
    }

    for (const box of boxes) {
        // Restored form state after a reload keeps DOM order, which is the
        // best guess at pick order there is.
        if (box.checked) picked.push(box.value)
        box.addEventListener('change', () => {
            picked = picked.filter((v) => v !== box.value)
            if (box.checked) picked.push(box.value)
            changed()
        })
    }
    other.addEventListener('input', changed)
    changed()

    return {
        values,
        onChange(listener) {
            listeners.push(listener)
        },
    }
}
