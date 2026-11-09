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
    for (let round = 0; round < 20; round++) {
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
    await page.goto('/practice/Quillon?p=xe')
    const panel = chat(page)
    await expect(
        panel.getByRole('heading', { name: 'Lunch crew' }),
    ).toBeVisible()
    await expect(
        panel.getByText('Is Quillon still coming Saturday?'),
    ).toBeVisible()
    await expect(
        panel.getByText('Yes! Xe said xe is free after 1'),
    ).toBeVisible()
    const compose = page.locator('#compose-text')
    await expect(compose).toHaveText("Sure, let's confirm the time with xem")
    await sendButton(page).click()
    const mine = panel.locator('.thread .me')
    await expect(mine).toHaveCount(1)
    await expect(mine).toContainText("Sure, let's confirm the time with xem")
    await expect(mine.getByText('Delivered')).toBeVisible()
    await expect(compose).toHaveText('')
    await expect(sendButton(page)).toHaveAttribute('aria-disabled', 'true')
})

test('Next chat runs through to the end and Start over restarts', async ({
    page,
}) => {
    await page.goto('/practice/Quillon?p=xe')
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
        chat(page).getByRole('heading', { name: 'Lunch crew' }),
    ).toBeVisible()
    await expect(sendButton(page)).toBeFocused()
})

test('the keyboard alone can play a scene', async ({ page }) => {
    await page.goto('/practice/Quillon?p=xe')
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
    await page.goto('/practice/Quillon?p=xe')
    await expect(sendButton(page)).toHaveAttribute('aria-disabled', 'false')
    for (let i = 0; i < 5; i++) await sendButton(page).click({ force: true })
    const mine = chat(page).locator('.thread .me')
    await expect(mine).toHaveCount(1)
    const texts = await chat(page).locator('.thread .text').allTextContents()
    expect(new Set(texts).size).toBe(texts.length)
})

test('/profile/testcard renders the chat about Sam with xe', async ({
    page,
}) => {
    await page.goto('/profile/testcard')
    await expect(
        chat(page).getByText('Is Sam still coming Saturday?'),
    ).toBeVisible()
    await expect(
        chat(page).getByText('Yes! Xe said xe is free after 1'),
    ).toBeVisible()
})

test('a name-only link chats with the name', async ({ page }) => {
    await page.goto('/practice/Tara?p=null')
    await expect(
        chat(page).getByText('Is Tara still coming Saturday?'),
    ).toBeVisible()
    await expect(
        chat(page).getByText('Yes! Tara said Tara is free after 1'),
    ).toBeVisible()
})

const LONG = 'Wolfeschlegelsteinhausenbergerdorff'

for (const path of [
    `/practice/${LONG}?p=xe`,
    `/practice/${LONG}`,
    `/practice/${LONG}?p=ask-me`,
]) {
    test(`a long name never scrolls ${path} sideways at 360px`, async ({
        page,
    }) => {
        await page.setViewportSize({ width: 360, height: 740 })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        if (path.endsWith('?p=xe')) await sendButton(page).click()
        const width = await page.evaluate(
            () => document.documentElement.scrollWidth,
        )
        expect(width).toBeLessThanOrEqual(360)
    })
}

test('the thread can take keyboard focus to scroll', async ({ page }) => {
    await page.goto('/practice/Quillon?p=xe')
    const thread = chat(page).getByRole('log', { name: 'Messages' })
    await thread.focus()
    await expect(thread).toBeFocused()
})

test('the forms box lists the five forms with IPA', async ({ page }) => {
    await page.goto('/practice/Quillon?p=xe')
    const box = page.locator('details.forms')
    await expect(box.locator('summary')).toHaveText('Quillon: xe/xem')
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

test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('friends type before each bubble', async ({ page }) => {
        await page.goto('/practice/Quillon?p=xe')
        await expect(chat(page).locator('.typing')).toBeVisible()
        await expect(chat(page).locator('.thread .them')).toHaveCount(0)
        await expect(chat(page).locator('.thread .them').first()).toBeVisible()
        await expect(sendButton(page)).toHaveClass(/pulse/, { timeout: 15_000 })
    })
})
