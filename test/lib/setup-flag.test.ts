import { describe, expect, it } from 'vitest'
import {
    clearSetup,
    type FlagStorage,
    isSetupPending,
    markSetupClicked,
    SETUP_KEY,
    SETUP_TTL_MS,
} from '../../src/lib/setup-flag'

function memory(): FlagStorage & { data: Map<string, string> } {
    const data = new Map<string, string>()
    return {
        data,
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => void data.set(k, v),
        removeItem: (k) => void data.delete(k),
    }
}

const throwing: FlagStorage = {
    getItem: () => {
        throw new Error('blocked')
    },
    setItem: () => {
        throw new Error('blocked')
    },
    removeItem: () => {
        throw new Error('blocked')
    },
}

describe('setup flag', () => {
    it('is pending after a click and cleared on demand', () => {
        const storage = memory()
        markSetupClicked(storage, 1000)
        expect(isSetupPending(storage, 2000)).toBe(true)
        clearSetup(storage)
        expect(isSetupPending(storage, 2000)).toBe(false)
    })

    it('expires after 14 days and removes itself', () => {
        const storage = memory()
        markSetupClicked(storage, 0)
        expect(isSetupPending(storage, SETUP_TTL_MS + 1)).toBe(false)
        expect(storage.data.has(SETUP_KEY)).toBe(false)
    })

    it('ignores junk and future timestamps', () => {
        const storage = memory()
        storage.setItem(SETUP_KEY, 'soon')
        expect(isSetupPending(storage, 1000)).toBe(false)
        storage.setItem(SETUP_KEY, '5000')
        expect(isSetupPending(storage, 1000)).toBe(false)
    })

    it('works with no storage or storage that throws', () => {
        expect(() => markSetupClicked(throwing, 1)).not.toThrow()
        expect(isSetupPending(throwing, 1)).toBe(false)
        expect(() => clearSetup(throwing)).not.toThrow()
        expect(isSetupPending(null, 1)).toBe(false)
    })
})
