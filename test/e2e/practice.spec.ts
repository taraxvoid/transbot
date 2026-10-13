import { expect, test } from '@playwright/test'
import { mockPronounsPage } from './mock-pronouns-page'

test.beforeEach(async ({ page }) => {
    await mockPronounsPage(page)
})

test('the sandwich line accepts the modeled set', async ({ page }) => {
    await page.goto('/practice#n=Quillon&p=xe')
    await expect(
        page.getByRole('heading', { name: 'Practice with Quillon' }),
    ).toBeVisible()
    const drills = page.getByRole('region', { name: 'Fill in the blanks' })
    await drills.getByLabel('Blank 1 of 3').fill('xe')
    await drills.getByLabel('Blank 2 of 3').fill('xyr')
    await drills.getByLabel('Blank 3 of 3').fill('xem')
    await drills.getByRole('button', { name: 'Check' }).click()
    await expect(drills.locator('.feedback .correct')).toHaveCount(3)
    await drills.getByRole('button', { name: 'Next' }).click()
    await expect(drills.getByText('The sandwich is')).toBeVisible()
    await expect(drills.getByLabel('Blank 1 of 1')).toBeFocused()
})

test('a miss shows the right form and its pronunciation', async ({ page }) => {
    await page.goto('/practice#n=Quillon&p=xe')
    const drills = page.getByRole('region', { name: 'Fill in the blanks' })
    await drills.getByLabel('Blank 1 of 3').fill('he')
    await drills.getByRole('button', { name: 'Check' }).click()
    await expect(drills.getByText("It's Xe /zi/ here.")).toBeVisible()
})

test('a secondary set counts as correct', async ({ page }) => {
    await page.goto('/practice#n=Quillon&p=xe%26she')
    const drills = page.getByRole('region', { name: 'Fill in the blanks' })
    await drills.getByLabel('Blank 2 of 3').fill('her')
    await drills.getByRole('button', { name: 'Check' }).click()
    await expect(
        drills.getByText('That works too. Most often: xyr /ziɹ/'),
    ).toBeVisible()
})

test('null drills the name', async ({ page }) => {
    await page.goto('/practice#n=Quillon&p=null')
    const drills = page.getByRole('region', { name: 'Fill in the blanks' })
    await drills.getByLabel('Blank 1 of 3').fill('Quillon')
    await drills.getByLabel('Blank 2 of 3').fill("Quillon's")
    await drills.getByLabel('Blank 3 of 3').fill('Quillon')
    await drills.getByRole('button', { name: 'Check' }).click()
    await expect(drills.locator('.feedback .correct')).toHaveCount(3)
})

test('a card with no known sets offers no free typing', async ({ page }) => {
    await page.goto('/practice#n=Sam&p=notaset')
    await expect(
        page.getByRole('region', { name: 'Say it your way' }),
    ).toHaveCount(0)
})

test('free typing flags pronouns outside the link', async ({ page }) => {
    await page.goto('/practice#n=Quillon&p=xe')
    const free = page.getByRole('region', { name: 'Say it your way' })
    await free
        .getByLabel('Tell me what Quillon did this weekend.')
        .fill('Quillon said he went hiking')
    await free.getByRole('button', { name: 'Check' }).click()
    await expect(free.getByText('"he": Quillon uses xe/xem,')).toBeVisible()
    await expect(free.locator('em')).toHaveText('xe')
})

test('the name never leaves the browser', async ({ page }) => {
    const urls: string[] = []
    page.on('request', (request) => urls.push(request.url()))
    await page.goto('/practice#n=Quillon&p=xe')
    await expect(
        page.getByRole('heading', { name: 'Practice with Quillon' }),
    ).toBeVisible()
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(url).not.toContain('Quillon')
})

test('a link without a fragment explains what to do', async ({ page }) => {
    await page.goto('/practice')
    await expect(
        page.getByText('This link is missing a name and pronouns.'),
    ).toBeVisible()
    await expect(
        page.getByRole('link', { name: 'Make a practice link' }),
    ).toHaveAttribute('href', '/')
})

test('an unknown set gets a gentle message', async ({ page }) => {
    await page.goto('/practice#n=Quillon&p=notaset')
    await expect(
        page.getByText("pronouns.page doesn't know those pronouns."),
    ).toBeVisible()
    await expect(
        page.getByRole('region', { name: 'Fill in the blanks' }),
    ).toHaveCount(0)
})

test('an unreachable pronouns.page gets a retry message', async ({ page }) => {
    await page.route('https://en.pronouns.page/api/**', (route) =>
        route.fulfill({ status: 503, body: 'down' }),
    )
    await page.goto('/practice#n=Quillon&p=xe')
    await expect(page.getByText("Couldn't reach pronouns.page.")).toBeVisible()
})
