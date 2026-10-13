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

// With no server routes yet, the adapter builds an assets-only Worker that
// returns an empty 404, so only the status is checked here. Task 8 adds the
// heading assertion once the Worker serves the prerendered 404 page.
test('unknown paths get a 404', async ({ page }) => {
    const response = await page.goto('/no-such-page')
    expect(response?.status()).toBe(404)
})
