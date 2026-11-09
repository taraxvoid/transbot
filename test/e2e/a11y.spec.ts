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

test('/ has no axe violations with a link shown', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Your name', { exact: true }).fill('Sam')
    await page.getByRole('checkbox', { name: 'xe/xem' }).check()
    await page.getByRole('checkbox', { name: 'they/them' }).check()
    await page.getByLabel('Other pronouns').fill('ne/nem')
    await expectNoViolations(page)
})

test('/practice has no axe violations, with feedback shown', async ({
    page,
}) => {
    await page.goto('/practice/Quillon?p=xe')
    const drills = page.getByRole('region', { name: 'Fill in the blanks' })
    await drills.getByLabel('Blank 1 of 3').fill('he')
    await drills.getByRole('button', { name: 'Check' }).click()
    await expect(drills.locator('.feedback li')).toHaveCount(3)
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
