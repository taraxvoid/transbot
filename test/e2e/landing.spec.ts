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
        // The real card fixture, so the redirect has a page to land on.
        if (username === 'testcard') return route.fallback()
        if (username === 'empty') {
            return route.fulfill({
                json: { identity: identity(null, false) },
            })
        }
        return route.fulfill({ status: 404, json: { error: 'not-found' } })
    })
}

const SETUP = 'Create profile on pronouns.page'

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

const USERNAME = 'username / link'

function cardForm(page: Page) {
    return page.getByRole('form', {
        name: 'Or use your pronouns.page profile',
    })
}

function builderForm(page: Page) {
    return page.getByRole('form', { name: 'Choose Your Name / Pronouns' })
}

test('required fields are marked', async ({ page }) => {
    await page.goto('/')
    await expect(
        page.getByRole('textbox', { name: 'Name', exact: true }),
    ).toHaveAttribute('required', '')
    await expect(page.getByLabel(USERNAME)).toHaveAttribute('required', '')
    await expect(
        page.getByRole('group', { name: 'Pronouns (required)' }),
    ).toBeVisible()
    await expect(page.locator('.req').first()).toBeVisible()
})

test('a found card redirects to its page with Copy link', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel(USERNAME).fill('@testcard')
    await cardForm(page).getByRole('button', { name: 'Submit' }).click()
    await expect(page).toHaveURL(/\/profile\/testcard$/)
    await expect(
        page.getByRole('heading', { name: 'Your link is ready' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
})

test('a missing card says so and stays on the page', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel(USERNAME).fill('nobody')
    await cardForm(page).getByRole('button', { name: 'Submit' }).click()
    await expect(
        page.getByText(
            "We couldn't find that card yet. Cards show up once they're saved on pronouns.page.",
        ),
    ).toBeVisible()
    await expect(page.getByLabel(USERNAME)).toHaveAttribute(
        'aria-invalid',
        'true',
    )
    await expect(page).toHaveURL(/\/$/)
})

test('a card with nothing marked yes says so', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel(USERNAME).fill('empty')
    await cardForm(page).getByRole('button', { name: 'Submit' }).click()
    await expect(
        page.getByText('nothing on it is marked yes yet'),
    ).toBeVisible()
})

test('an empty or invalid username says what is wrong', async ({ page }) => {
    await page.goto('/')
    const submit = cardForm(page).getByRole('button', { name: 'Submit' })
    await submit.click()
    await expect(
        page.getByText('Enter your pronouns.page username or profile link.'),
    ).toBeVisible()
    await page.getByLabel(USERNAME).fill('not a name')
    await submit.click()
    await expect(
        page.getByText("That doesn't look like a pronouns.page username."),
    ).toBeVisible()
    await expect(page.getByLabel(USERNAME)).toBeFocused()
})

test('the form redirects to a working practice link with Copy link', async ({
    page,
}) => {
    await mockPronounsPage(page)
    await page.goto('/')
    await page
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill('Sam Lee')
    await page.getByRole('checkbox', { name: 'xe/xem' }).check()
    await page.getByRole('checkbox', { name: 'she/her' }).check()
    await expect(
        page.getByText('Primary: xe/xem. Secondary: she/her.'),
    ).toBeVisible()
    await builderForm(page).getByRole('button', { name: 'Submit' }).click()
    await expect(page).toHaveURL(/\/practice\/Sam%20Lee\?pronouns=xe\+she$/)
    await expect(
        page.getByRole('heading', { name: 'Sam Lee uses xe/xem and she/her' }),
    ).toBeVisible()
    const bar = page.getByRole('region', { name: 'Your link is ready' })
    await expect(bar.getByRole('button', { name: 'Copy link' })).toBeVisible()
    await expect(
        bar.getByRole('link', { name: 'Share on WhatsApp' }),
    ).toHaveAttribute(
        'href',
        /^https:\/\/wa\.me\/\?text=.*pronouns%3Dxe%2Bshe$/,
    )
    // The raw link stays hidden unless Copy fails.
    await expect(bar.getByRole('textbox')).toHaveCount(0)
    // Compact, right under the heading.
    expect(
        await page.evaluate(
            () => document.querySelector('#practice > h1 + section')?.className,
        ),
    ).toContain('share-bar')
})

test('a practice link opened fresh offers to share it, not "link is ready"', async ({
    page,
}) => {
    await mockPronounsPage(page)
    await page.goto('/practice/Sam?pronouns=xe')
    await expect(
        page.getByRole('heading', { name: 'Sam uses xe/xem' }),
    ).toBeVisible()
    await expect(
        page.getByRole('heading', { name: 'Your link is ready' }),
    ).toHaveCount(0)
    const bar = page.getByRole('region', { name: 'Share this page' })
    await expect(bar.getByRole('button', { name: 'Copy link' })).toBeVisible()
    for (const app of [
        'WhatsApp',
        'Telegram',
        'Bluesky',
        'Email',
        'Text message',
    ]) {
        await expect(
            bar.getByRole('link', { name: `Share on ${app}` }),
        ).toBeVisible()
    }
    // A visitor may not be the person named.
    await expect(
        bar.getByRole('link', { name: 'Share on Email' }),
    ).toHaveAttribute('href', /subject=Practice%20a%20name/)
    // Every target carries the URL the visitor is on, unchanged.
    const hrefs = await bar
        .locator('a.share-target')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
    for (const href of hrefs) {
        expect(decodeURIComponent(href)).toContain(page.url())
    }
})

test('an old ?p= link still works', async ({ page }) => {
    await mockPronounsPage(page)
    await page.goto('/practice/Sam?p=xe')
    await expect(
        page.getByRole('heading', { name: 'Sam uses xe/xem' }),
    ).toBeVisible()
})

test('when Copy fails the link shows up selected to copy by hand', async ({
    page,
}) => {
    await mockPronounsPage(page)
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: () => Promise.reject(new Error('blocked')) },
        })
    })
    await page.goto('/practice/Sam?pronouns=xe')
    const bar = page.getByRole('region', { name: 'Share this page' })
    await bar.getByRole('button', { name: 'Copy link' }).click()
    await expect(bar.getByRole('button', { name: 'Copy failed' })).toBeVisible()
    const field = bar.getByRole('textbox', { name: 'Link to copy' })
    await expect(field).toHaveValue(page.url())
    await expect(field).toBeFocused()
})

test('Share shows only where the browser can share', async ({ page }) => {
    await mockPronounsPage(page)
    await page.addInitScript(() => {
        sessionStorage.setItem(
            'transbot:just-made',
            '/practice/Sam?pronouns=xe',
        )
    })
    await page.goto('/practice/Sam?pronouns=xe')
    const bar = page.getByRole('region', { name: 'Your link is ready' })
    await expect(bar.getByRole('button', { name: 'Copy link' })).toBeVisible()
    const canShare = await page.evaluate(
        () => typeof navigator.share === 'function',
    )
    await expect(bar.getByRole('button', { name: 'Share' })).toHaveCount(
        canShare ? 1 : 0,
    )
})

test('submitting with nothing filled in marks both fields', async ({
    page,
}) => {
    await page.goto('/')
    await builderForm(page).getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByText('Enter your name.')).toBeVisible()
    await expect(
        page.getByText(
            'Pick at least one, or type them under Custom pronouns.',
        ),
    ).toBeVisible()
    await expect(
        page.getByRole('textbox', { name: 'Name', exact: true }),
    ).toBeFocused()
    await expect(page).toHaveURL(/\/$/)
    // Fixing a field clears its message.
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Sam')
    await expect(page.getByText('Enter your name.')).toBeHidden()
    await page.getByRole('checkbox', { name: 'she/her' }).check()
    await expect(
        page.getByText(
            'Pick at least one, or type them under Custom pronouns.',
        ),
    ).toBeHidden()
})

test('the builder understands typed shorthand and pick order', async ({
    page,
}) => {
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Sam')
    await page.getByRole('checkbox', { name: 'it/its' }).check()
    await page.getByRole('checkbox', { name: 'she/her' }).check()
    await page.getByLabel('Custom pronouns').fill('he/they')
    await builderForm(page).getByRole('button', { name: 'Submit' }).click()
    await expect(page).toHaveURL(/\/practice\/Sam\?pronouns=it\+she\+he\+they$/)
})

test('the builder offers void pronouns as a checkbox', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Sam')
    await page.getByRole('checkbox', { name: "void/void's" }).check()
    await builderForm(page).getByRole('button', { name: 'Submit' }).click()
    await expect(page).toHaveURL(/\/practice\/Sam\?pronouns=:void$/)
})

test('the builder only links pronouns pronouns.page has', async ({ page }) => {
    const requests: string[] = []
    await mockPronounsPage(page, requests)
    await page.goto('/')
    const submit = builderForm(page).getByRole('button', { name: 'Submit' })
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Sam')
    await page.getByLabel('Custom pronouns').fill('xee')
    await submit.click()
    await expect(
        page.getByText(
            `pronouns.page doesn't have "xee" yet. You can write out all five forms, like ae/aer/aer/aers/aerself.`,
        ),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/$/)

    await page.getByRole('checkbox', { name: 'she/her' }).check()
    await page.getByLabel('Custom pronouns').fill('ne/nem/nir/nirs/nemself')
    await submit.click()
    await expect(page).toHaveURL(
        /\/practice\/Sam\?pronouns=she\+ne\/nem\/nir\/nirs\/nemself$/,
    )
    // Common sets are never looked up, and the name never goes to pronouns.page.
    expect(requests.some((url) => url.endsWith('/pronouns/she'))).toBe(false)
    expect(requests.some((url) => url.includes('Sam'))).toBe(false)
})

test('the builder says when pronouns.page is unreachable', async ({ page }) => {
    await page.route('https://en.pronouns.page/api/**', (route) =>
        route.fulfill({ status: 503 }),
    )
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Sam')
    await page.getByLabel('Custom pronouns').fill('ne/nem')
    await builderForm(page).getByRole('button', { name: 'Submit' }).click()
    await expect(
        page.getByText(
            "Couldn't reach pronouns.page to check those pronouns. Try again in a moment.",
        ),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
})

test('editing during a pronouns.page check cancels the redirect', async ({
    page,
}) => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
        release = resolve
    })
    await page.route('https://en.pronouns.page/api/**', async (route) => {
        await gate
        await route.fulfill({ status: 503 })
    })
    await page.goto('/')
    const name = page.getByRole('textbox', { name: 'Name', exact: true })
    await name.fill('Sam')
    await page.getByLabel('Custom pronouns').fill('ne/nem')
    const requested = page.waitForRequest('https://en.pronouns.page/api/**')
    await builderForm(page).getByRole('button', { name: 'Submit' }).click()
    await requested
    await name.fill('Sammy')
    release()
    await page.evaluate(() => new Promise((r) => setTimeout(r, 200)))
    // The stale answer is dropped: no error shown for the old values.
    await expect(page.getByText("Couldn't reach pronouns.page")).toHaveCount(0)
    await expect(page).toHaveURL(/\/$/)
})

test('/<name> fills the landing page name', async ({ page }) => {
    await page.goto('/asher')
    await expect(page).toHaveURL(/\/\?name=asher$/)
    await expect(page.getByLabel(/^Name/)).toHaveValue('asher')
})
