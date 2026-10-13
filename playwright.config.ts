import { devices } from '@playwright/test'
import { definePreviewConfig } from '@taraxvoid/voidflow/playwright'

const config = definePreviewConfig({
    ciPort: 4344,
    timeout: 60_000,
    projects: [
        {
            name: 'mobile-chrome',
            use: devices['Pixel 7'],
            testIgnore: /a11y\.spec\.ts/,
        },
        {
            name: 'desktop-chrome',
            use: devices['Desktop Chrome'],
            testIgnore: /a11y\.spec\.ts/,
        },
        {
            name: 'a11y',
            use: devices['Pixel 7'],
            testMatch: /a11y\.spec\.ts/,
        },
    ],
})

// /@username pages fetch pronouns.page from the Worker, out of reach of
// page.route, so the preview runs next to a fixture API.
const port = new URL(config.use?.baseURL ?? 'http://localhost:4344').port

export default {
    ...config,
    webServer: config.webServer && {
        ...config.webServer,
        command: `bun scripts/e2e-preview.ts --port ${port}`,
    },
}
