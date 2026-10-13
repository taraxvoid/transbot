/// <reference types="bun" />
// Playwright's web server: a pronouns.page stand-in served from
// test/fixtures, plus `astro preview` with the Worker pointed at it.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fixtureResponse } from '../test/fixtures/resolve'

const portIndex = process.argv.indexOf('--port')
const port = portIndex === -1 ? '4344' : process.argv[portIndex + 1]

// 127.0.0.1, not localhost: workerd may resolve localhost to ::1.
const api = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: (request) => fixtureResponse(new URL(request.url).pathname),
})

// The adapter writes the real Worker config into the build output and leaves
// a redirect here; .dev.vars must sit next to the real config.
const redirect = JSON.parse(
    readFileSync('.wrangler/deploy/config.json', 'utf8'),
) as { configPath: string }
const generated = resolve('.wrangler/deploy', redirect.configPath)
writeFileSync(
    resolve(dirname(generated), '.dev.vars'),
    `PRONOUNS_API_BASE=http://127.0.0.1:${api.port}/v3\n`,
)

const preview = Bun.spawn(['bun', 'run', 'preview', '--port', port], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: 'false' },
})

function stop(): void {
    preview.kill()
    api.stop(true)
    process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

await preview.exited
api.stop(true)
