import { describe, expect, it } from 'vitest'
import {
    endMessage,
    initial,
    stepsFor,
    typingDelay,
} from '../../src/lib/scenes/playback'
import type { RenderedScene } from '../../src/lib/scenes/render'

describe('typingDelay', () => {
    it('clamps 600 + 25 per character to 800..1800', () => {
        expect(typingDelay('')).toBe(800)
        expect(typingDelay('x'.repeat(20))).toBe(1100)
        expect(typingDelay('x'.repeat(100))).toBe(1800)
    })
})

describe('stepsFor', () => {
    it('turns me lines into turns and marks the first bubble of each run', () => {
        const scene: RenderedScene = {
            id: 's',
            group: 'G',
            lines: [
                { from: 'a', sender: 'Alex', text: 'one' },
                { from: 'a', sender: 'Alex', text: 'two' },
                { from: 'b', sender: 'Maya', text: 'three' },
                { from: 'me', sender: 'You', text: 'four' },
                { from: 'a', sender: 'Alex', text: 'five' },
            ],
        }
        expect(
            stepsFor(scene).map((s) =>
                s.kind === 'friend'
                    ? `${s.line.text}:${s.firstInRun}`
                    : `turn:${s.line.text}`,
            ),
        ).toEqual([
            'one:true',
            'two:false',
            'three:true',
            'turn:four',
            'five:true',
        ])
    })

    it('gives each friend step its typing delay', () => {
        const scene: RenderedScene = {
            id: 's',
            group: 'G',
            lines: [{ from: 'a', sender: 'Alex', text: 'x'.repeat(20) }],
        }
        const [step] = stepsFor(scene)
        expect(step.kind === 'friend' && step.delay).toBe(1100)
    })
})

describe('initial', () => {
    it('takes the first letter, uppercased, accents included', () => {
        expect(initial('alex')).toBe('A')
        expect(initial('Ömer')).toBe('Ö')
    })
})

describe('endMessage', () => {
    it('names the person, or leaves the name out', () => {
        expect(endMessage('Tara')).toBe(
            "That's it. You're ready to talk about Tara.",
        )
        expect(endMessage(null)).toBe("That's it. You're ready.")
    })
})
