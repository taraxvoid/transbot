import { expect, type Page, test } from '@playwright/test'
import { mockPronounsPage } from './mock-pronouns-page'

const XE = {
    pronoun_subject: 'xe',
    pronoun_object: 'xem',
    possessive_determiner: 'xyr',
    possessive_pronoun: 'xyrs',
    reflexive: 'xemself',
}

function identity(preferred: string | null, withSet: boolean) {
    return {
        names: { preferred, accepted: preferred ? [preferred] : [] },
        sets: withSet
            ? [
                  {
                      kind: 'pronouns',
                      label: 'xe/xem',
                      forms: XE,
                      pronunciations: {},
                      opinion: 'yes',
                  },
              ]
            : [],
        askMe: null,
        templates: [],
    }
}

async function mockCards(page: Page): Promise<void> {
    await page.route('**/api/card/*', async (route) => {
        const username = new URL(route.request().url()).pathname
            .split('/')
            .pop()
        if (username === 'found') {
            return route.fulfill({ json: { identity: identity('Sam', true) } })
        }
        if (username === 'empty') {
            return route.fulfill({
                json: { identity: identity(null, false) },
            })
        }
        if (username === 'slow') {
            await new Promise((r) => setTimeout(r, 1500))
            return route.fulfill({
                json: { identity: identity('Slow', true) },
            })
        }
        return route.fulfill({ status: 404, json: { error: 'not-found' } })
    })
}

const SETUP = 'set up a pronouns.page card'
const PROMPT = 'Made your card? Enter your username to get your link.'

test.beforeEach(async ({ page }) => {
    await mockCards(page)
})

test('the setup link opens pronouns.page in a new tab', async ({ page }) => {
    await page.goto('/')
    const link = page.getByRole('link', { name: SETUP })
    await expect(link).toHaveAttribute(
        'href',
        'https://en.pronouns.page/account',
    )
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
})

test('coming back after setup asks for the username', async ({
    page,
    context,
}) => {
    await context.route('https://en.pronouns.page/**', (route) =>
        route.fulfill({ body: 'ok' }),
    )
    await page.goto('/')
    const popup = page.waitForEvent('popup')
    await page.getByRole('link', { name: SETUP }).click()
    await (await popup).close()
    await page.evaluate(() =>
        document.dispatchEvent(new Event('visibilitychange')),
    )
    await expect(page.getByText(PROMPT)).toBeVisible()
    await expect(
        page.getByLabel('pronouns.page username or link'),
    ).toBeFocused()
})

test('a later visit shows the prompt until 14 days pass', async ({ page }) => {
    await page.addInitScript(() =>
        localStorage.setItem(
            'transbot:setup-clicked',
            String(Date.now() - 1000),
        ),
    )
    await page.goto('/')
    await expect(page.getByText(PROMPT)).toBeVisible()
})

test('a stale flag is ignored', async ({ page }) => {
    await page.addInitScript(() =>
        localStorage.setItem(
            'transbot:setup-clicked',
            String(Date.now() - 15 * 24 * 60 * 60 * 1000),
        ),
    )
    await page.goto('/')
    await expect(page.getByText(PROMPT)).toBeHidden()
})

test('not now dismisses the prompt', async ({ page }) => {
    await page.addInitScript(() =>
        localStorage.setItem('transbot:setup-clicked', String(Date.now())),
    )
    await page.goto('/')
    await page.getByRole('button', { name: 'Not now' }).click()
    await expect(page.getByText(PROMPT)).toBeHidden()
    expect(
        await page.evaluate(() =>
            localStorage.getItem('transbot:setup-clicked'),
        ),
    ).toBeNull()
})

test('a found card shows the preview, link and copy button', async ({
    page,
}) => {
    await page.addInitScript(() =>
        localStorage.setItem('transbot:setup-clicked', String(Date.now())),
    )
    await page.goto('/')
    await page.getByLabel('pronouns.page username or link').fill('@found')
    await expect(
        page.getByText('transbot will teach: Sam, xe/xem'),
    ).toBeVisible()
    await expect(
        page.getByRole('link', { name: /\/profile\/found$/ }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
    expect(
        await page.evaluate(() =>
            localStorage.getItem('transbot:setup-clicked'),
        ),
    ).toBeNull()
})

test('a missing card keeps the prompt open', async ({ page }) => {
    await page.addInitScript(() =>
        localStorage.setItem('transbot:setup-clicked', String(Date.now())),
    )
    await page.goto('/')
    await page.getByLabel('pronouns.page username or link').fill('nobody')
    await expect(
        page.getByText(
            "We couldn't find that card yet. Cards show up once they're saved on pronouns.page.",
        ),
    ).toBeVisible()
    await expect(page.getByText(PROMPT)).toBeVisible()
})

test('a card with nothing marked yes says so', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('pronouns.page username or link').fill('empty')
    await expect(
        page.getByText('nothing on it is marked yes yet'),
    ).toBeVisible()
})

test('a slow earlier lookup never replaces the latest one', async ({
    page,
}) => {
    await page.goto('/')
    const field = page.getByLabel('pronouns.page username or link')
    await field.fill('slow')
    await page.waitForTimeout(600)
    await field.fill('found')
    await expect(
        page.getByRole('link', { name: /\/profile\/found$/ }),
    ).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(
        page.getByRole('link', { name: /\/profile\/slow$/ }),
    ).toHaveCount(0)
    await expect(
        page.getByRole('link', { name: /\/profile\/found$/ }),
    ).toBeVisible()
})

test('the name and pronouns form makes a working practice link', async ({
    page,
}) => {
    await mockPronounsPage(page)
    await page.goto('/')
    await page.getByLabel('Your name', { exact: true }).fill('Sam Lee')
    await page.getByRole('checkbox', { name: 'xe/xem' }).check()
    await page.getByRole('checkbox', { name: 'she/her' }).check()
    await expect(
        page.getByText('The chat uses xe/xem. Also fine: she/her.'),
    ).toBeVisible()
    const link = page.getByRole('link', {
        name: /\/practice\/Sam%20Lee\?p=xe\+she$/,
    })
    await expect(link).toBeVisible()
    await link.click()
    await expect(
        page.getByRole('heading', { name: 'Practice with Sam Lee' }),
    ).toBeVisible()
})

test('the link builder understands typed shorthand', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Your name', { exact: true }).fill('Sam')
    await page.getByRole('checkbox', { name: 'she/her' }).check()
    await page.getByLabel('Other pronouns').fill('he/they')
    await expect(
        page.getByRole('link', { name: /\/practice\/Sam\?p=she\+he\+they$/ }),
    ).toBeVisible()
    // Picked sets come first, in pick order; rechecking moves one last.
    await page.getByRole('checkbox', { name: 'it/its' }).check()
    await page.getByRole('checkbox', { name: 'she/her' }).uncheck()
    await page.getByRole('checkbox', { name: 'she/her' }).check()
    await expect(
        page.getByRole('link', {
            name: /\/practice\/Sam\?p=it\+she\+he\+they$/,
        }),
    ).toBeVisible()
    await page.getByRole('checkbox', { name: 'it/its' }).uncheck()
    await page.getByLabel('Other pronouns').fill('')
    await page.getByRole('checkbox', { name: 'she/her' }).uncheck()
    await expect(
        page.getByRole('link', { name: /\/practice\/Sam/ }),
    ).toHaveCount(0)
})

test('the link builder only links pronouns pronouns.page has', async ({
    page,
}) => {
    const requests: string[] = []
    await mockPronounsPage(page, requests)
    await page.goto('/')
    await page.getByLabel('Your name', { exact: true }).fill('Sam')
    await page.getByLabel('Other pronouns').fill('xee')
    await expect(
        page.getByText(
            `pronouns.page doesn't have "xee" yet. You can write out all five forms, like ae/aer/aer/aers/aerself.`,
        ),
    ).toBeVisible()
    await expect(
        page.getByRole('link', { name: /\/practice\/Sam/ }),
    ).toHaveCount(0)

    await page.getByLabel('Other pronouns').fill('ne/nem/nir/nirs/nemself')
    await expect(
        page.getByRole('link', {
            name: /\/practice\/Sam\?p=ne\/nem\/nir\/nirs\/nemself$/,
        }),
    ).toBeVisible()
    // Common sets are never looked up, and the name never goes to pronouns.page.
    await page.getByRole('checkbox', { name: 'she/her' }).check()
    expect(requests.some((url) => url.endsWith('/pronouns/she'))).toBe(false)
    expect(requests.some((url) => url.includes('Sam'))).toBe(false)
})

test('the link builder says when pronouns.page is unreachable', async ({
    page,
}) => {
    await page.route('https://en.pronouns.page/api/**', (route) =>
        route.fulfill({ status: 503 }),
    )
    await page.goto('/')
    await page.getByLabel('Your name', { exact: true }).fill('Sam')
    await page.getByLabel('Other pronouns').fill('ne/nem')
    await expect(
        page.getByText(
            "Couldn't reach pronouns.page to check those pronouns. Try again in a moment.",
        ),
    ).toBeVisible()
    await expect(
        page.getByRole('link', { name: /\/practice\/Sam/ }),
    ).toHaveCount(0)
})

test('a response landing inside the debounce window is discarded', async ({
    page,
}) => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
        release = resolve
    })
    await page.route('**/api/card/gate', async (route) => {
        await gate
        await route.fulfill({ json: { identity: identity('Gate', true) } })
    })
    await page.goto('/')
    const field = page.getByLabel('pronouns.page username or link')
    const requested = page.waitForRequest('**/api/card/gate')
    await field.fill('gate')
    await requested
    // Change the field, then let the old response land before the debounce.
    await field.fill('found')
    release()
    await page.evaluate(() => new Promise((r) => setTimeout(r, 150)))
    await expect(
        page.getByRole('link', { name: /\/profile\/gate$/ }),
    ).toHaveCount(0)
    await expect(
        page.getByRole('link', { name: /\/profile\/found$/ }),
    ).toBeVisible()
})

test('clearing the field removes a shown card at once', async ({ page }) => {
    await page.goto('/')
    const field = page.getByLabel('pronouns.page username or link')
    await field.fill('found')
    await expect(
        page.getByRole('link', { name: /\/profile\/found$/ }),
    ).toBeVisible()
    await field.fill('')
    await expect(
        page.getByRole('link', { name: /\/profile\/found$/ }),
    ).toHaveCount(0)
})

test('an invalid username never shows the checking note', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('pronouns.page username or link').fill('not a name')
    // Read at once: a retrying assertion would wait out the debounce.
    expect(await page.locator('#card-result').textContent()).toBe('')
})
