import cloudflare from '@astrojs/cloudflare'
import { defineConfig } from 'astro/config'

export default defineConfig({
    site: 'https://transbot.net',
    // Prerender everything; /@username, /tara and /api/card opt out with
    // `export const prerender = false`.
    output: 'static',
    devToolbar: { enabled: false },
    adapter: cloudflare({ imageService: 'passthrough' }),
    vite: {
        optimizeDeps: {
            // Missing from the adapter's prebundle list; discovering them late
            // triggers a mid-startup re-optimize that crashes the dev runner.
            include: ['astro/app/manifest', 'astro/logger/json'],
        },
    },
})
