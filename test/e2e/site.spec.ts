import { expect, test } from '@playwright/test'

test('/ loads and credits pronouns.page under the OQL', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const footer = page.getByRole('contentinfo')
    await expect(
        footer.getByRole('link', { name: 'pronouns.page', exact: true }),
    ).toHaveAttribute('href', 'https://en.pronouns.page')
    await expect(
        footer.getByRole('link', { name: /Opinionated Queer License/ }),
    ).toHaveAttribute('href', 'https://en.pronouns.page/license')
})

test('unknown paths get the 404 page', async ({ page }) => {
    const response = await page.goto('/no-such-page')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Page not found',
    )
})

test('/ describes the group chat, not sentences', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/a short pretend group chat/)).toBeVisible()
    await expect(
        page.getByText(/fill-in-the-blank|practice sentences/),
    ).toHaveCount(0)
})
