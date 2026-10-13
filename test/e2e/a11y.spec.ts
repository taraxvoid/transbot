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

test('/ has no axe violations with every panel open', async ({ page }) => {
    await page.goto('/')
    await page
        .getByRole('button', { name: 'I have a pronouns.page card' })
        .click()
    await page.getByRole('button', { name: "I don't have one yet" }).click()
    await page.getByLabel('Name', { exact: true }).fill('Sam')
    await page.getByLabel('Pronouns', { exact: true }).fill('xe')
    await expectNoViolations(page)
})

test('/practice has no axe violations, with feedback shown', async ({
    page,
}) => {
    await page.goto('/practice#n=Quillon&p=xe')
    const drills = page.getByRole('region', { name: 'Fill in the blanks' })
    await drills.getByLabel('Blank 1 of 3').fill('he')
    await drills.getByRole('button', { name: 'Check' }).click()
    await expect(drills.locator('.feedback li')).toHaveCount(3)
    await expectNoViolations(page)
})

test('/practice without a fragment has no axe violations', async ({ page }) => {
    await page.goto('/practice')
    await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible()
    await expectNoViolations(page)
})

for (const path of ['/@testcard', '/@askfirst', '/@mehonly', '/@nobody']) {
    test(`${path} has no axe violations`, async ({ page }) => {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expectNoViolations(page)
    })
}
