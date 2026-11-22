import { expect, test } from '@playwright/test'

test('/profile/testcard teaches the card without private entries', async ({
    page,
}) => {
    const response = await page.goto('/profile/testcard')
    expect(response?.status()).toBe(200)
    await expect(
        page.getByRole('heading', { name: /^Sam uses / }),
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

test('/profile/testcard renders the chat', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // The card has a secondary set; a high roll keeps the chat on xe/xem.
    await page.addInitScript(() => {
        Math.random = () => 0.99
    })
    await page.goto('/profile/testcard')
    const chat = page.getByRole('region', { name: 'Group chat' })
    await expect(chat).toBeVisible()
    await expect(
        chat.getByText('I accidentally ate xyr sandwich the other day'),
    ).toBeVisible()
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

test('/profile/nobody explains that the card is missing', async ({ page }) => {
    const response = await page.goto('/profile/nobody')
    expect(response?.status()).toBe(404)
    await expect(
        page.getByRole('heading', { name: 'Card not found' }),
    ).toBeVisible()
    await expect(
        page.getByText("Cards show up once they're saved on pronouns.page."),
    ).toBeVisible()
})

test('/profile/askfirst shows only the ask note', async ({ page }) => {
    await page.goto('/profile/askfirst')
    await expect(
        page.getByText('Please ask Kit which pronouns to use.'),
    ).toBeVisible()
    await expect(page.getByRole('region', { name: 'Group chat' })).toHaveCount(
        0,
    )
})

test('/profile/mehonly says there is nothing to practice', async ({ page }) => {
    await page.goto('/profile/mehonly')
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
    await page.goto('/profile/htmlname')
    await expect(
        page.getByRole('heading', { level: 1, name: /<\/script><img/ }),
    ).toBeVisible()
    expect(await page.locator('main img').count()).toBe(0)
    expect(dialog).toBe(false)
})

test('/tara points at /profile/taravie', async ({ request }) => {
    const response = await request.get('/tara', { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/profile/taravie')
})

test('/profile/testcard links to the pronouns.page profile', async ({
    page,
}) => {
    await page.goto('/profile/testcard')
    const link = page.locator('#pronouns-page-profile-link')
    await expect(link).toHaveAttribute(
        'href',
        'https://en.pronouns.page/@testcard',
    )
    await expect(link).toHaveAttribute('target', '_blank')
})

test('/@testcard redirects to /profile/testcard', async ({ request }) => {
    const response = await request.get('/@testcard', { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/profile/testcard')
})

test('/@Sam?p=she is still only the pronouns.page passthrough', async ({
    request,
}) => {
    const response = await request.get('/@Sam?p=she', { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/profile/Sam')
})

test('/asher redirects to the landing page with the name filled in', async ({
    request,
}) => {
    const response = await request.get('/asher', { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/?name=asher')
})

test('/%C3%81sher keeps the name encoded', async ({ request }) => {
    const response = await request.get('/%C3%81sher', { maxRedirects: 0 })
    expect(response.headers().location).toBe('/?name=%C3%81sher')
})

test('alias lookup is case-insensitive and file-like paths 404', async ({
    request,
}) => {
    const hit = await request.get('/TARA', { maxRedirects: 0 })
    expect(hit.status()).toBe(302)
    expect(hit.headers().location).toBe('/profile/taravie')
    const miss = await request.get('/apple-touch-icon.png')
    expect(miss.status()).toBe(404)
    expect(await miss.text()).toContain('Page not found')
})

test('/profile asks for a username, then opens the card', async ({ page }) => {
    await page.goto('/profile')
    await page.getByLabel('pronouns.page username').fill('@testcard')
    await page.getByRole('button', { name: 'Start practicing' }).click()
    await expect(page).toHaveURL(/\/profile\/testcard$/)
})

test('/profile rejects a malformed username', async ({ page }) => {
    await page.goto('/profile?username=two%20words')
    await expect(page.getByRole('alert')).toContainText(
        "doesn't look like a pronouns.page username",
    )
})
