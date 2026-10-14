import { describe, expect, it } from 'vitest'
import { parsePronounInput, pronounLabel } from '../../src/lib/pronouns/parse'

describe('parsePronounInput', () => {
    it.each([
        ['he/they', ['he', 'they']],
        ['she/they/xe', ['she', 'they', 'xe']],
        ['He / They', ['he', 'they']],
        ['she/her', ['she']],
        ['he/him/his/his/himself', ['he/him/his/his/himself']],
        ['ae/aer/aer/aers/aerself', ['ae/aer/aer/aers/aerself']],
        ['she/her/they/them/xe', ['she', 'they', 'xe']],
        ['they/them/theirs', ['they']],
        ['she/her/they/them', ['she', 'they']],
        ['she/her, they/them', ['she', 'they']],
        ['he/him and they/them', ['he', 'they']],
        ['he him they them', ['he', 'they']],
        ['she&xe', ['she', 'xe']],
        ['he/them', ['he', 'they']],
        ['it/its', ['it']],
        ['ze', ['ze']],
        ['ze/zir', ['ze/zir']],
        ['ze/hir', ['ze']],
        ['zir', ['ze/zir']],
        ['xe/xem', ['xe']],
    ])('%s', (input, expected) => {
        expect(parsePronounInput(input)).toEqual(expected)
    })

    it('keeps a full custom set whole', () => {
        expect(parsePronounInput('ne/nem/nir/nirs/nemself')).toEqual([
            'ne/nem/nir/nirs/nemself',
        ])
    })

    it('splits custom sets on commas but not slashes', () => {
        expect(
            parsePronounInput(
                'ne/nem/nir/nirs/nemself, vi/vim/vir/virs/vimself',
            ),
        ).toEqual(['ne/nem/nir/nirs/nemself', 'vi/vim/vir/virs/vimself'])
    })

    it('ends a custom set at a known word', () => {
        expect(parsePronounInput('ne/nem/she')).toEqual(['ne/nem', 'she'])
    })

    it('keeps special values', () => {
        expect(parsePronounInput('null')).toEqual(['null'])
        expect(parsePronounInput('ask-me/they')).toEqual(['ask-me', 'they'])
        expect(parsePronounInput(':Void')).toEqual([':Void'])
    })

    it('strips a pasted pronouns.page link', () => {
        expect(parsePronounInput('https://en.pronouns.page/he&they')).toEqual([
            'he',
            'they',
        ])
    })

    it('drops repeats and empty input', () => {
        expect(parsePronounInput('she, she/her')).toEqual(['she'])
        expect(parsePronounInput('  ')).toEqual([])
        expect(parsePronounInput('/,/')).toEqual([])
    })
})

describe('pronounLabel', () => {
    it('labels known sets and passes others through', () => {
        expect(pronounLabel('he')).toBe('he/him')
        expect(pronounLabel('ze/zir')).toBe('ze/zir')
        expect(pronounLabel('null')).toBe('name only')
        expect(pronounLabel('ne/nem')).toBe('ne/nem')
    })
})
