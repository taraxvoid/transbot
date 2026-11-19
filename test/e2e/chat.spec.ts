import { expect, type Locator, type Page, test } from '@playwright/test'
import { mockPronounsPage } from './mock-pronouns-page'

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
    await mockPronounsPage(page)
})

function chat(page: Page): Locator {
    return page.getByRole('region', { name: 'Group chat' })
}

function sendButton(page: Page): Locator {
    return chat(page).getByRole('button', { name: 'Send' })
}

/** Presses Send on every turn until the scene's end button shows up. */
async function playScene(page: Page): Promise<void> {
    const done = page.getByRole('button', { name: /^(Next chat|Start over)$/ })
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
        if (await done.isVisible()) return
        if (
            (await sendButton(page).getAttribute('aria-disabled')) === 'false'
        ) {
            await sendButton(page).click()
        } else {
            await page.waitForTimeout(50)
        }
    }
    throw new Error('the scene never ended')
}

test('a scene plays by tapping Send', async ({ page }) => {
    await page.goto('/practice/Quillon?pronouns=xe')
    const panel = chat(page)
    await expect(
        panel.getByRole('heading', { name: 'sandwich remuneration' }),
    ).toBeVisible()
    await expect(
        panel.getByText(
            "I accidentally ate xyr sandwich, I didn't see it said Quillon",
        ),
    ).toBeVisible()
    await expect(panel.getByText('I hope xe is not too peeved')).toBeVisible()
    const compose = page.locator('#compose-text')
    await expect(compose).toHaveText(
        'Buy xe two just in case (so I can snag one)',
    )
    await sendButton(page).click()
    const mine = panel.locator('.thread .me')
    await expect(mine).toHaveCount(1)
    await expect(mine).toContainText(
        'Buy xe two just in case (so I can snag one)',
    )
    await expect(mine.getByText('Delivered')).toBeVisible()
    await expect(compose).toHaveText('')
    await expect(sendButton(page)).toHaveAttribute('aria-disabled', 'true')
})

test('Next chat runs through to the end and Start over restarts', async ({
    page,
}) => {
    await page.goto('/practice/Quillon?pronouns=xe')
    for (let scene = 0; scene < 3; scene++) {
        await playScene(page)
        const next = page.getByRole('button', { name: 'Next chat' })
        await expect(next).toBeFocused()
        await next.click()
        await expect(sendButton(page)).toBeFocused()
    }
    await playScene(page)
    await expect(
        page.getByText("That's it. You're ready to talk about Quillon."),
    ).toBeVisible()
    const again = page.getByRole('button', { name: 'Start over' })
    await expect(again).toBeFocused()
    await again.click()
    await expect(
        chat(page).getByRole('heading', { name: 'sandwich remuneration' }),
    ).toBeVisible()
    await expect(sendButton(page)).toBeFocused()
})

test('the last chat offers to share this link or make your own', async ({
    page,
    context,
    browserName,
}) => {
    await page.goto('/practice/Quillon?pronouns=xe')
    const box = page.getByRole('region', { name: 'Pass it on' })
    for (let scene = 0; scene < 3; scene++) {
        await playScene(page)
        await expect(box).toHaveCount(0)
        await page.getByRole('button', { name: 'Next chat' }).click()
    }
    await playScene(page)
    await expect(box).toBeVisible()
    // Start over keeps focus, so the box doesn't steal it.
    await expect(page.getByRole('button', { name: 'Start over' })).toBeFocused()
    await expect(
        box.getByRole('link', { name: 'Make your own' }),
    ).toHaveAttribute('href', '/')
    // No raw link; it only shows if Copy fails.
    await expect(box.getByRole('link', { name: page.url() })).toHaveCount(0)
    await expect(
        box.getByRole('link', { name: 'Share on WhatsApp' }),
    ).toBeVisible()
    const canShare = await page.evaluate(
        () => typeof navigator.share === 'function',
    )
    await expect(box.getByRole('button', { name: 'Share' })).toHaveCount(
        canShare ? 1 : 0,
    )
    if (browserName === 'chromium') {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await box.getByRole('button', { name: 'Copy link' }).click()
        await expect(box.getByRole('button', { name: 'Copied' })).toBeVisible()
        // The URL the visitor is on, unchanged.
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
            page.url(),
        )
    }
})

test('the keyboard alone can play a scene', async ({ page }) => {
    await page.goto('/practice/Quillon?pronouns=xe')
    await expect(sendButton(page)).toHaveAttribute('aria-disabled', 'false')
    await sendButton(page).focus()
    await page.keyboard.press('Enter')
    await expect(chat(page).locator('.thread .me')).toHaveCount(1)
    await page.getByRole('button', { name: 'Next chat' }).press('Space')
    await expect(sendButton(page)).toBeFocused()
    await expect(sendButton(page)).toHaveAttribute('aria-disabled', 'false')
    await page.keyboard.press('Space')
    await expect(chat(page).locator('.thread .me')).toHaveCount(1)
    await expect(sendButton(page)).toBeFocused()
})

test('rapid Send clicks never skip or repeat lines', async ({ page }) => {
    await page.goto('/practice/Quillon?pronouns=xe')
    await expect(sendButton(page)).toHaveAttribute('aria-disabled', 'false')
    for (let i = 0; i < 5; i++) await sendButton(page).click({ force: true })
    const mine = chat(page).locator('.thread .me')
    await expect(mine).toHaveCount(1)
    const texts = await chat(page).locator('.thread .text').allTextContents()
    expect(new Set(texts).size).toBe(texts.length)
})

/** Pins the roll that picks which of the person's sets a chat is about. */
async function pinRoll(page: Page, roll: number): Promise<void> {
    await page.addInitScript((value) => {
        Math.random = () => value
    }, roll)
}

test('/profile/testcard renders the chat about Sam with xe', async ({
    page,
}) => {
    // A high roll is the primary set; xe/xem is the card's first set.
    await pinRoll(page, 0.99)
    await page.goto('/profile/testcard')
    await expect(
        chat(page).getByText(
            "I accidentally ate xyr sandwich, I didn't see it said Sam",
        ),
    ).toBeVisible()
    await expect(
        chat(page).getByText('I hope xe is not too peeved'),
    ).toBeVisible()
})

test('/profile/testcard can chat about Sam with her secondary set', async ({
    page,
}) => {
    // A low roll lands on the first secondary set, she/her.
    await pinRoll(page, 0)
    await page.goto('/profile/testcard')
    await expect(
        chat(page).getByText(
            "I accidentally ate her sandwich, I didn't see it said Sam",
        ),
    ).toBeVisible()
    await expect(
        chat(page).getByText('I hope she is not too peeved'),
    ).toBeVisible()
})

test('a name-only link chats with the name', async ({ page }) => {
    await page.goto('/practice/Tara?pronouns=null')
    await expect(
        chat(page).getByText(
            "I accidentally ate Tara's sandwich, I didn't see it said Tara",
        ),
    ).toBeVisible()
    await expect(
        chat(page).getByText('I hope Tara is not too peeved'),
    ).toBeVisible()
})

const LONG = 'Wolfeschlegelsteinhausenbergerdorff'

for (const path of [
    `/practice/${LONG}?pronouns=xe`,
    `/practice/${LONG}`,
    `/practice/${LONG}?pronouns=ask-me`,
]) {
    test(`a long name never scrolls ${path} sideways at 360px`, async ({
        page,
    }) => {
        await page.setViewportSize({ width: 360, height: 740 })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        if (path.endsWith('?pronouns=xe')) await sendButton(page).click()
        const width = await page.evaluate(
            () => document.documentElement.scrollWidth,
        )
        expect(width).toBeLessThanOrEqual(360)
    })
}

test('the thread can take keyboard focus to scroll', async ({ page }) => {
    await page.goto('/practice/Quillon?pronouns=xe')
    const thread = chat(page).getByRole('log', { name: 'Messages' })
    await thread.focus()
    await expect(thread).toBeFocused()
})

test('the forms box lists the five forms with IPA', async ({ page }) => {
    await page.goto('/practice/Quillon?pronouns=xe')
    const box = page.locator('details.forms')
    await expect(box.locator('summary')).toHaveText('All forms of xe/xem')
    await box.locator('summary').click()
    for (const [term, value] of [
        ['Subject', 'xe /zi/'],
        ['Object', 'xem /zɛm/'],
        ['Possessive', 'xyr /ziɹ/'],
        ['Possessive pronoun', 'xyrs /ziɹz/'],
        ['Reflexive', 'xemself /zɛmˈsɛlf/'],
    ]) {
        await expect(box.locator(`dt:text-is("${term}") + dd`)).toHaveText(
            value,
        )
    }
})

test('the forms box lists what else is fine', async ({ page }) => {
    await page.goto('/profile/testcard')
    const box = page.locator('details.forms')
    await box.locator('summary').click()
    const also = box.locator('dt:text-is("Also fine") + dd')
    for (const text of ['Sammy', 'she/her', 'they/them']) {
        await expect(also).toContainText(text)
    }
})

test('reduced motion still pauses on a static ellipsis before each bubble', async ({
    page,
}) => {
    await page.goto('/practice/Quillon?pronouns=xe')
    await expect(chat(page).locator('.typing')).toBeVisible()
    await expect(chat(page).locator('.typing .dot').first()).toHaveCSS(
        'animation-name',
        'none',
    )
    await expect(chat(page).locator('.thread .them')).toHaveCount(0)
    await expect(chat(page).locator('.thread .them').first()).toBeVisible()
})

test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('friends type before each bubble', async ({ page }) => {
        await page.goto('/practice/Quillon?pronouns=xe')
        await expect(chat(page).locator('.typing')).toBeVisible()
        await expect(chat(page).locator('.thread .them')).toHaveCount(0)
        await expect(chat(page).locator('.thread .them').first()).toBeVisible()
        await expect(sendButton(page)).toHaveClass(/pulse/, { timeout: 15_000 })
    })
})
