import { expect, test } from '@playwright/test'

test('/@testcard teaches the card without private entries', async ({
    page,
}) => {
    const response = await page.goto('/@testcard')
    expect(response?.status()).toBe(200)
    await expect(
        page.getByRole('heading', { name: 'Practice with Sam' }),
    ).toBeVisible()
    await expect(page.getByText('You can also ask Sam')).toBeVisible()
    const html = await page.content()
    for (const hidden of [
        'Oldname',
        'Hiddenname',
        'Samwise',
        'Sprocket',
        'lock-alt',
        'secret circle',
        'private bio',
        'aerself',
        'voidself',
    ]) {
        expect(html).not.toContain(hidden)
    }
})

test('/@testcard drills the first yes set', async ({ page }) => {
    await page.goto('/@testcard')
    const drills = page.getByRole('region', { name: 'Fill in the blanks' })
    await drills.getByLabel('Blank 1 of 3').fill('xe')
    await drills.getByLabel('Blank 2 of 3').fill('her')
    await drills.getByLabel('Blank 3 of 3').fill('them')
    await drills.getByRole('button', { name: 'Check' }).click()
    await expect(drills.locator('.feedback .correct')).toHaveCount(3)
})

test('/api/card returns the filtered identity', async ({ request }) => {
    const response = await request.get('/api/card/testcard')
    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toBe('no-store')
    const body = await response.json()
    expect(body.identity.names.preferred).toBe('Sam')
    expect(JSON.stringify(body)).not.toContain('Hiddenname')
})

test('/api/card is a 404 for a missing card', async ({ request }) => {
    const response = await request.get('/api/card/nobody')
    expect(response.status()).toBe(404)
    expect(await response.json()).toEqual({ error: 'not-found' })
})

test('/@nobody explains that the card is missing', async ({ page }) => {
    const response = await page.goto('/@nobody')
    expect(response?.status()).toBe(404)
    await expect(
        page.getByRole('heading', { name: 'Card not found' }),
    ).toBeVisible()
    await expect(
        page.getByText("Cards show up once they're saved on pronouns.page."),
    ).toBeVisible()
})

test('/@askfirst shows only the ask note', async ({ page }) => {
    await page.goto('/@askfirst')
    await expect(
        page.getByText('Please ask Kit which pronouns to use.'),
    ).toBeVisible()
    await expect(
        page.getByRole('region', { name: 'Fill in the blanks' }),
    ).toHaveCount(0)
    await expect(
        page.getByRole('region', { name: 'Say it your way' }),
    ).toHaveCount(0)
})

test('/@mehonly says there is nothing to practice', async ({ page }) => {
    await page.goto('/@mehonly')
    await expect(
        page.getByText("there's nothing to practice yet"),
    ).toBeVisible()
})

test('a card name with HTML renders as text', async ({ page }) => {
    let dialog = false
    page.on('dialog', async (d) => {
        dialog = true
        await d.dismiss()
    })
    await page.goto('/@htmlname')
    await expect(
        page.getByRole('heading', { name: /<\/script><img/ }),
    ).toBeVisible()
    expect(await page.locator('main img').count()).toBe(0)
    expect(dialog).toBe(false)
})

test('/tara points at /@taravie', async ({ request }) => {
    const response = await request.get('/tara', { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/@taravie')
})
