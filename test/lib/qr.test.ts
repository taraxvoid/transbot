import { describe, expect, it } from 'vitest'
import { qrImage } from '../../src/lib/qr'

describe('qrImage', () => {
    it('makes a branded standalone SVG with the caption', () => {
        const { svg, width, height } = qrImage(
            'https://transbot.net/practice/x',
            'transbot.net',
        )
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(
            true,
        )
        expect(svg).toContain('#6b3fa0')
        expect(svg).toContain('>transbot.net</text>')
        expect(height).toBeGreaterThan(width)
    })

    it('escapes the caption', () => {
        const { svg } = qrImage('https://transbot.net', '<b>&')
        expect(svg).toContain('&lt;b&gt;&amp;')
        expect(svg).not.toContain('<b>')
    })

    it('is deterministic and differs per link', () => {
        const a = qrImage('https://transbot.net/a', 'x').svg
        expect(qrImage('https://transbot.net/a', 'x').svg).toBe(a)
        expect(qrImage('https://transbot.net/b', 'x').svg).not.toBe(a)
    })
})
