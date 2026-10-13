import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        passWithNoTests: true,
        exclude: [
            '**/node_modules/**',
            '**/.git/**',
            '**/.claude/**',
            '**/test/e2e/**',
        ],
    },
})
