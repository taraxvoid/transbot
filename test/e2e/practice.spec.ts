import { expect, test } from '@playwright/test'
import { mockPronounsPage } from './mock-pronouns-page'

test.beforeEach(async ({ page }) => {
    await mockPronounsPage(page)
})

test('the name never goes to pronouns.page', async ({ page }) => {
    const urls: string[] = []
    page.on('request', (request) => {
        if (request.url().includes('pronouns.page')) urls.push(request.url())
    })
    await page.goto('/practice/Quillon?p=xe')
    await expect(
        page.getByRole('heading', { name: 'Practice with Quillon' }),
    ).toBeVisible()
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(url).not.toContain('Quillon')
})

test('/practice with no name explains what to do', async ({ page }) => {
    await page.goto('/practice')
    await expect(page.getByText('This link is missing a name.')).toBeVisible()
    await expect(
        page.getByRole('link', { name: 'Make a practice link' }),
    ).toHaveAttribute('href', '/')
})

test('an old fragment link gets the same message', async ({ page }) => {
    await page.goto('/practice#n=Quillon&p=xe')
    await expect(page.getByText('This link is missing a name.')).toBeVisible()
    await expect(
        page.getByRole('heading', { name: 'Practice with Quillon' }),
    ).toHaveCount(0)
})

test('an unknown set gets a gentle message', async ({ page }) => {
    await page.goto('/practice/Quillon?p=notaset')
    await expect(
        page.getByText(
            "pronouns.page doesn't have these pronouns yet, so there's nothing to practice here.",
        ),
    ).toBeVisible()
    await expect(
        page.getByRole('heading', { name: 'Practice with Quillon' }),
    ).toBeVisible()
    await expect(page.getByRole('region', { name: 'Group chat' })).toHaveCount(
        0,
    )
})

test('ask-me first shows only the note', async ({ page }) => {
    await page.goto('/practice/Quillon?p=ask-me+xe')
    await expect(
        page.getByText('Please ask Quillon which pronouns to use.'),
    ).toBeVisible()
    await expect(page.getByRole('region', { name: 'Group chat' })).toHaveCount(
        0,
    )
    await expect(page.locator('details.forms')).toHaveCount(0)
})

test('an unreachable pronouns.page gets a retry message', async ({ page }) => {
    await page.route('https://en.pronouns.page/api/**', (route) =>
        route.fulfill({ status: 503, body: 'down' }),
    )
    await page.goto('/practice/Quillon?p=xe')
    await expect(page.getByText("Couldn't reach pronouns.page.")).toBeVisible()
})

test('a name in the path starts practice with p from the query', async ({
    page,
}) => {
    await page.goto('/practice/Sam%20Lee?p=xe')
    await expect(
        page.getByRole('heading', { name: 'Practice with Sam Lee' }),
    ).toBeVisible()
})

test('a name in the path without p asks for pronouns', async ({ page }) => {
    await page.goto('/practice/Quillon')
    const picker = page.getByRole('group', {
        name: 'Which pronouns does Quillon use?',
    })
    await picker.getByRole('checkbox', { name: 'xe/xem' }).check()
    await page.getByRole('button', { name: 'Start practicing' }).click()
    await expect(page).toHaveURL(/\/practice\/Quillon\?p=xe$/)
    await expect(
        page.getByRole('heading', { name: 'Practice with Quillon' }),
    ).toBeVisible()
})

test('the ask form turns shorthand into a short link', async ({ page }) => {
    await page.goto('/practice/Quillon')
    await page.getByLabel('Other pronouns').fill('xe/she')
    await page.getByRole('button', { name: 'Start practicing' }).click()
    await expect(page).toHaveURL(/\/practice\/Quillon\?p=xe\+she$/)
    await expect(
        page.getByRole('heading', { name: 'Practice with Quillon' }),
    ).toBeVisible()
})

test('a link with repeated p params still works', async ({ page }) => {
    await page.goto('/practice/Sam?p=xe&p=she')
    await expect(
        page.getByRole('heading', { name: 'Practice with Sam' }),
    ).toBeVisible()
})

test('an unrelated fragment still asks for pronouns', async ({ page }) => {
    await page.goto('/practice/Quillon#practice')
    await page.getByRole('checkbox', { name: 'xe/xem' }).check()
    await page.getByRole('button', { name: 'Start practicing' }).click()
    await expect(page).toHaveURL(/\/practice\/Quillon\?p=xe#practice$/)
    await expect(
        page.getByRole('heading', { name: 'Practice with Quillon' }),
    ).toBeVisible()
})

test('the ask picker keeps pick order', async ({ page }) => {
    await page.goto('/practice/Quillon')
    await page.getByRole('checkbox', { name: 'she/her' }).check()
    await page.getByRole('checkbox', { name: 'they/them' }).check()
    await page.getByRole('button', { name: 'Start practicing' }).click()
    await expect(page).toHaveURL(/\/practice\/Quillon\?p=she\+they$/)
})

test('the ask picker says what to do when nothing is picked', async ({
    page,
}) => {
    await page.goto('/practice/Quillon')
    await page.getByRole('button', { name: 'Start practicing' }).click()
    await expect(page.getByRole('alert')).toHaveText(
        'Pick at least one, or type them under Other pronouns.',
    )
    await expect(page).toHaveURL(/\/practice\/Quillon$/)
})
