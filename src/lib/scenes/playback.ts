import type { RenderedLine, RenderedScene } from './render'

/** One thing that happens in a scene, in order. No DOM, no timers. */
export type Step =
    | { kind: 'friend'; line: RenderedLine; firstInRun: boolean; delay: number }
    | { kind: 'turn'; line: RenderedLine }

/** How long a friend "types" before a bubble: 600 + 25 ms a character, 0.8 to 1.8 s. */
export function typingDelay(text: string): number {
    return Math.min(1800, Math.max(800, 600 + 25 * text.length))
}

/** A visitor line waits for Send; friend lines carry their typing delay. */
export function stepsFor(scene: RenderedScene): Step[] {
    return scene.lines.map((line, i): Step => {
        if (line.from === 'me') return { kind: 'turn', line }
        return {
            kind: 'friend',
            line,
            // The sender's name shows above the first bubble of a run.
            firstInRun: scene.lines[i - 1]?.from !== line.from,
            delay: typingDelay(line.text),
        }
    })
}

/** The avatar letter: first character (not UTF-16 unit), uppercased. */
export function initial(name: string): string {
    return (Array.from(name.trim())[0] ?? '').toUpperCase()
}

export function endMessage(name: string | null): string {
    return name
        ? `That's it. You're ready to talk about ${name}.`
        : "That's it. You're ready."
}
