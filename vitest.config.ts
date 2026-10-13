import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        fsModuleCache: true,
        passWithNoTests: true,
        exclude: [
            '**/node_modules/**',
            '**/.git/**',
            '**/.claude/**',
            '**/test/e2e/**',
        ],
    },
})
