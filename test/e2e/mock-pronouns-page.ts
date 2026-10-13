import type { Page } from '@playwright/test'
import { fixtureResponse } from '../fixtures/resolve'

/** Serves pronouns.page API calls made by the browser from fixtures. */
export async function mockPronounsPage(
    page: Page,
    requests: string[] = [],
): Promise<void> {
    await page.route('https://en.pronouns.page/api/**', async (route) => {
        const url = new URL(route.request().url())
        requests.push(url.href)
        const res = fixtureResponse(url.pathname)
        await route.fulfill({
            status: res.status,
            contentType: 'application/json',
            headers: { 'access-control-allow-origin': '*' },
            body: await res.text(),
        })
    })
}
