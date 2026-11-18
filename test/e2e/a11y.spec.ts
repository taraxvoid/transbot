import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { mockPronounsPage } from './mock-pronouns-page'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function expectNoViolations(page: Page): Promise<void> {
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    expect(results.violations).toEqual([])
}

test.beforeEach(async ({ page }) => {
    await mockPronounsPage(page)
})

test('/ has no axe violations when filled in', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Sam')
    await page.getByRole('checkbox', { name: 'xe/xem' }).check()
    await page.getByRole('checkbox', { name: 'they/them' }).check()
    await page.getByLabel('Custom pronouns').fill('ne/nem')
    await expectNoViolations(page)
})

test('/ has no axe violations with errors shown', async ({ page }) => {
    await page.goto('/')
    await page
        .getByRole('form', { name: 'Choose Your Name / Pronouns' })
        .getByRole('button', { name: 'Submit' })
        .click()
    await page
        .getByRole('form', { name: 'Or use your pronouns.page profile' })
        .getByRole('button', { name: 'Submit' })
        .click()
    await expect(page.getByText('Enter your name.')).toBeVisible()
    await expectNoViolations(page)
})

test('/practice has no axe violations with the link-ready box', async ({
    page,
}) => {
    await page.addInitScript(() => {
        sessionStorage.setItem('transbot:just-made', '/practice/Sam?p=xe')
    })
    await page.goto('/practice/Sam?p=xe')
    await expect(
        page.getByRole('heading', { name: 'Your link is ready' }),
    ).toBeVisible()
    await expectNoViolations(page)
})

test('/practice has no axe violations mid-chat', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/practice/Quillon?p=xe')
    const send = page
        .getByRole('region', { name: 'Group chat' })
        .getByRole('button', { name: 'Send' })
    await expect(send).toHaveAttribute('aria-disabled', 'false')
    await send.click()
    await expect(page.getByText('Delivered')).toBeVisible()
    await page.locator('details.forms summary').click()
    await expectNoViolations(page)
})

test('/practice/<name> ask page has no axe violations', async ({ page }) => {
    await page.goto('/practice/Quillon')
    await page.getByRole('checkbox', { name: 'xe/xem' }).check()
    await expectNoViolations(page)
})

test('/practice with no name has no axe violations', async ({ page }) => {
    await page.goto('/practice')
    await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible()
    await expectNoViolations(page)
})

for (const path of [
    '/profile/testcard',
    '/profile/askfirst',
    '/profile/mehonly',
    '/profile/nobody',
]) {
    test(`${path} has no axe violations`, async ({ page }) => {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expectNoViolations(page)
    })
}
