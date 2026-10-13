import { describe, expect, it } from 'vitest'
import { jsonForScript } from '../../src/lib/server/embed'

describe('jsonForScript', () => {
    it('cannot close the script tag and still round-trips', () => {
        const value = { name: '</script><img src=x onerror=alert(1)> ' }
        const json = jsonForScript(value)
        expect(json).not.toContain('</')
        expect(json).not.toContain('<img')
        expect(JSON.parse(json)).toEqual(value)
    })
})
