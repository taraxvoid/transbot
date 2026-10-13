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

const SETUP = 'Set up your pronouns.page card'
const PROMPT = 'Made your card? Enter your username to get your link.'

test.beforeEach(async ({ page }) => {
    await mockCards(page)
})

test('the setup link opens pronouns.page in a new tab', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: "I don't have one yet" }).click()
    const link = page.getByRole('link', { name: SETUP })
    await expect(link).toHaveAttribute(
        'href',
        'https://en.pronouns.page/account',
    )
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
    await expect(
        page.getByText('The link builder below works without an account.'),
    ).toBeVisible()
})

test('coming back after setup asks for the username', async ({
    page,
    context,
}) => {
    await context.route('https://en.pronouns.page/**', (route) =>
        route.fulfill({ body: 'ok' }),
    )
    await page.goto('/')
    await page.getByRole('button', { name: "I don't have one yet" }).click()
    const popup = page.waitForEvent('popup')
    await page.getByRole('link', { name: SETUP }).click()
    await (await popup).close()
    await page.evaluate(() =>
        document.dispatchEvent(new Event('visibilitychange')),
    )
    await expect(page.getByText(PROMPT)).toBeVisible()
    await expect(page.getByLabel('pronouns.page username')).toBeFocused()
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
    await page.getByLabel('pronouns.page username').fill('@found')
    await expect(
        page.getByText('transbot will teach: Sam, xe/xem'),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /\/@found$/ })).toBeVisible()
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
    await page.getByLabel('pronouns.page username').fill('nobody')
    await expect(
        page.getByText(
            "We couldn't find that card yet. Cards show up once they're saved on pronouns.page.",
        ),
    ).toBeVisible()
    await expect(page.getByText(PROMPT)).toBeVisible()
})

test('a card with nothing marked yes says so', async ({ page }) => {
    await page.goto('/')
    await page
        .getByRole('button', { name: 'I have a pronouns.page card' })
        .click()
    await page.getByLabel('pronouns.page username').fill('empty')
    await expect(
        page.getByText('nothing on it is marked yes yet'),
    ).toBeVisible()
})

test('a slow earlier lookup never replaces the latest one', async ({
    page,
}) => {
    await page.goto('/')
    await page
        .getByRole('button', { name: 'I have a pronouns.page card' })
        .click()
    const field = page.getByLabel('pronouns.page username')
    await field.fill('slow')
    await page.waitForTimeout(600)
    await field.fill('found')
    await expect(page.getByRole('link', { name: /\/@found$/ })).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(page.getByRole('link', { name: /\/@slow$/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /\/@found$/ })).toBeVisible()
})

test('the link builder makes a working practice link', async ({ page }) => {
    await mockPronounsPage(page)
    await page.goto('/')
    await page.getByLabel('Name', { exact: true }).fill('Sam Lee')
    await page.getByLabel('Pronouns', { exact: true }).fill('xe&she')
    const link = page.getByRole('link', {
        name: /\/practice#n=Sam\+Lee&p=xe%26she$/,
    })
    await expect(link).toBeVisible()
    await link.click()
    await expect(
        page.getByRole('heading', { name: 'Practice with Sam Lee' }),
    ).toBeVisible()
})
