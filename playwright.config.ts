import { devices } from '@playwright/test'
import { definePreviewConfig } from '@taraxvoid/voidflow/playwright'

export default definePreviewConfig({
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
