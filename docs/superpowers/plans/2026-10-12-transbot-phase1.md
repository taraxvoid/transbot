# transbot Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship transbot.net phase 1: scripted name and pronoun drills from a fragment link or a pronouns.page card, with a deterministic checker, the card-sharing flow on the landing page, and CI/deploy on Cloudflare Workers.

**Architecture:** A framework-free core in `src/lib/pronouns/` (client, identity, drills, checker, loader) is shared by the browser (`/practice`, fragment links, pronouns.page fetched directly) and the Worker (`/@username`, `/api/card/<username>`, profile fetched server-side, filtered, cached for an hour with the Cache API). Astro prerenders every page except the server routes. The UI is plain TypeScript that builds DOM with `textContent` only.

**Tech Stack:** bun, Astro 7 + `@astrojs/cloudflare` 14, Cloudflare Workers (Cache API), Biome 2, Vitest, Playwright + `@axe-core/playwright`, `@taraxvoid/voidflow` 0.13.0 (site-ci, resolve-env, cloudflare-deploy, Playwright preview config).

**Spec:** `docs/superpowers/specs/2026-10-12-transbot-design.md`

**Where to work:** a fresh worktree branched from `worktree-design-spec` (so the spec and this plan come along), or from `main` once the spec PR merges. The repo is currently empty apart from `docs/`.

## Global Constraints

- Package manager and scripts: `bun` only (`bun add`, `bun run`, `bunx`). No npm/yarn/pnpm.
- Code style: Biome, 4-space indent, single quotes, no semicolons, trailing commas, line width 80 (synthomaha's `biome.json`). Run `bun run format` before every commit.
- pronouns.page base URL: `https://en.pronouns.page/api/public/v3`. Profiles are read from `en` only.
- Opinion mapping: `yes` is taught and modeled (first `yes` set is the model); `meh` is accepted, never taught; `close`, `jokingly` and every custom opinion (anything that is not `yes`/`meh`/`no`) are dropped before data reaches the browser and are never displayed, taught or graded; `no` names are flagged, and feedback never repeats the avoided value.
- Special values: `null` means "use the name"; `:void` is void/void/void's/void's/voidself; `ask-me` as the first `yes` entry replaces the drills with a note, anywhere else it adds the note next to the drills.
- Never infer pronouns from a name. UI copy about the person never falls back to a pronoun (no "they"/"them" stand-ins): use the name, or "this person", or "the card".
- Never suggest names or pronouns, never ask about gender identity. Pronoun input is free text; common sets are only shortcuts.
- Fragment links (`/practice#n=..&p=..`) keep the name in the browser. Nothing in phase 1 sends the name to transbot's server.
- No analytics, no logging of what anyone types. Workers observability is off.
- Card cache: about an hour (`3600` seconds). Never cache "not found" or upstream errors.
- Every page credits pronouns.page under the Opinionated Queer License v1.4.
- Names and card values are user-controlled: build DOM with `textContent`/`append(string)`, never `innerHTML`. Inline JSON goes through `jsonForScript`.
- Never commit a real pronouns.page profile as a fixture. Real profiles can hold private custom-opinion entries. Profile fixtures are synthetic.
- CI never calls the live pronouns.page API. Pronoun-set fixtures are downloaded once by hand (`bun run fixtures:refresh`) and committed.
- UI copy style: no em dashes or unicode arrows.

## Review Focus

1. **Hand-typed fragment with a raw `&`** (`#n=Sam&p=xe&she`): a person types the shorthand straight from pronouns.page. Expect it to mean `xe&she`, not `xe`. Test in Task 4 (`entriesFromFragment`).
2. **Names or values containing HTML or `</script>`**: a card name like `</script><img src=x onerror=alert(1)>` must show as text and must not break out of the inline JSON. Tests in Task 6 (`jsonForScript`) and Task 8 (e2e on a fixture card with such a name).
3. **Out-of-order card lookups while typing**: a slow response for an earlier username must not replace the result for what is in the field now. Test in Task 9 (e2e with a delayed mock).
4. **Upstream failure for one pronoun set** (timeout or 5xx while fetching a set on a card): expect an error state that is not cached, never a card that silently lost its pronouns for an hour. Test in Task 6 (`getCard`).
5. **Unresolvable pronoun values** (`any`, typos, anything pronouns.page 404s): skipped without crashing. The first resolvable `yes` set becomes the model, and `/practice` says pronouns.page doesn't know the set. Tests in Task 4 (`buildIdentity`) and Task 7 (e2e).

---

## File Structure

```
package.json, bunfig.toml, mise.toml, lefthook.yml, biome.json, tsconfig.json
astro.config.ts, wrangler.jsonc, vitest.config.ts, playwright.config.ts, .gitignore
.github/workflows/ci.yml                 CI (voidflow site-ci) + deploy to Workers
README.md
scripts/refresh-fixtures.ts               downloads pronoun-set fixtures (manual, live API)
scripts/e2e-preview.ts                    fixture API + astro preview for Playwright
src/styles/global.css
src/layouts/Layout.astro                  header, footer with OQL credit
src/pages/index.astro                     landing: explainer, card check, setup flow, link builder
src/pages/practice.astro                  static; drills from the URL fragment
src/pages/@[username].astro               server; drills from a pronouns.page card
src/pages/tara.astro                      server; 302 to /@taravie
src/pages/api/card/[username].ts          server; filtered identity JSON
src/pages/404.astro
src/lib/pronouns/types.ts                 shared types and FORM_KEYS
src/lib/pronouns/client.ts                typed pronouns.page calls
src/lib/pronouns/drills.ts                templates, sandwich lines, shuffle
src/lib/pronouns/identity.ts              opinion mapping, special values, Identity, summary
src/lib/pronouns/check.ts                 deterministic checker (blanks, free text)
src/lib/pronouns/load.ts                  entries to Identity (fetches sets + xe examples)
src/lib/links.ts                          practice/card links, username normalizing
src/lib/setup-flag.ts                     localStorage "clicked setup" flag
src/lib/server/card.ts                    getCard with Cache API
src/lib/server/embed.ts                   jsonForScript
src/lib/server/runtime.ts                 Worker env/cache wiring (not unit-tested)
src/scripts/dom.ts                        el() helper
src/scripts/practice-ui.ts                mountPractice()
src/scripts/practice-page.ts              /practice bootstrap
src/scripts/landing.ts                    landing page behavior
test/fixtures/resolve.ts                  fixture lookup shared by Vitest, Bun and Playwright
test/fixtures/fixture-fetch.ts            fake fetch for Vitest
test/fixtures/api/pronouns/*.json         downloaded pronoun sets
test/fixtures/api/profiles/*.json         synthetic profiles
test/pronouns/*.test.ts, test/lib/*.test.ts, test/server/*.test.ts
test/e2e/*.spec.ts, test/e2e/mock-pronouns-page.ts
```

---

### Task 1: Project scaffold, CI and deploy

**Files:**
- Create: `package.json`, `bunfig.toml`, `mise.toml`, `lefthook.yml`, `biome.json`, `tsconfig.json`, `astro.config.ts`, `wrangler.jsonc`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.github/workflows/ci.yml`
- Create: `src/styles/global.css`, `src/layouts/Layout.astro`, `src/pages/index.astro` (placeholder), `src/pages/404.astro`
- Test: `test/e2e/site.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Layout.astro` with props `{ title: string; description?: string; noindex?: boolean }`. Scripts `lint`, `check`, `build`, `preview`, `test:unit`, `test:e2e:full`, `test:e2e:a11y`. Wrangler var `PRONOUNS_API_BASE`. Playwright projects `mobile-chrome`, `desktop-chrome`, `a11y`.

- [ ] **Step 1: Write `package.json`**

```json
{
    "name": "transbot",
    "type": "module",
    "version": "0.1.0",
    "private": true,
    "description": "Practice someone's name and pronouns",
    "scripts": {
        "types": "wrangler types",
        "predev": "bun run types",
        "dev": "astro dev",
        "build": "astro build",
        "preview": "astro preview",
        "check": "wrangler types && astro check",
        "lint": "biome check .",
        "format": "biome check --write .",
        "test": "bun run build && npm-run-all -l -p check test:unit -s test:e2e:full",
        "test:push": "bun run lint && bun run test",
        "test:unit": "vitest run",
        "test:e2e:full": "playwright test --project=mobile-chrome --project=desktop-chrome",
        "test:e2e:all": "bun run test:e2e:full",
        "test:e2e:a11y": "playwright test --project=a11y",
        "fixtures:refresh": "bun scripts/refresh-fixtures.ts",
        "check:licenses": "check-licenses",
        "audit": "bun audit --audit-level high --production",
        "prepare": "lefthook install || echo 'lefthook not installed (run mise install); git hooks skipped'"
    },
    "engines": {
        "bun": ">=1.4.0"
    }
}
```

- [ ] **Step 2: Write `bunfig.toml`, `mise.toml`, `lefthook.yml`**

`bunfig.toml`:

```toml
[install]
minimumReleaseAge = 259200 # 3 days

# Packages that bypass the gate
minimumReleaseAgeExcludes = ["@taraxvoid/voidflow", "@types/bun", "bun-types", "typescript", "astro", "@astrojs/cloudflare", "@astrojs/check", "@playwright/test", "playwright", "playwright-core"]
```

`mise.toml`:

```toml
[tools]
bun = "latest"
node = "24.21.0"
lefthook = "2.1.16"
```

`lefthook.yml`:

```yaml
# Shared hooks live in voidflow (pre-commit, commit-msg hint, pre-push).
# Pin to a release tag; Renovate bumps it. A site's lefthook.yml can add
# commands but not override these; differences go through package.json scripts.
remotes:
  - git_url: https://github.com/taraxvoid/voidflow
    ref: v0.13.0
    configs:
      - lefthook/site.yml
```

- [ ] **Step 3: Install dependencies**

```bash
bun add astro@7.3.5 @astrojs/cloudflare@14.3.3
bun add -d @astrojs/check@^0.9.10 @axe-core/playwright@^4.13.0 @biomejs/biome@2.5.14 @playwright/test@^1.64.0 @taraxvoid/voidflow@0.13.0 @types/bun@^1.4.2 license-checker@^25.0.1 npm-run-all2@^9.0.3 typescript@^5.9.3 vitest@^5.0.3 wrangler@^4.147.0
bunx playwright install chromium
```

Expected: `bun.lock` created, no errors.

- [ ] **Step 4: Write tool configs**

`biome.json`:

```json
{
    "$schema": "https://biomejs.dev/schemas/2.5.14/schema.json",
    "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
    "files": { "ignoreUnknown": false },
    "formatter": {
        "enabled": true,
        "indentStyle": "space",
        "indentWidth": 4,
        "lineEnding": "lf",
        "lineWidth": 80,
        "includes": [
            "**",
            "!**/bun.lock",
            "!test/fixtures/api/pronouns/**",
            "!worker-configuration.d.ts"
        ]
    },
    "linter": {
        "enabled": true,
        "rules": { "preset": "recommended" },
        "includes": ["**", "!.astro/**", "!worker-configuration.d.ts"]
    },
    "overrides": [
        {
            "includes": ["**/*.astro"],
            "linter": {
                "rules": {
                    "correctness": {
                        "noUnusedImports": "off",
                        "noUnusedVariables": "off"
                    }
                }
            }
        }
    ],
    "javascript": {
        "formatter": {
            "quoteStyle": "single",
            "semicolons": "asNeeded",
            "trailingCommas": "all",
            "arrowParentheses": "always"
        }
    },
    "assist": {
        "enabled": true,
        "actions": { "source": { "organizeImports": "on" } }
    }
}
```

`tsconfig.json`:

```json
{
    "extends": "astro/tsconfigs/strict",
    "include": [
        ".astro/types.d.ts",
        "worker-configuration.d.ts",
        "src/**/*",
        "test/**/*",
        "scripts/**/*"
    ],
    "exclude": ["dist"]
}
```

`astro.config.ts`:

```ts
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
```

`wrangler.jsonc`:

```jsonc
{
    "$schema": "./node_modules/wrangler/config-schema.json",
    "name": "transbot",
    "compatibility_date": "2026-09-01",
    "assets": {
        "directory": "./dist",
        "binding": "ASSETS"
    },
    "vars": {
        // e2e overrides this with a local fixture server (scripts/e2e-preview.ts)
        "PRONOUNS_API_BASE": "https://en.pronouns.page/api/public/v3"
    },
    // Off on purpose: nothing about practice sessions is logged (see spec, Privacy).
    "observability": {
        "enabled": false
    },
    "routes": [
        {
            "pattern": "transbot.net",
            "custom_domain": true
        }
    ]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        passWithNoTests: true,
        exclude: [
            '**/node_modules/**',
            '**/.git/**',
            '**/.claude/**',
            '**/test/e2e/**',
        ],
    },
})
```

`playwright.config.ts`:

```ts
import { devices } from '@playwright/test'
import { definePreviewConfig } from '@taraxvoid/voidflow/playwright'

export default definePreviewConfig({
    ciPort: 4344,
    timeout: 60_000,
    projects: [
        {
            name: 'mobile-chrome',
            use: devices['Pixel 7'],
            testIgnore: /a11y\.spec\.ts/,
        },
        {
            name: 'desktop-chrome',
            use: devices['Desktop Chrome'],
            testIgnore: /a11y\.spec\.ts/,
        },
        {
            name: 'a11y',
            use: devices['Pixel 7'],
            testMatch: /a11y\.spec\.ts/,
        },
    ],
})
```

`.gitignore`:

```
node_modules/
dist/
.astro/
.wrangler/
.dev.vars*
worker-configuration.d.ts
test-results/
playwright-report/
.unlighthouse/
```

- [ ] **Step 5: Write the CI workflow** (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write

jobs:
  validate:
    uses: taraxvoid/voidflow/.github/workflows/site-ci.yml@2702230a04e50c6592bbc816042371f695e2db93 # v0.13.0
    with:
      single-environment: true
      e2e-extra-paths: '["wrangler.jsonc", "scripts/e2e-preview.ts", "test/fixtures/**"]'

  resolve-env:
    uses: taraxvoid/voidflow/.github/workflows/resolve-env.yml@2702230a04e50c6592bbc816042371f695e2db93 # v0.13.0
    with:
      single-environment: true

  deploy:
    name: Deploy [${{ needs.resolve-env.outputs.env }}]
    needs: [validate, resolve-env]
    if: github.event_name == 'push'
    environment: ${{ needs.resolve-env.outputs.env }}
    runs-on: ubuntu-latest
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build
        run: bun run build

      - name: Deploy
        uses: taraxvoid/voidflow/actions/cloudflare-deploy@2702230a04e50c6592bbc816042371f695e2db93 # v0.13.0
        with:
          env: ${{ needs.resolve-env.outputs.env }}
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
```

Note for Tara (not the implementer): the deploy needs `CLOUDFLARE_API_TOKEN` (secret) and `CLOUDFLARE_ACCOUNT_ID` (variable) on the GitHub `prod` environment, and the `transbot.net` zone in that Cloudflare account. The implementer does not create these.

- [ ] **Step 6: Write the failing smoke test** (`test/e2e/site.spec.ts`)

```ts
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
```

- [ ] **Step 7: Run it to see it fail**

Run: `bun run build`
Expected: FAIL, Astro reports no pages (or the build succeeds with no `index.html` and the e2e test fails on the missing heading).

- [ ] **Step 8: Write the layout, styles and pages**

`src/styles/global.css`:

```css
:root {
    color-scheme: light dark;
    --bg: #fbfaf7;
    --fg: #1d1b26;
    --muted: #57536a;
    --accent: #6b3fa0;
    --ok: #1f6b45;
    --soft: #8a4b00;
    --border: #d9d4e4;
    --field: #ffffff;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg: #16141d;
        --fg: #eeeaf6;
        --muted: #b3adc6;
        --accent: #c9a7f2;
        --ok: #7fd6a6;
        --soft: #f0b36a;
        --border: #3a3550;
        --field: #201d2b;
    }
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
}

.site-header,
main,
.site-footer {
    max-width: 40rem;
    margin: 0 auto;
    padding: 1rem;
}

.brand {
    font-weight: 700;
    color: var(--fg);
    text-decoration: none;
}

a {
    color: var(--accent);
}

.site-footer {
    color: var(--muted);
    font-size: 0.875rem;
    border-top: 1px solid var(--border);
}

label {
    display: block;
    font-weight: 600;
    margin-top: 1rem;
}

input,
textarea {
    font: inherit;
    color: var(--fg);
    background: var(--field);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    padding: 0.5rem;
}

textarea {
    width: 100%;
}

button {
    font: inherit;
    cursor: pointer;
    min-height: 44px;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--bg);
}

button.secondary {
    background: transparent;
    color: var(--accent);
}

:is(a, button, input, textarea):focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
}

.choices,
.drill-actions,
.link-out {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
}

.link-out a {
    word-break: break-all;
}

.drill-sentence {
    font-size: 1.25rem;
    line-height: 2.2;
}

.drill-sentence input {
    width: 7.5em;
    padding: 0.25rem 0.5rem;
}

.feedback .correct {
    color: var(--ok);
}

.feedback .try {
    color: var(--soft);
}

.hint {
    color: var(--muted);
    font-size: 0.875rem;
}
```

`src/layouts/Layout.astro`:

```astro
---
import '../styles/global.css'

type Props = { title: string; description?: string; noindex?: boolean }
const {
    title,
    description = "Practice someone's name and pronouns before you talk.",
    noindex = false,
} = Astro.props
---

<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="referrer" content="no-referrer" />
        {noindex && <meta name="robots" content="noindex" />}
    </head>
    <body>
        <header class="site-header">
            <a href="/" class="brand">transbot</a>
        </header>
        <main id="main">
            <slot />
        </main>
        <footer class="site-footer">
            <p>
                Pronoun data comes from
                <a href="https://en.pronouns.page">pronouns.page</a>, used
                under the
                <a href="https://en.pronouns.page/license"
                    >Opinionated Queer License v1.4</a
                >. transbot is not affiliated with pronouns.page.
            </p>
        </footer>
    </body>
</html>
```

`src/pages/index.astro` (placeholder, replaced in Task 9):

```astro
---
import Layout from '../layouts/Layout.astro'
---

<Layout title="transbot">
    <h1>Practice someone's name and pronouns</h1>
    <p>
        Someone shared this site so you can get comfortable with their name
        and pronouns. You fill in short sentences, and transbot shows the
        right form each time. Nobody keeps score.
    </p>
</Layout>
```

`src/pages/404.astro`:

```astro
---
import Layout from '../layouts/Layout.astro'
---

<Layout title="Page not found | transbot" noindex>
    <h1>Page not found</h1>
    <p><a href="/">Back to transbot</a></p>
</Layout>
```

- [ ] **Step 9: Run every check**

Run: `bun run format && bun run lint && bun run check && bun run test:unit && bun run build && bun run test:e2e:full`
Expected: all pass; Playwright reports 4 passed (2 tests x 2 projects).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "build: scaffold Astro on Cloudflare Workers with voidflow CI"
```

---

### Task 2: Types, pronouns.page client and fixtures

**Files:**
- Create: `src/lib/pronouns/types.ts`, `src/lib/pronouns/client.ts`
- Create: `test/fixtures/resolve.ts`, `test/fixtures/fixture-fetch.ts`, `scripts/refresh-fixtures.ts`
- Create: `test/fixtures/api/pronouns/*.json` (downloaded), `test/fixtures/api/profiles/{testcard,mehonly,askfirst,nullfirst,htmlname}.json` (hand-written)
- Test: `test/pronouns/client.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `types.ts`: `FORM_KEYS`, `FormKey`, `Forms`, `Pronunciations`, `Entry`, `Entries`, `PronounSet`, `Identity` (exact definitions below).
  - `client.ts`: `DEFAULT_API_BASE`, `RawPronoun`, `RawEntry`, `RawLocaleProfile`, `RawProfile`, `Fetched<T>`, `ClientOptions = { base?: string; fetch?: typeof fetch }`, `pronounPath(value): string`, `getPronouns(value, opts?): Promise<Fetched<RawPronoun>>`, `getProfile(username, opts?): Promise<Fetched<RawProfile>>`.
  - `test/fixtures/resolve.ts`: `fixtureName(value): string`, `fixtureResponse(pathname): Response`, `loadPronounFixture(value): RawPronoun`.
  - `test/fixtures/fixture-fetch.ts`: `fixtureFetch(log?: string[]): typeof fetch`, `TEST_BASE = 'https://api.test/v3'`.

- [ ] **Step 1: Write the types** (`src/lib/pronouns/types.ts`)

```ts
export const FORM_KEYS = [
    'pronoun_subject',
    'pronoun_object',
    'possessive_determiner',
    'possessive_pronoun',
    'reflexive',
] as const

export type FormKey = (typeof FORM_KEYS)[number]
export type Forms = Record<FormKey, string>
export type Pronunciations = Partial<Record<FormKey, string>>

/** A name or pronoun value after private and ignored opinions are dropped. */
export type Entry = { value: string; opinion: 'yes' | 'meh' | 'no' }
export type Entries = { names: Entry[]; pronouns: Entry[] }

export type PronounSet = {
    /** 'name' means "use the name instead of pronouns" (null, :Name). */
    kind: 'pronouns' | 'name'
    /** "xe/xem", "void/void's", or the name for kind 'name'. */
    label: string
    forms: Forms
    pronunciations: Pronunciations
    opinion: 'yes' | 'meh'
}

/** Everything the browser gets about a person. Already filtered. */
export type Identity = {
    names: { preferred: string | null; accepted: string[]; avoid: string[] }
    /** yes sets in card order, then meh sets in card order. */
    sets: PronounSet[]
    /** 'only': ask-me is the first yes entry, no drills. 'note': elsewhere. */
    askMe: 'only' | 'note' | null
    /** Example sentences with {form_key} placeholders, for the modeled set. */
    templates: string[]
}
```

- [ ] **Step 2: Write the fixture resolver** (`test/fixtures/resolve.ts`)

```ts
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RawPronoun } from '../../src/lib/pronouns/client'

const API_DIR = fileURLToPath(new URL('./api/', import.meta.url))

/** `ae/aer/...` can't be a file name, so slashes become `__`. */
export function fixtureName(value: string): string {
    return `${value.replaceAll('/', '__')}.json`
}

function decode(segment: string): string {
    try {
        return decodeURIComponent(segment)
    } catch {
        return segment
    }
}

function notFound(pathname: string): Response {
    return Response.json(
        { error: true, statusCode: 404, statusMessage: 'Not found', url: pathname },
        { status: 404 },
    )
}

/** Answers a pronouns.page API path from test/fixtures/api. */
export function fixtureResponse(pathname: string): Response {
    const pronoun = pathname.match(/\/pronouns\/(.+)$/)
    const profile = pathname.match(/\/profile\/get\/([^/]+)$/)
    let file: string | null = null
    if (pronoun) {
        file = join(API_DIR, 'pronouns', fixtureName(decode(pronoun[1])))
    } else if (profile) {
        file = join(
            API_DIR,
            'profiles',
            fixtureName(decode(profile[1]).toLowerCase()),
        )
    }
    if (!file || !existsSync(file)) return notFound(pathname)
    return new Response(readFileSync(file), {
        headers: { 'content-type': 'application/json' },
    })
}

export function loadPronounFixture(value: string): RawPronoun {
    const file = join(API_DIR, 'pronouns', fixtureName(value))
    return JSON.parse(readFileSync(file, 'utf8')) as RawPronoun
}
```

`test/fixtures/fixture-fetch.ts`:

```ts
import { fixtureResponse } from './resolve'

export const TEST_BASE = 'https://api.test/v3'

/** A fetch that answers from fixtures and records decoded request paths. */
export function fixtureFetch(log: string[] = []): typeof fetch {
    return (async (input: RequestInfo | URL) => {
        const href =
            typeof input === 'string'
                ? input
                : input instanceof URL
                  ? input.href
                  : input.url
        const url = new URL(href)
        log.push(decodeURIComponent(url.pathname))
        return fixtureResponse(url.pathname)
    }) as typeof fetch
}
```

- [ ] **Step 3: Write the refresh script and download the pronoun fixtures**

`scripts/refresh-fixtures.ts`:

```ts
/// <reference types="bun" />
// Re-downloads the pronoun sets the tests use from the live pronouns.page API.
// Run by hand (`bun run fixtures:refresh`); CI never calls the live API.
// Profiles in test/fixtures/api/profiles are hand-written and synthetic. Never
// copy a real profile there: real profiles can hold private custom-opinion
// entries.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_API_BASE, pronounPath } from '../src/lib/pronouns/client'
import { fixtureName } from '../test/fixtures/resolve'

const VALUES = ['xe', 'she', 'they', 'xe&she', 'ae/aer/aer/aers/aerself']
const dir = join(import.meta.dir, '../test/fixtures/api/pronouns')

mkdirSync(dir, { recursive: true })
for (const value of VALUES) {
    const res = await fetch(`${DEFAULT_API_BASE}/pronouns/${pronounPath(value)}`)
    if (!res.ok) throw new Error(`${value}: HTTP ${res.status}`)
    const body = JSON.stringify(await res.json(), null, 4)
    writeFileSync(join(dir, fixtureName(value)), `${body}\n`)
    console.log(`saved ${value}`)
}
```

This script imports `pronounPath` from `client.ts`, which Step 7 writes. Write the file now; run it between Step 7 and Step 8 (the client tests need the downloaded fixtures):

Run: `bun run fixtures:refresh && ls test/fixtures/api/pronouns`
Expected: five files: `xe.json`, `she.json`, `they.json`, `xe&she.json`, `ae__aer__aer__aers__aerself.json`. Spot check: `jq -c .morphemes 'test/fixtures/api/pronouns/xe&she.json'` prints `{"pronoun_subject":"xe&she","pronoun_object":"xem&her","possessive_determiner":"xyr&her","possessive_pronoun":"xyrs&hers","reflexive":"xemself&herself"}`.

- [ ] **Step 4: Write the synthetic profile fixtures**

These mirror the live API shape (`profiles` is an array of locale profiles; custom opinions appear as their icon name, such as `lock-alt`, on each entry).

`test/fixtures/api/profiles/testcard.json`:

```json
{
    "id": "01TESTCARD",
    "username": "testcard",
    "avatar": null,
    "profiles": [
        {
            "id": "01TESTCARDEN",
            "locale": "en",
            "description": "private bio text that must never be forwarded",
            "opinions": [
                {
                    "icon": "fa-light:lock-alt",
                    "description": "secret circle",
                    "colour": "purple",
                    "style": "spoiler",
                    "sentiment": 1
                }
            ],
            "names": [
                { "value": "Sam", "opinion": "yes", "pronunciation": null, "voice": null },
                { "value": "Sammy", "opinion": "meh", "pronunciation": null, "voice": null },
                { "value": "Samwise", "opinion": "close", "pronunciation": null, "voice": null },
                { "value": "Sprocket", "opinion": "jokingly", "pronunciation": null, "voice": null },
                { "value": "Hiddenname", "opinion": "lock-alt", "pronunciation": null, "voice": null },
                { "value": "Oldname", "opinion": "no", "pronunciation": null, "voice": null }
            ],
            "pronouns": [
                { "value": "xe&she", "opinion": "yes" },
                { "value": "they", "opinion": "meh" },
                { "value": "null", "opinion": "meh" },
                { "value": "he", "opinion": "close" },
                { "value": "ae/aer/aer/aers/aerself", "opinion": "lock-alt" },
                { "value": ":void", "opinion": "jokingly" },
                { "value": "ask-me", "opinion": "meh" }
            ]
        }
    ]
}
```

`test/fixtures/api/profiles/mehonly.json`:

```json
{
    "username": "mehonly",
    "profiles": [
        {
            "locale": "en",
            "opinions": [],
            "names": [{ "value": "Robin", "opinion": "meh" }],
            "pronouns": [{ "value": "they", "opinion": "meh" }]
        }
    ]
}
```

`test/fixtures/api/profiles/askfirst.json`:

```json
{
    "username": "askfirst",
    "profiles": [
        {
            "locale": "en",
            "opinions": [],
            "names": [{ "value": "Kit", "opinion": "yes" }],
            "pronouns": [
                { "value": "ask-me", "opinion": "yes" },
                { "value": "xe", "opinion": "yes" }
            ]
        }
    ]
}
```

`test/fixtures/api/profiles/nullfirst.json`:

```json
{
    "username": "nullfirst",
    "profiles": [
        {
            "locale": "en",
            "opinions": [],
            "names": [{ "value": "Jo", "opinion": "yes" }],
            "pronouns": [
                { "value": "null", "opinion": "yes" },
                { "value": "she", "opinion": "meh" }
            ]
        }
    ]
}
```

`test/fixtures/api/profiles/htmlname.json` (Review Focus 2):

```json
{
    "username": "htmlname",
    "profiles": [
        {
            "locale": "en",
            "opinions": [],
            "names": [
                { "value": "</script><img src=x onerror=alert(1)>", "opinion": "yes" }
            ],
            "pronouns": [{ "value": "xe", "opinion": "yes" }]
        }
    ]
}
```

- [ ] **Step 5: Write the failing client tests** (`test/pronouns/client.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import {
    getProfile,
    getPronouns,
    pronounPath,
} from '../../src/lib/pronouns/client'
import { TEST_BASE, fixtureFetch } from '../fixtures/fixture-fetch'

describe('pronounPath', () => {
    it('keeps the separators pronouns.page uses', () => {
        expect(pronounPath('xe&she')).toBe('xe&she')
        expect(pronounPath('ae/aer/aer/aers/aerself')).toBe(
            'ae/aer/aer/aers/aerself',
        )
        expect(pronounPath(':void')).toBe(':void')
    })

    it('encodes everything else', () => {
        expect(pronounPath('a b?')).toBe('a%20b%3F')
    })
})

describe('getPronouns', () => {
    it('returns a compound set as one response', async () => {
        const result = await getPronouns('xe&she', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
        })
        expect(result.ok && result.data.morphemes.pronoun_subject).toBe(
            'xe&she',
        )
    })

    it('requests written-out sets with their slashes', async () => {
        const log: string[] = []
        const result = await getPronouns('ae/aer/aer/aers/aerself', {
            base: TEST_BASE,
            fetch: fixtureFetch(log),
        })
        expect(result.ok).toBe(true)
        expect(log).toEqual(['/v3/pronouns/ae/aer/aer/aers/aerself'])
    })

    it('maps 404 to not-found', async () => {
        const result = await getPronouns('notaset', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
        })
        expect(result).toEqual({ ok: false, reason: 'not-found' })
    })

    it('maps 5xx and network failures to error', async () => {
        const failing = (async () =>
            new Response('oops', { status: 503 })) as typeof fetch
        const throwing = (async () => {
            throw new TypeError('network down')
        }) as typeof fetch
        expect(await getPronouns('xe', { fetch: failing })).toEqual({
            ok: false,
            reason: 'error',
        })
        expect(await getPronouns('xe', { fetch: throwing })).toEqual({
            ok: false,
            reason: 'error',
        })
    })
})

describe('getProfile', () => {
    it('returns a profile', async () => {
        const result = await getProfile('testcard', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
        })
        expect(result.ok && result.data.username).toBe('testcard')
    })

    it('maps a missing user to not-found', async () => {
        const result = await getProfile('nobody', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
        })
        expect(result).toEqual({ ok: false, reason: 'not-found' })
    })

    it('treats a 200 without profiles as not-found', async () => {
        const empty = (async () => Response.json({})) as typeof fetch
        expect(await getProfile('x', { fetch: empty })).toEqual({
            ok: false,
            reason: 'not-found',
        })
    })
})
```

- [ ] **Step 6: Run them to see them fail**

Run: `bunx vitest run test/pronouns/client.test.ts`
Expected: FAIL, cannot resolve `../../src/lib/pronouns/client`.

- [ ] **Step 7: Write the client** (`src/lib/pronouns/client.ts`)

```ts
import type { FormKey, Pronunciations } from './types'

export const DEFAULT_API_BASE = 'https://en.pronouns.page/api/public/v3'
const TIMEOUT_MS = 5000

export type RawPronoun = {
    canonicalName: string
    name: string
    nullPronoun: boolean
    plural: boolean[]
    /** Compound sets join forms with `&`: "xe&she". */
    morphemes: Record<FormKey, string>
    /** IPA; for compound sets usually only the first set has any. */
    pronunciations: Pronunciations
    /** Filled in with the first set's forms. */
    examples: string[]
}

export type RawEntry = { value: string; opinion: string }

export type RawLocaleProfile = {
    locale: string
    names?: RawEntry[]
    pronouns?: RawEntry[]
}

export type RawProfile = {
    username: string
    profiles:
        | RawLocaleProfile[]
        | Record<string, Omit<RawLocaleProfile, 'locale'>>
}

export type Fetched<T> =
    | { ok: true; data: T }
    | { ok: false; reason: 'not-found' | 'error' }

export type ClientOptions = { base?: string; fetch?: typeof fetch }

/** Encodes a pronoun value but keeps the `/`, `&` and `:` it uses. */
export function pronounPath(value: string): string {
    return value
        .split('/')
        .map((part) =>
            encodeURIComponent(part)
                .replaceAll('%26', '&')
                .replaceAll('%3A', ':'),
        )
        .join('/')
}

async function getJson<T>(
    path: string,
    opts: ClientOptions,
): Promise<Fetched<T>> {
    const base = opts.base ?? DEFAULT_API_BASE
    // Called as a plain function: `opts.fetch(...)` would bind `this` to opts,
    // which browsers reject with "Illegal invocation".
    const fetchFn = opts.fetch ?? fetch
    try {
        const res = await fetchFn(`${base}${path}`, {
            headers: { accept: 'application/json' },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (res.status === 404) return { ok: false, reason: 'not-found' }
        if (!res.ok) return { ok: false, reason: 'error' }
        return { ok: true, data: (await res.json()) as T }
    } catch {
        return { ok: false, reason: 'error' }
    }
}

export async function getPronouns(
    value: string,
    opts: ClientOptions = {},
): Promise<Fetched<RawPronoun>> {
    const result = await getJson<RawPronoun>(
        `/pronouns/${pronounPath(value)}`,
        opts,
    )
    if (result.ok && !result.data?.morphemes) {
        return { ok: false, reason: 'not-found' }
    }
    return result
}

export async function getProfile(
    username: string,
    opts: ClientOptions = {},
): Promise<Fetched<RawProfile>> {
    const result = await getJson<RawProfile>(
        `/profile/get/${encodeURIComponent(username)}`,
        opts,
    )
    if (
        result.ok &&
        (typeof result.data?.profiles !== 'object' ||
            result.data.profiles === null)
    ) {
        return { ok: false, reason: 'not-found' }
    }
    return result
}
```

- [ ] **Step 8: Run the tests to see them pass**

Run: `bunx vitest run test/pronouns/client.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 9: Commit**

```bash
bun run format && bun run lint
git add -A
git commit -m "feat: typed pronouns.page client with fixtures"
```

---

### Task 3: Drill templates

**Files:**
- Create: `src/lib/pronouns/drills.ts`
- Test: `test/pronouns/drills.test.ts`

**Interfaces:**
- Consumes: `FORM_KEYS`, `FormKey`, `Forms` from `types.ts`; `loadPronounFixture` in tests.
- Produces: `XE_FORMS: Forms`, `Blank = { key: FormKey; capitalize: boolean }`, `Drill = { parts: Array<string | Blank> }`, `SANDWICH_TEMPLATES: readonly string[]`, `capitalize(text): string`, `templatize(examples, forms, xeExamples): string[]`, `parseTemplate(template): Drill`, `shuffle<T>(items, rng): T[]`, `drillsFor(templates, rng): Drill[]`.

Why templatize this way: the API returns example sentences already filled in with the first set's forms, and some forms collide (`her` is both object and possessive). The `xe` forms are all distinct and the API returns the same example list in the same order for every set, so aligning a set's sentence word by word with the `xe` sentence tells us each blank's role. Sentences that don't align are skipped.

- [ ] **Step 1: Write the failing tests** (`test/pronouns/drills.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import {
    type Blank,
    SANDWICH_TEMPLATES,
    XE_FORMS,
    drillsFor,
    parseTemplate,
    shuffle,
    templatize,
} from '../../src/lib/pronouns/drills'
import type { Forms } from '../../src/lib/pronouns/types'
import { loadPronounFixture } from '../fixtures/resolve'

const xe = loadPronounFixture('xe')
const she = loadPronounFixture('she')
const they = loadPronounFixture('they')

function seeded(seed: number): () => number {
    let s = seed
    return () => {
        s = (s * 16807) % 2147483647
        return s / 2147483647
    }
}

describe('parseTemplate', () => {
    it('splits the sandwich line into text and three blanks', () => {
        expect(parseTemplate(SANDWICH_TEMPLATES[0]).parts).toEqual([
            { key: 'pronoun_subject', capitalize: true },
            ' bought a sandwich, I ate ',
            { key: 'possessive_determiner', capitalize: false },
            ' sandwich, I bought ',
            { key: 'pronoun_object', capitalize: false },
            ' a new sandwich.',
        ])
    })

    it('capitalizes a blank that starts a later sentence', () => {
        const blank = parseTemplate('Hi. {pronoun_subject} left.')
            .parts[1] as Blank
        expect(blank.capitalize).toBe(true)
    })

    it('leaves unknown placeholders as text', () => {
        expect(parseTemplate('a {nope} b').parts).toEqual(['a {nope} b'])
    })
})

describe('templatize', () => {
    it('turns xe examples into templates', () => {
        const templates = templatize(xe.examples, XE_FORMS, xe.examples)
        expect(templates).toContain('I think {pronoun_subject} is very nice.')
        expect(templates).toContain(
            '{pronoun_subject} told me that the house is {possessive_pronoun}.',
        )
    })

    it('tells object her from possessive her by aligning with xe', () => {
        const forms = she.morphemes as Forms
        const templates = templatize(she.examples, forms, xe.examples)
        expect(templates).toContain('I met {pronoun_object} recently.')
        expect(templates).toContain('Is this {possessive_determiner} dog?')
    })

    it('keeps plural verb agreement from the set itself', () => {
        const forms = they.morphemes as Forms
        const templates = templatize(they.examples, forms, xe.examples)
        expect(templates).toContain('{pronoun_subject} are really beautiful.')
        expect(templates).toContain(
            '{pronoun_subject} said {pronoun_subject} would rather do it {reflexive}.',
        )
    })

    it('skips sentences that do not line up', () => {
        expect(
            templatize(
                ['I think xe is nice'],
                XE_FORMS,
                ['I think xe is very nice.'],
            ),
        ).toEqual([])
    })
})

describe('drillsFor', () => {
    it('starts with the sandwich lines, then every example', () => {
        const drills = drillsFor(['A {pronoun_subject}.', 'B {reflexive}.'], seeded(1))
        expect(drills).toHaveLength(5)
        expect(drills.slice(0, 3)).toEqual(SANDWICH_TEMPLATES.map(parseTemplate))
    })

    it('shuffles deterministically for a seeded rng', () => {
        const items = [1, 2, 3, 4, 5, 6]
        expect(shuffle(items, seeded(7))).toEqual(shuffle(items, seeded(7)))
        expect([...shuffle(items, seeded(7))].sort()).toEqual(items)
        expect(items).toEqual([1, 2, 3, 4, 5, 6])
    })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `bunx vitest run test/pronouns/drills.test.ts`
Expected: FAIL, cannot resolve `../../src/lib/pronouns/drills`.

- [ ] **Step 3: Write `src/lib/pronouns/drills.ts`**

```ts
import { FORM_KEYS, type FormKey, type Forms } from './types'

export const XE_FORMS: Forms = {
    pronoun_subject: 'xe',
    pronoun_object: 'xem',
    possessive_determiner: 'xyr',
    possessive_pronoun: 'xyrs',
    reflexive: 'xemself',
}

export type Blank = { key: FormKey; capitalize: boolean }
export type Drill = { parts: Array<string | Blank> }

/** Past tense on purpose, so verbs agree with singular and plural sets. */
export const SANDWICH_TEMPLATES: readonly string[] = [
    '{pronoun_subject} bought a sandwich, I ate {possessive_determiner} sandwich, I bought {pronoun_object} a new sandwich.',
    'The sandwich is {possessive_pronoun}.',
    '{pronoun_subject} made it {reflexive}.',
]

const XE_ROLES = new Map<string, FormKey>(
    FORM_KEYS.map((key) => [XE_FORMS[key], key]),
)
const PLACEHOLDER = /\{(\w+)\}/g
const SENTENCE_START = /(^|[.!?]\s+)$/

export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Splits "xyrs." into ["", "xyrs", "."]. Inner apostrophes stay in the word. */
function splitToken(token: string): [string, string, string] {
    const match = token.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u)
    return match ? [match[1], match[2], match[3]] : ['', token, '']
}

/**
 * Turns filled-in example sentences into templates such as
 * "I met {pronoun_object} recently." Each sentence is aligned word by word
 * with the same sentence for xe, whose forms are all distinct, to learn which
 * form each word is.
 */
export function templatize(
    examples: string[],
    forms: Forms,
    xeExamples: string[],
): string[] {
    const templates: string[] = []
    examples.forEach((sentence, i) => {
        const xe = xeExamples[i]
        if (!xe) return
        const tokens = sentence.split(' ')
        const xeTokens = xe.split(' ')
        if (tokens.length !== xeTokens.length) return
        let aligned = true
        let blanks = 0
        const out = tokens.map((token, j) => {
            const role = XE_ROLES.get(splitToken(xeTokens[j])[1].toLowerCase())
            if (!role) return token
            const [lead, word, trail] = splitToken(token)
            if (word.toLowerCase() !== forms[role].toLowerCase()) {
                aligned = false
                return token
            }
            blanks++
            return `${lead}{${role}}${trail}`
        })
        if (aligned && blanks > 0) templates.push(out.join(' '))
    })
    return templates
}

export function parseTemplate(template: string): Drill {
    const parts: Drill['parts'] = []
    let last = 0
    for (const match of template.matchAll(PLACEHOLDER)) {
        const key = match[1] as FormKey
        if (!FORM_KEYS.includes(key)) continue
        const start = match.index ?? 0
        if (start > last) parts.push(template.slice(last, start))
        parts.push({
            key,
            capitalize: SENTENCE_START.test(template.slice(0, start)),
        })
        last = start + match[0].length
    }
    if (last < template.length) parts.push(template.slice(last))
    return { parts }
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
}

/** The sandwich lines first, then the examples in random order. */
export function drillsFor(templates: string[], rng: () => number): Drill[] {
    return [...SANDWICH_TEMPLATES, ...shuffle(templates, rng)].map(
        parseTemplate,
    )
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `bunx vitest run test/pronouns/drills.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
bun run format && bun run lint
git add -A
git commit -m "feat: drill templates aligned against xe examples"
```

---

### Task 4: Identity (opinion mapping, private filtering, special values)

**Files:**
- Create: `src/lib/pronouns/identity.ts`
- Test: `test/pronouns/identity.test.ts`

**Interfaces:**
- Consumes: `RawEntry`, `RawPronoun`, `RawProfile`, `RawLocaleProfile` from `client.ts`; `XE_FORMS`, `templatize` from `drills.ts`; types.
- Produces:
  - `VOID_FORMS: Forms`
  - `normalizePronounValue(value): string`
  - `entriesFromProfile(profile: RawProfile): Entries | null` (null when there is no `en` profile)
  - `entriesFromFragment(hash: string): Entries | null` (null when there is neither name nor pronouns)
  - `pronounValuesToFetch(entries): string[]`
  - `buildIdentity(entries, fetched: Record<string, RawPronoun | null>, xeExamples: string[]): Identity`
  - `modeledSet(identity): PronounSet | null`
  - `setLabel(set): string`
  - `Summary = { teach: string[]; accept: string[]; askMe: Identity['askMe']; nothingToTeach: boolean }`, `summarize(identity): Summary`

- [ ] **Step 1: Write the failing tests** (`test/pronouns/identity.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import type { RawProfile, RawPronoun } from '../../src/lib/pronouns/client'
import {
    VOID_FORMS,
    buildIdentity,
    entriesFromFragment,
    entriesFromProfile,
    modeledSet,
    normalizePronounValue,
    pronounValuesToFetch,
    summarize,
} from '../../src/lib/pronouns/identity'
import type { Entries } from '../../src/lib/pronouns/types'
import { fixtureResponse, loadPronounFixture } from '../fixtures/resolve'

const xe = loadPronounFixture('xe')
const fetched: Record<string, RawPronoun | null> = {
    xe,
    she: loadPronounFixture('she'),
    they: loadPronounFixture('they'),
    'xe&she': loadPronounFixture('xe&she'),
    any: null,
}

async function profile(username: string): Promise<RawProfile> {
    return (await fixtureResponse(`/profile/get/${username}`).json()) as RawProfile
}

async function identityFor(username: string) {
    const entries = entriesFromProfile(await profile(username))
    if (!entries) throw new Error('no en profile')
    return buildIdentity(entries, fetched, xe.examples)
}

describe('entriesFromProfile', () => {
    it('keeps yes, meh and no, and drops close, jokingly and custom', async () => {
        const entries = entriesFromProfile(await profile('testcard'))
        expect(entries?.names).toEqual([
            { value: 'Sam', opinion: 'yes' },
            { value: 'Sammy', opinion: 'meh' },
            { value: 'Oldname', opinion: 'no' },
        ])
        expect(entries?.pronouns.map((p) => p.value)).toEqual([
            'xe&she',
            'they',
            'null',
            'ask-me',
        ])
    })

    it('accepts profiles keyed by locale', () => {
        const entries = entriesFromProfile({
            username: 'x',
            profiles: {
                en: { names: [{ value: 'Ari', opinion: 'yes' }], pronouns: [] },
            },
        })
        expect(entries?.names).toEqual([{ value: 'Ari', opinion: 'yes' }])
    })

    it('returns null without an en profile', () => {
        expect(
            entriesFromProfile({ username: 'x', profiles: [{ locale: 'de' }] }),
        ).toBeNull()
    })
})

describe('entriesFromFragment', () => {
    it('reads an encoded compound set', () => {
        expect(entriesFromFragment('#n=Sam&p=xe%26she')).toEqual({
            names: [{ value: 'Sam', opinion: 'yes' }],
            pronouns: [{ value: 'xe&she', opinion: 'yes' }],
        })
    })

    it('repairs a hand-typed & inside p', () => {
        expect(entriesFromFragment('#n=Sam&p=xe&she')?.pronouns).toEqual([
            { value: 'xe&she', opinion: 'yes' },
        ])
    })

    it('decodes + as a space in names', () => {
        expect(entriesFromFragment('#n=Sam+Lee&p=they')?.names[0].value).toBe(
            'Sam Lee',
        )
    })

    it('allows a name without pronouns and pronouns without a name', () => {
        expect(entriesFromFragment('#n=Sam')?.pronouns).toEqual([])
        expect(entriesFromFragment('#p=xe')?.names).toEqual([])
    })

    it('returns null for an empty fragment', () => {
        expect(entriesFromFragment('')).toBeNull()
        expect(entriesFromFragment('#')).toBeNull()
    })
})

describe('normalizePronounValue', () => {
    it('strips pronouns.page URLs and leading slashes', () => {
        expect(normalizePronounValue('/they')).toBe('they')
        expect(normalizePronounValue('https://en.pronouns.page/xe')).toBe('xe')
    })
})

describe('pronounValuesToFetch', () => {
    it('skips special values and dropped entries', async () => {
        const entries = entriesFromProfile(await profile('testcard')) as Entries
        expect(pronounValuesToFetch(entries)).toEqual(['xe&she', 'they'])
    })
})

describe('buildIdentity', () => {
    it('splits compound sets and orders yes before meh', async () => {
        const identity = await identityFor('testcard')
        expect(identity.sets.map((s) => [s.label, s.opinion])).toEqual([
            ['xe/xem', 'yes'],
            ['she/her', 'yes'],
            ['they/them', 'meh'],
            ['Sam', 'meh'],
        ])
        expect(identity.names).toEqual({
            preferred: 'Sam',
            accepted: ['Sam', 'Sammy'],
            avoid: ['Oldname'],
        })
        expect(identity.askMe).toBe('note')
        expect(modeledSet(identity)?.label).toBe('xe/xem')
        expect(modeledSet(identity)?.pronunciations.pronoun_object).toBe('zɛm')
    })

    it('never carries private, close or jokingly entries', async () => {
        const json = JSON.stringify(await identityFor('testcard'))
        for (const hidden of [
            'Hiddenname',
            'Samwise',
            'Sprocket',
            'lock-alt',
            'secret circle',
            'private bio',
            'aerself',
            'voidself',
            '"he"',
        ]) {
            expect(json).not.toContain(hidden)
        }
    })

    it('models null as the name in every slot', async () => {
        const identity = await identityFor('nullfirst')
        expect(modeledSet(identity)?.forms).toEqual({
            pronoun_subject: 'Jo',
            pronoun_object: 'Jo',
            possessive_determiner: "Jo's",
            possessive_pronoun: "Jo's",
            reflexive: 'Joself',
        })
        expect(identity.templates).toContain(
            'I think {pronoun_subject} is very nice.',
        )
    })

    it('drops null when there is no yes name to use', () => {
        const identity = buildIdentity(
            { names: [], pronouns: [{ value: 'null', opinion: 'yes' }] },
            fetched,
            xe.examples,
        )
        expect(identity.sets).toEqual([])
    })

    it('resolves :void and :Name locally', () => {
        const identity = buildIdentity(
            {
                names: [],
                pronouns: [
                    { value: ':void', opinion: 'yes' },
                    { value: ':Kai', opinion: 'meh' },
                ],
            },
            fetched,
            xe.examples,
        )
        expect(identity.sets[0].forms).toEqual(VOID_FORMS)
        expect(identity.sets[0].label).toBe("void/void's")
        expect(identity.sets[1]).toMatchObject({ kind: 'name', label: 'Kai' })
    })

    it('replaces drills when ask-me is the first yes entry', async () => {
        const identity = await identityFor('askfirst')
        expect(identity.askMe).toBe('only')
        expect(modeledSet(identity)).toBeNull()
        expect(identity.templates).toEqual([])
    })

    it('skips unresolvable sets and models the next yes set', () => {
        const identity = buildIdentity(
            {
                names: [{ value: 'Ari', opinion: 'yes' }],
                pronouns: [
                    { value: 'any', opinion: 'yes' },
                    { value: 'they', opinion: 'yes' },
                ],
            },
            fetched,
            xe.examples,
        )
        expect(modeledSet(identity)?.label).toBe('they/them')
        expect(identity.templates).toContain(
            '{pronoun_subject} are really beautiful.',
        )
    })

    it('keeps a name off the avoid list if it is also accepted', () => {
        const identity = buildIdentity(
            {
                names: [
                    { value: 'Ari', opinion: 'yes' },
                    { value: 'ari', opinion: 'no' },
                ],
                pronouns: [],
            },
            fetched,
            xe.examples,
        )
        expect(identity.names.avoid).toEqual([])
    })

    it('never infers pronouns from a name alone', () => {
        const entries = entriesFromFragment('#n=Sam') as Entries
        const identity = buildIdentity(entries, fetched, xe.examples)
        expect(identity.sets).toEqual([])
        expect(modeledSet(identity)).toBeNull()
    })
})

describe('summarize', () => {
    it('lists what is taught and what is accepted', async () => {
        expect(summarize(await identityFor('testcard'))).toEqual({
            teach: ['Sam', 'xe/xem', 'she/her'],
            accept: ['Sammy', 'they/them', 'Sam instead of pronouns'],
            askMe: 'note',
            nothingToTeach: false,
        })
    })

    it('flags a card with nothing marked yes', async () => {
        expect(summarize(await identityFor('mehonly')).nothingToTeach).toBe(
            true,
        )
    })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `bunx vitest run test/pronouns/identity.test.ts`
Expected: FAIL, cannot resolve `../../src/lib/pronouns/identity`.

- [ ] **Step 3: Write `src/lib/pronouns/identity.ts`**

```ts
import type { RawEntry, RawLocaleProfile, RawProfile, RawPronoun } from './client'
import { XE_FORMS, templatize } from './drills'
import {
    type Entries,
    type Entry,
    FORM_KEYS,
    type Forms,
    type Identity,
    type PronounSet,
} from './types'

type BareSet = Omit<PronounSet, 'opinion'>
type Resolved = { sets: BareSet[]; examples: string[] | null }

// Only these survive. close, jokingly and every custom opinion (anything that
// isn't a built-in key, so new custom opinions are private by default) are
// dropped here, before anything is displayed, taught or graded.
const KEPT = new Set(['yes', 'meh', 'no'])
const SITE_PREFIX = /^https?:\/\/[^/]*pronouns\.page\/+/i

export const VOID_FORMS: Forms = {
    pronoun_subject: 'void',
    pronoun_object: 'void',
    possessive_determiner: "void's",
    possessive_pronoun: "void's",
    reflexive: 'voidself',
}

export function normalizePronounValue(value: string): string {
    return value.trim().replace(SITE_PREFIX, '').replace(/^\/+/, '')
}

function keep(
    raw: RawEntry[] | undefined,
    clean: (value: string) => string,
): Entry[] {
    const kept: Entry[] = []
    for (const entry of raw ?? []) {
        if (typeof entry?.value !== 'string' || !KEPT.has(entry.opinion)) {
            continue
        }
        const value = clean(entry.value)
        if (value) kept.push({ value, opinion: entry.opinion as Entry['opinion'] })
    }
    return kept
}

export function entriesFromProfile(profile: RawProfile): Entries | null {
    const locales: RawLocaleProfile[] = Array.isArray(profile.profiles)
        ? profile.profiles
        : Object.entries(profile.profiles ?? {}).map(([locale, p]) => ({
              ...p,
              locale,
          }))
    const en = locales.find((p) => p?.locale === 'en')
    if (!en) return null
    return {
        names: keep(en.names, (v) => v.trim()),
        pronouns: keep(en.pronouns, normalizePronounValue),
    }
}

export function entriesFromFragment(hash: string): Entries | null {
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const name = params.get('n')?.trim() ?? ''
    let pronouns = params.get('p')?.trim() ?? ''
    // A hand-typed `p=xe&she` arrives as p=xe plus an empty `she` key.
    for (const [key, value] of params) {
        if (key !== 'n' && key !== 'p' && value === '' && pronouns) {
            pronouns += `&${key}`
        }
    }
    if (!name && !pronouns) return null
    return {
        names: name ? [{ value: name, opinion: 'yes' }] : [],
        pronouns: pronouns
            ? [{ value: normalizePronounValue(pronouns), opinion: 'yes' }]
            : [],
    }
}

function isSpecial(value: string): boolean {
    return value === 'null' || value === 'ask-me' || value.startsWith(':')
}

export function pronounValuesToFetch(entries: Entries): string[] {
    return [
        ...new Set(
            entries.pronouns
                .filter((e) => e.opinion !== 'no' && !isSpecial(e.value))
                .map((e) => e.value),
        ),
    ]
}

function labelFor(forms: Forms): string {
    const second =
        forms.pronoun_object === forms.pronoun_subject
            ? forms.possessive_determiner
            : forms.pronoun_object
    return `${forms.pronoun_subject}/${second}`
}

/** "Use the name instead of pronouns", same shape pronouns.page uses for :Name. */
function nameSet(name: string): BareSet {
    return {
        kind: 'name',
        label: name,
        forms: {
            pronoun_subject: name,
            pronoun_object: name,
            possessive_determiner: `${name}'s`,
            possessive_pronoun: `${name}'s`,
            reflexive: `${name}self`,
        },
        pronunciations: {},
    }
}

function splitSets(raw: RawPronoun): BareSet[] {
    const forms = FORM_KEYS.map((key) => (raw.morphemes?.[key] ?? '').split('&'))
    const sounds = FORM_KEYS.map((key) =>
        (raw.pronunciations?.[key] ?? '').split('&'),
    )
    const count = Math.min(...forms.map((f) => f.length))
    const sets: BareSet[] = []
    for (let i = 0; i < count; i++) {
        const setForms = Object.fromEntries(
            FORM_KEYS.map((key, k) => [key, forms[k][i].trim()]),
        ) as Forms
        if (FORM_KEYS.some((key) => !setForms[key])) continue
        const pronunciations = Object.fromEntries(
            FORM_KEYS.flatMap((key, k) =>
                sounds[k][i]?.trim() ? [[key, sounds[k][i].trim()]] : [],
            ),
        )
        sets.push({
            kind: 'pronouns',
            label: labelFor(setForms),
            forms: setForms,
            pronunciations,
        })
    }
    return sets
}

function resolveEntry(
    value: string,
    preferred: string | null,
    fetched: Record<string, RawPronoun | null>,
): Resolved | null {
    if (value === 'null') {
        return preferred ? { sets: [nameSet(preferred)], examples: null } : null
    }
    if (value === ':void') {
        const set: BareSet = {
            kind: 'pronouns',
            label: labelFor(VOID_FORMS),
            forms: VOID_FORMS,
            pronunciations: {},
        }
        return { sets: [set], examples: null }
    }
    if (value.startsWith(':')) {
        const name = value.slice(1).trim()
        return name ? { sets: [nameSet(name)], examples: null } : null
    }
    const raw = fetched[value]
    if (!raw) return null
    const sets = splitSets(raw)
    return sets.length ? { sets, examples: raw.examples ?? [] } : null
}

function uniqueCaseless(values: string[]): string[] {
    const seen = new Set<string>()
    return values.filter((v) => {
        const key = v.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

export function buildIdentity(
    entries: Entries,
    fetched: Record<string, RawPronoun | null>,
    xeExamples: string[],
): Identity {
    const preferred =
        entries.names.find((n) => n.opinion === 'yes')?.value ?? null
    const accepted = uniqueCaseless(
        entries.names.filter((n) => n.opinion !== 'no').map((n) => n.value),
    )
    const acceptedLower = new Set(accepted.map((n) => n.toLowerCase()))
    const avoid = uniqueCaseless(
        entries.names.filter((n) => n.opinion === 'no').map((n) => n.value),
    ).filter((n) => !acceptedLower.has(n.toLowerCase()))

    const sets: PronounSet[] = []
    let askMe: Identity['askMe'] = null
    let modeledExamples: string[] | null = null
    let sawYes = false
    const ordered = [
        ...entries.pronouns.filter((e) => e.opinion === 'yes'),
        ...entries.pronouns.filter((e) => e.opinion === 'meh'),
    ]
    for (const entry of ordered) {
        const opinion = entry.opinion as PronounSet['opinion']
        const firstYes = opinion === 'yes' && !sawYes
        if (entry.value === 'ask-me') {
            if (firstYes) askMe = 'only'
            else askMe ??= 'note'
            sawYes ||= opinion === 'yes'
            continue
        }
        const resolved = resolveEntry(entry.value, preferred, fetched)
        if (!resolved) continue
        if (firstYes) modeledExamples = resolved.examples
        sawYes ||= opinion === 'yes'
        for (const set of resolved.sets) {
            if (!sets.some((s) => s.label === set.label)) {
                sets.push({ ...set, opinion })
            }
        }
    }

    const identity: Identity = {
        names: { preferred, accepted, avoid },
        sets,
        askMe,
        templates: [],
    }
    const modeled = modeledSet(identity)
    if (modeled) {
        // Name and void sets have no examples of their own; xe's sentences
        // are singular and fit them.
        identity.templates = modeledExamples
            ? templatize(modeledExamples, modeled.forms, xeExamples)
            : templatize(xeExamples, XE_FORMS, xeExamples)
    }
    return identity
}

/** The set the site teaches: the first yes set, unless ask-me comes first. */
export function modeledSet(identity: Identity): PronounSet | null {
    if (identity.askMe === 'only') return null
    const first = identity.sets[0]
    return first?.opinion === 'yes' ? first : null
}

export function setLabel(set: PronounSet): string {
    return set.kind === 'name' ? `${set.label} instead of pronouns` : set.label
}

export type Summary = {
    teach: string[]
    accept: string[]
    askMe: Identity['askMe']
    nothingToTeach: boolean
}

export function summarize(identity: Identity): Summary {
    const { preferred, accepted } = identity.names
    const yes = identity.sets.filter((s) => s.opinion === 'yes')
    const meh = identity.sets.filter((s) => s.opinion === 'meh')
    return {
        teach: [...(preferred ? [preferred] : []), ...yes.map(setLabel)],
        accept: [
            ...accepted.filter((n) => n !== preferred),
            ...meh.map(setLabel),
        ],
        askMe: identity.askMe,
        nothingToTeach:
            preferred === null && yes.length === 0 && identity.askMe !== 'only',
    }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `bunx vitest run test/pronouns/identity.test.ts`
Expected: PASS (21 tests).

- [ ] **Step 5: Commit**

```bash
bun run format && bun run lint
git add -A
git commit -m "feat: identity with opinion mapping, private filtering and special values"
```

---

### Task 5: Deterministic checker

**Files:**
- Create: `src/lib/pronouns/check.ts`
- Test: `test/pronouns/check.test.ts`

**Interfaces:**
- Consumes: `Blank`, `capitalize` from `drills.ts`; `modeledSet`, `buildIdentity`, `entriesFromProfile`, `entriesFromFragment` from `identity.ts`.
- Produces: `normalize(text): string`, `BlankResult = { correct: boolean; expected: string; pronunciation?: string }`, `checkBlank(answer, blank, identity): BlankResult` (throws if the identity has no modeled set), `Note = { text: string; suggestion?: string }`, `checkFreeText(text, identity): Note[]`.

- [ ] **Step 1: Write the failing tests** (`test/pronouns/check.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { checkBlank, checkFreeText } from '../../src/lib/pronouns/check'
import type { Blank } from '../../src/lib/pronouns/drills'
import type { RawProfile, RawPronoun } from '../../src/lib/pronouns/client'
import {
    buildIdentity,
    entriesFromFragment,
    entriesFromProfile,
} from '../../src/lib/pronouns/identity'
import type { Entries, Identity } from '../../src/lib/pronouns/types'
import { fixtureResponse, loadPronounFixture } from '../fixtures/resolve'

const xe = loadPronounFixture('xe')
const fetched: Record<string, RawPronoun | null> = {
    xe,
    she: loadPronounFixture('she'),
    they: loadPronounFixture('they'),
    'xe&she': loadPronounFixture('xe&she'),
    'ae/aer/aer/aers/aerself': loadPronounFixture('ae/aer/aer/aers/aerself'),
}

function fromFragment(hash: string): Identity {
    return buildIdentity(entriesFromFragment(hash) as Entries, fetched, xe.examples)
}

async function testcard(): Promise<Identity> {
    const raw = (await fixtureResponse('/profile/get/testcard').json()) as RawProfile
    return buildIdentity(entriesFromProfile(raw) as Entries, fetched, xe.examples)
}

const blank = (key: Blank['key'], capitalize = false): Blank => ({ key, capitalize })

describe('checkBlank', () => {
    const identity = fromFragment('#n=Sam&p=xe%26she')

    it('accepts the modeled form, ignoring case and spaces', () => {
        expect(checkBlank('  XEM ', blank('pronoun_object'), identity)).toEqual({
            correct: true,
            expected: 'xem',
            pronunciation: 'zɛm',
        })
    })

    it('accepts any listed set, so mixing sets is fine', () => {
        expect(checkBlank('her', blank('possessive_determiner'), identity).correct).toBe(true)
    })

    it('shows the modeled form, capitalized at a sentence start', () => {
        expect(checkBlank('he', blank('pronoun_subject', true), identity)).toEqual({
            correct: false,
            expected: 'Xe',
            pronunciation: 'zi',
        })
    })

    it('treats an empty answer as a miss', () => {
        expect(checkBlank('', blank('reflexive'), identity).correct).toBe(false)
    })

    it('handles irregular neopronouns where forms repeat', () => {
        const ae = fromFragment('#n=Sam&p=ae/aer/aer/aers/aerself')
        expect(checkBlank('aer', blank('pronoun_object'), ae).correct).toBe(true)
        expect(checkBlank('aer', blank('possessive_determiner'), ae).correct).toBe(true)
        expect(checkBlank('aers', blank('possessive_pronoun'), ae).correct).toBe(true)
    })

    it('accepts singular themself for themselves', () => {
        const they = fromFragment('#n=Sam&p=they')
        expect(checkBlank('themself', blank('reflexive'), they).correct).toBe(true)
    })

    it('accepts the name in a pronoun slot for null, with curly apostrophes', () => {
        const name = fromFragment('#n=Sam&p=null')
        expect(checkBlank('sam', blank('pronoun_subject'), name).correct).toBe(true)
        expect(checkBlank('Sam’s', blank('possessive_determiner'), name).correct).toBe(true)
    })

    it('accepts meh sets but models only yes sets', async () => {
        const identity = await testcard()
        const result = checkBlank('them', blank('pronoun_object'), identity)
        expect(result).toMatchObject({ correct: true, expected: 'xem' })
    })

    it('grades a private set like any other miss', async () => {
        const result = checkBlank('aer', blank('pronoun_object'), await testcard())
        expect(result).toEqual({ correct: false, expected: 'xem', pronunciation: 'zɛm' })
    })
})

describe('checkFreeText', () => {
    it('suggests the modeled form for an unlisted pronoun', () => {
        expect(checkFreeText('Sam said he was tired', fromFragment('#n=Sam&p=xe'))).toEqual([
            { text: '"he": Sam uses xe/xem,', suggestion: 'xe' },
        ])
    })

    it('offers both forms for an ambiguous word', () => {
        expect(checkFreeText('I saw her', fromFragment('#n=Sam&p=xe'))).toEqual([
            { text: '"her": Sam uses xe/xem,', suggestion: 'xem or xyr' },
        ])
    })

    it('flags each word once', () => {
        expect(checkFreeText('he and he', fromFragment('#n=Sam&p=xe'))).toHaveLength(1)
    })

    it('does not flag listed sets, accepted names or other words', async () => {
        expect(
            checkFreeText('Sammy said she and xe and they ate the constructor', await testcard()),
        ).toEqual([])
    })

    it('never reacts to private entries', async () => {
        expect(checkFreeText('Hiddenname gave aer the book', await testcard())).toEqual([])
    })

    it('flags a no name without repeating it', async () => {
        const notes = checkFreeText('Oldname went home', await testcard())
        expect(notes).toEqual([{ text: 'Xyr name is Sam.' }])
        expect(JSON.stringify(notes)).not.toContain('Oldname')
    })

    it('matches no names as whole words only', async () => {
        expect(checkFreeText('Oldnames went home', await testcard())).toEqual([])
    })

    it('suggests the name when the card uses no pronouns', () => {
        expect(checkFreeText('she left', fromFragment('#n=Sam&p=null'))).toEqual([
            { text: '"she": Sam goes by name, not pronouns,', suggestion: 'Sam' },
        ])
    })

    it('never infers pronouns from a name alone', () => {
        expect(checkFreeText('Sam said she was tired', fromFragment('#n=Sam'))).toEqual([])
    })

    it('points to asking when ask-me comes first', () => {
        const identity = buildIdentity(
            {
                names: [{ value: 'Kit', opinion: 'yes' }],
                pronouns: [{ value: 'ask-me', opinion: 'yes' }],
            },
            fetched,
            xe.examples,
        )
        expect(checkFreeText('he left', identity)).toEqual([
            { text: '"he": ask Kit which pronouns to use.' },
        ])
    })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `bunx vitest run test/pronouns/check.test.ts`
Expected: FAIL, cannot resolve `../../src/lib/pronouns/check`.

- [ ] **Step 3: Write `src/lib/pronouns/check.ts`**

```ts
import { type Blank, capitalize } from './drills'
import { modeledSet } from './identity'
import { FORM_KEYS, type FormKey, type Identity, type PronounSet } from './types'

/** Other spellings accepted for a form. Singular "themself" is valid too. */
const ALTERNATES: Record<string, string[]> = { themselves: ['themself'] }

const S: FormKey[] = ['pronoun_subject']
const O: FormKey[] = ['pronoun_object']
const D: FormKey[] = ['possessive_determiner']
const P: FormKey[] = ['possessive_pronoun']
const R: FormKey[] = ['reflexive']
const OD: FormKey[] = ['pronoun_object', 'possessive_determiner']
const DP: FormKey[] = ['possessive_determiner', 'possessive_pronoun']

/**
 * Third-person pronouns free typing knows about. A Map, not an object, so
 * words like "constructor" never match a prototype key.
 */
const LEXICON = new Map<string, FormKey[]>([
    ['he', S], ['him', O], ['his', DP], ['himself', R],
    ['she', S], ['her', OD], ['hers', P], ['herself', R],
    ['they', S], ['them', O], ['their', D], ['theirs', P],
    ['themself', R], ['themselves', R],
    ['xe', S], ['xem', O], ['xyr', D], ['xyrs', P], ['xemself', R],
    ['ze', S], ['zir', OD], ['zirs', P], ['zirself', R],
    ['hir', OD], ['hirs', P], ['hirself', R],
    ['ey', S], ['em', O], ['eir', D], ['eirs', P], ['emself', R],
    ['fae', S], ['faer', OD], ['faers', P], ['faerself', R],
])

export function normalize(text: string): string {
    return text.normalize('NFC').trim().toLowerCase().replaceAll('\u2019', "'")
}

function spellings(form: string): string[] {
    const f = normalize(form)
    return [f, ...(ALTERNATES[f] ?? [])]
}

export type BlankResult = {
    correct: boolean
    expected: string
    pronunciation?: string
}

export function checkBlank(
    answer: string,
    blank: Blank,
    identity: Identity,
): BlankResult {
    const modeled = modeledSet(identity)
    if (!modeled) throw new Error('checkBlank needs an identity with a modeled set')
    const given = normalize(answer)
    // Any accepted set counts, so mixing sets within one sentence is fine.
    const correct =
        given !== '' &&
        identity.sets.some((set) => spellings(set.forms[blank.key]).includes(given))
    const form = modeled.forms[blank.key]
    return {
        correct,
        expected: blank.capitalize ? capitalize(form) : form,
        pronunciation: modeled.pronunciations[blank.key],
    }
}

export type Note = { text: string; suggestion?: string }

function containsWord(text: string, word: string): boolean {
    const escaped = word.normalize('NFC').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(
        `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
        'iu',
    ).test(text.normalize('NFC'))
}

function nameNote(identity: Identity, modeled: PronounSet | null): Note {
    const name = identity.names.preferred
    // Never repeat the avoided name. Only state the right one.
    if (!name) return { text: 'Check the card for the name to use.' }
    if (modeled) {
        return { text: `${capitalize(modeled.forms.possessive_determiner)} name is ${name}.` }
    }
    return { text: `The name to use is ${name}.` }
}

function pronounNote(
    word: string,
    keys: FormKey[],
    identity: Identity,
    modeled: PronounSet | null,
): Note | null {
    const name = identity.names.preferred
    if (identity.askMe === 'only') {
        return {
            text: name
                ? `"${word}": ask ${name} which pronouns to use.`
                : `"${word}": ask which pronouns to use.`,
        }
    }
    // Nothing on the card to compare against, and we never guess.
    if (!modeled) return null
    const suggestion = [...new Set(keys.map((key) => modeled.forms[key]))].join(' or ')
    if (modeled.kind === 'name') {
        return { text: `"${word}": ${modeled.label} goes by name, not pronouns,`, suggestion }
    }
    const who = name ? `${name} uses` : 'The card lists'
    return { text: `"${word}": ${who} ${modeled.label},`, suggestion }
}

/**
 * Soft notes for free typing. "her" might be someone else, so notes suggest
 * rather than correct.
 */
export function checkFreeText(text: string, identity: Identity): Note[] {
    const notes: Note[] = []
    const modeled = modeledSet(identity)
    if (identity.names.avoid.some((avoided) => containsWord(text, avoided))) {
        notes.push(nameNote(identity, modeled))
    }
    const fine = new Set([
        ...identity.sets.flatMap((set) =>
            FORM_KEYS.flatMap((key) => spellings(set.forms[key])),
        ),
        ...identity.names.accepted.map(normalize),
    ])
    const seen = new Set<string>()
    for (const [word] of text.toLowerCase().matchAll(/\p{L}+/gu)) {
        const keys = LEXICON.get(word)
        if (!keys || fine.has(word) || seen.has(word)) continue
        seen.add(word)
        const note = pronounNote(word, keys, identity, modeled)
        if (note) notes.push(note)
    }
    return notes
}
```

Biome will reflow the `LEXICON` rows; that is fine.

- [ ] **Step 4: Run the tests to see them pass**

Run: `bunx vitest run test/pronouns/check.test.ts`
Expected: PASS (19 tests).

- [ ] **Step 5: Commit**

```bash
bun run format && bun run lint
git add -A
git commit -m "feat: deterministic checker for blanks and free typing"
```

---

### Task 6: Loader, card cache and safe embedding

**Files:**
- Create: `src/lib/pronouns/load.ts`, `src/lib/links.ts` (only `USERNAME_PATTERN` and `isValidUsername` now; Task 9 adds the rest), `src/lib/server/card.ts`, `src/lib/server/embed.ts`
- Test: `test/pronouns/load.test.ts`, `test/server/card.test.ts`, `test/server/embed.test.ts`

**Interfaces:**
- Consumes: `getPronouns`, `getProfile`, `ClientOptions`, `RawPronoun` (client); `entriesFromProfile`, `pronounValuesToFetch`, `buildIdentity` (identity).
- Produces:
  - `loadIdentity(entries: Entries, opts?: ClientOptions): Promise<Identity | null>` (null means an upstream error, never "unknown set")
  - `USERNAME_PATTERN: RegExp`, `isValidUsername(value): boolean` in `src/lib/links.ts`
  - `CARD_TTL_SECONDS = 3600`, `CardCache = { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> }`, `CardDeps = ClientOptions & { cache: CardCache | null }`, `CardResult = { status: 'found'; identity: Identity } | { status: 'not-found' } | { status: 'error' }`, `getCard(username, deps): Promise<CardResult>`
  - `jsonForScript(value: unknown): string`

- [ ] **Step 1: Write the failing tests**

`test/pronouns/load.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { loadIdentity } from '../../src/lib/pronouns/load'
import { TEST_BASE, fixtureFetch } from '../fixtures/fixture-fetch'

describe('loadIdentity', () => {
    it('fetches the listed set and xe examples, nothing else', async () => {
        const log: string[] = []
        const identity = await loadIdentity(
            {
                names: [{ value: 'Sam', opinion: 'yes' }],
                pronouns: [{ value: 'xe&she', opinion: 'yes' }],
            },
            { base: TEST_BASE, fetch: fixtureFetch(log) },
        )
        expect(identity?.sets.map((s) => s.label)).toEqual(['xe/xem', 'she/her'])
        expect(log.sort()).toEqual(['/v3/pronouns/xe', '/v3/pronouns/xe&she'])
    })

    it('treats an unknown set as unresolvable, not as an error', async () => {
        const identity = await loadIdentity(
            { names: [], pronouns: [{ value: 'notaset', opinion: 'yes' }] },
            { base: TEST_BASE, fetch: fixtureFetch() },
        )
        expect(identity?.sets).toEqual([])
    })

    it('returns null when a fetch fails', async () => {
        const failing = (async (input: RequestInfo | URL) =>
            String(input).endsWith('/they')
                ? new Response('down', { status: 503 })
                : fixtureFetch()(input)) as typeof fetch
        expect(
            await loadIdentity(
                { names: [], pronouns: [{ value: 'they', opinion: 'yes' }] },
                { base: TEST_BASE, fetch: failing },
            ),
        ).toBeNull()
    })
})
```

`test/server/card.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { type CardCache, getCard } from '../../src/lib/server/card'
import { TEST_BASE, fixtureFetch } from '../fixtures/fixture-fetch'

class MemoryCache implements CardCache {
    store = new Map<string, Response>()
    async match(req: Request) {
        return this.store.get(req.url)?.clone()
    }
    async put(req: Request, res: Response) {
        this.store.set(req.url, res.clone())
    }
}

describe('getCard', () => {
    it('returns the filtered identity and caches it for an hour', async () => {
        const cache = new MemoryCache()
        const result = await getCard('testcard', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
            cache,
        })
        expect(result.status).toBe('found')
        const [cached] = cache.store.values()
        expect(cached.headers.get('cache-control')).toBe('max-age=3600')
    })

    it('serves a cached card without calling pronouns.page', async () => {
        const cache = new MemoryCache()
        await getCard('testcard', { base: TEST_BASE, fetch: fixtureFetch(), cache })
        const log: string[] = []
        const again = await getCard('TestCard', {
            base: TEST_BASE,
            fetch: fixtureFetch(log),
            cache,
        })
        expect(again.status).toBe('found')
        expect(log).toEqual([])
    })

    it('never caches not-found, so a new card shows up right away', async () => {
        const cache = new MemoryCache()
        const first = await getCard('fresh', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
            cache,
        })
        expect(first.status).toBe('not-found')
        expect(cache.store.size).toBe(0)
        const created = (async (input: RequestInfo | URL) =>
            fixtureFetch()(String(input).replace('/fresh', '/testcard'))) as typeof fetch
        const second = await getCard('fresh', { base: TEST_BASE, fetch: created, cache })
        expect(second.status).toBe('found')
    })

    it('reports and never caches upstream errors in any set', async () => {
        const cache = new MemoryCache()
        const flaky = (async (input: RequestInfo | URL) =>
            String(input).includes('/pronouns/they')
                ? new Response('down', { status: 502 })
                : fixtureFetch()(input)) as typeof fetch
        const result = await getCard('testcard', { base: TEST_BASE, fetch: flaky, cache })
        expect(result).toEqual({ status: 'error' })
        expect(cache.store.size).toBe(0)
    })

    it('rejects invalid usernames without fetching', async () => {
        const log: string[] = []
        for (const bad of ['', '../admin', 'a b', 'x'.repeat(65)]) {
            expect(
                await getCard(bad, { base: TEST_BASE, fetch: fixtureFetch(log), cache: null }),
            ).toEqual({ status: 'not-found' })
        }
        expect(log).toEqual([])
    })

    it('works without a cache', async () => {
        const result = await getCard('testcard', {
            base: TEST_BASE,
            fetch: fixtureFetch(),
            cache: null,
        })
        expect(result.status).toBe('found')
    })
})
```

`test/server/embed.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { jsonForScript } from '../../src/lib/server/embed'

describe('jsonForScript', () => {
    it('cannot close the script tag and still round-trips', () => {
        const value = { name: '</script><img src=x onerror=alert(1)> ' }
        const json = jsonForScript(value)
        expect(json).not.toContain('</')
        expect(json).not.toContain('<img')
        expect(JSON.parse(json)).toEqual(value)
    })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `bunx vitest run test/pronouns/load.test.ts test/server`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the implementation**

`src/lib/pronouns/load.ts`:

```ts
import { type ClientOptions, type RawPronoun, getPronouns } from './client'
import { buildIdentity, pronounValuesToFetch } from './identity'
import type { Entries, Identity } from './types'

/**
 * Fetches every listed set plus xe (its examples are the drill templates).
 * Returns null on any upstream error, so a card never silently loses a set.
 * A set pronouns.page doesn't know (404) is skipped instead.
 */
export async function loadIdentity(
    entries: Entries,
    opts: ClientOptions = {},
): Promise<Identity | null> {
    const values = pronounValuesToFetch(entries)
    const [xe, ...results] = await Promise.all([
        getPronouns('xe', opts),
        ...values.map((value) => getPronouns(value, opts)),
    ])
    if (!xe.ok) return null
    if (results.some((r) => !r.ok && r.reason === 'error')) return null
    const fetched: Record<string, RawPronoun | null> = {}
    values.forEach((value, i) => {
        const result = results[i]
        fetched[value] = result.ok ? result.data : null
    })
    return buildIdentity(entries, fetched, xe.data.examples)
}
```

`src/lib/links.ts` (Task 9 extends this file):

```ts
/** pronouns.page usernames; also keeps paths like ../ out of API calls. */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

export function isValidUsername(value: string): boolean {
    return USERNAME_PATTERN.test(value) && !/^\.+$/.test(value)
}
```

`src/lib/server/card.ts`:

```ts
import { isValidUsername } from '../links'
import { type ClientOptions, getProfile } from '../pronouns/client'
import { entriesFromProfile } from '../pronouns/identity'
import { loadIdentity } from '../pronouns/load'
import type { Identity } from '../pronouns/types'

export const CARD_TTL_SECONDS = 3600

export type CardCache = {
    match(request: Request): Promise<Response | undefined>
    put(request: Request, response: Response): Promise<void>
}

export type CardDeps = ClientOptions & { cache: CardCache | null }

export type CardResult =
    | { status: 'found'; identity: Identity }
    | { status: 'not-found' }
    | { status: 'error' }

function cacheKey(username: string): Request {
    return new Request(
        `https://transbot.net/__card/v1/${username.toLowerCase()}`,
    )
}

/**
 * The filtered identity for a pronouns.page username. Only found cards are
 * cached, so someone who just saved a card isn't stuck with a stale miss.
 */
export async function getCard(
    username: string,
    deps: CardDeps,
): Promise<CardResult> {
    if (!isValidUsername(username)) return { status: 'not-found' }
    const key = cacheKey(username)
    const hit = await deps.cache?.match(key).catch(() => undefined)
    if (hit) return { status: 'found', identity: (await hit.json()) as Identity }

    const profile = await getProfile(username, deps)
    if (!profile.ok) return { status: profile.reason }
    const entries = entriesFromProfile(profile.data)
    if (!entries) return { status: 'not-found' }
    const identity = await loadIdentity(entries, deps)
    if (!identity) return { status: 'error' }

    await deps.cache
        ?.put(
            key,
            new Response(JSON.stringify(identity), {
                headers: {
                    'content-type': 'application/json',
                    'cache-control': `max-age=${CARD_TTL_SECONDS}`,
                },
            }),
        )
        .catch(() => {
            // A failed cache write only costs a refetch next time.
        })
    return { status: 'found', identity }
}
```

`src/lib/server/embed.ts`:

```ts
/**
 * JSON for an inline <script type="application/json">. Escaping `<` means a
 * value like `</script>` can't close the tag.
 */
export function jsonForScript(value: unknown): string {
    return JSON.stringify(value)
        .replaceAll('<', '\\u003c')
        .replaceAll('\u2028', '\\u2028')
        .replaceAll('\u2029', '\\u2029')
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `bunx vitest run test/pronouns/load.test.ts test/server`
Expected: PASS (10 tests). Then `bun run test:unit` passes in full.

- [ ] **Step 5: Commit**

```bash
bun run format && bun run lint
git add -A
git commit -m "feat: card loader with hour-long cache that skips misses and errors"
```

---

### Task 7: Practice UI and the `/practice` page

**Files:**
- Create: `src/scripts/dom.ts`, `src/scripts/practice-ui.ts`, `src/scripts/practice-page.ts`, `src/pages/practice.astro`
- Create: `test/e2e/mock-pronouns-page.ts`
- Test: `test/e2e/practice.spec.ts`

**Interfaces:**
- Consumes: `checkBlank`, `checkFreeText`, `normalize`, `Note` (check); `drillsFor`, `Blank` (drills); `modeledSet`, `summarize`, `entriesFromFragment` (identity); `loadIdentity` (load); `fixtureResponse` (tests).
- Produces:
  - `el<K>(tag: K, attrs?: Record<string, string>, ...children: Array<Node | string>): HTMLElementTagNameMap[K]`
  - `mountPractice(root: HTMLElement, identity: Identity, rng?: () => number): void`. Renders: `h1` "Practice with <name>" (or "Practice"); a region "Fill in the blanks" with inputs labeled "Blank N of M", a "Check" button and a "Next" button; a region "Say it your way" with a textarea and a "Check" button.
  - `mockPronounsPage(page: Page, requests?: string[]): Promise<void>` for e2e.

- [ ] **Step 1: Write the e2e mock and failing tests**

`test/e2e/mock-pronouns-page.ts`:

```ts
import type { Page } from '@playwright/test'
import { fixtureResponse } from '../fixtures/resolve'

/** Serves pronouns.page API calls made by the browser from fixtures. */
export async function mockPronounsPage(
    page: Page,
    requests: string[] = [],
): Promise<void> {
    await page.route('https://en.pronouns.page/api/**', async (route) => {
        const url = new URL(route.request().url())
        requests.push(url.href)
        const res = fixtureResponse(url.pathname)
        await route.fulfill({
            status: res.status,
            contentType: 'application/json',
            headers: { 'access-control-allow-origin': '*' },
            body: await res.text(),
        })
    })
}
```

`test/e2e/practice.spec.ts`:

```ts
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
```

The last test registers its route after `beforeEach`; Playwright checks the newest route first, so the 503 wins.

- [ ] **Step 2: Run them to see them fail**

Run: `bun run build && bunx playwright test practice.spec --project=mobile-chrome`
Expected: FAIL, `/practice` is a 404.

- [ ] **Step 3: Write the DOM helper and practice UI**

`src/scripts/dom.ts`:

```ts
type Child = Node | string

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Record<string, string> = {},
    ...children: Child[]
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag)
    for (const [key, value] of Object.entries(attrs)) {
        node.setAttribute(key, value)
    }
    // append() turns strings into text nodes, so names and card values never
    // parse as HTML.
    node.append(...children)
    return node
}
```

`src/scripts/practice-ui.ts`:

```ts
import {
    type Note,
    checkBlank,
    checkFreeText,
    normalize,
} from '../lib/pronouns/check'
import { type Blank, drillsFor } from '../lib/pronouns/drills'
import { modeledSet, summarize } from '../lib/pronouns/identity'
import type { Identity } from '../lib/pronouns/types'
import { el } from './dom'

export function mountPractice(
    root: HTMLElement,
    identity: Identity,
    rng: () => number = Math.random,
): void {
    const name = identity.names.preferred
    const modeled = modeledSet(identity)
    const children: Node[] = [cardSummary(identity)]
    if (identity.askMe) children.push(askMeNote(name, identity.askMe))
    if (modeled) children.push(drillSection(identity, rng))
    if (name || modeled || identity.askMe) children.push(freeSection(identity))
    root.replaceChildren(...children)
}

function cardSummary(identity: Identity): HTMLElement {
    const summary = summarize(identity)
    const name = identity.names.preferred
    const list = el('dl')
    if (summary.teach.length) {
        list.append(el('dt', {}, 'Use'), el('dd', {}, summary.teach.join(', ')))
    }
    if (summary.accept.length) {
        list.append(
            el('dt', {}, 'Also fine'),
            el('dd', {}, summary.accept.join(', ')),
        )
    }
    const section = el(
        'section',
        { class: 'card-summary' },
        el('h1', {}, name ? `Practice with ${name}` : 'Practice'),
    )
    if (list.childElementCount) section.append(list)
    return section
}

function askMeNote(
    name: string | null,
    mode: NonNullable<Identity['askMe']>,
): HTMLElement {
    const ask = name
        ? `ask ${name} which pronouns to use.`
        : 'ask which pronouns to use.'
    const text = mode === 'only' ? `Please ${ask}` : `You can also ${ask}`
    return el('p', { class: 'ask-me' }, text)
}

function feedbackText(answer: string, blank: Blank, identity: Identity) {
    const result = checkBlank(answer, blank, identity)
    const ipa = result.pronunciation ? ` /${result.pronunciation}/` : ''
    if (!result.correct) {
        return { correct: false, text: `It's ${result.expected}${ipa} here.` }
    }
    if (normalize(answer) === normalize(result.expected)) {
        return { correct: true, text: `Correct: ${result.expected}${ipa}` }
    }
    return {
        correct: true,
        text: `That works too. Most often: ${result.expected}${ipa}`,
    }
}

function drillSection(identity: Identity, rng: () => number): HTMLElement {
    const drills = drillsFor(identity.templates, rng)
    const progress = el('p', { class: 'hint' })
    const sentence = el('p', { class: 'drill-sentence' })
    const check = el('button', { type: 'submit' }, 'Check')
    const next = el('button', { type: 'button', class: 'secondary' }, 'Next')
    const form = el(
        'form',
        { class: 'drill-form' },
        sentence,
        el('div', { class: 'drill-actions' }, check, next),
    )
    const feedback = el('ul', { class: 'feedback', 'aria-live': 'polite' })
    const section = el(
        'section',
        { class: 'drills', 'aria-labelledby': 'drills-heading' },
        el('h2', { id: 'drills-heading' }, 'Fill in the blanks'),
        progress,
        form,
        feedback,
    )

    let index = 0
    let inputs: HTMLInputElement[] = []
    let blanks: Blank[] = []

    function show(focus: boolean): void {
        const drill = drills[index]
        progress.textContent = `Sentence ${index + 1} of ${drills.length}`
        inputs = []
        blanks = []
        sentence.replaceChildren(
            ...drill.parts.map((part) => {
                if (typeof part === 'string') return document.createTextNode(part)
                const input = el('input', {
                    type: 'text',
                    autocomplete: 'off',
                    autocapitalize: 'none',
                    spellcheck: 'false',
                })
                inputs.push(input)
                blanks.push(part)
                return input
            }),
        )
        inputs.forEach((input, i) => {
            input.setAttribute('aria-label', `Blank ${i + 1} of ${inputs.length}`)
        })
        feedback.replaceChildren()
        check.hidden = false
        next.hidden = true
        if (focus) inputs[0]?.focus()
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault()
        if (check.hidden) return
        feedback.replaceChildren(
            ...blanks.map((blank, i) => {
                inputs[i].readOnly = true
                const { correct, text } = feedbackText(inputs[i].value, blank, identity)
                return el('li', { class: correct ? 'correct' : 'try' }, text)
            }),
        )
        check.hidden = true
        next.hidden = false
        next.textContent = index + 1 < drills.length ? 'Next' : 'Start over'
        next.focus()
    })

    next.addEventListener('click', () => {
        index = (index + 1) % drills.length
        show(true)
    })

    show(false)
    return section
}

function noteItem(note: Note): HTMLElement {
    const item = el('li', { class: 'try' }, note.text)
    if (note.suggestion) item.append(' try ', el('em', {}, note.suggestion), '?')
    return item
}

function freeSection(identity: Identity): HTMLElement {
    const name = identity.names.preferred
    const prompt = name
        ? `Tell me what ${name} did this weekend.`
        : "Tell me about this person's weekend."
    const textarea = el('textarea', { id: 'free-text', rows: '4' })
    const notes = el('ul', { class: 'feedback', 'aria-live': 'polite' })
    const form = el(
        'form',
        { class: 'free-form' },
        el('label', { for: 'free-text' }, prompt),
        textarea,
        el('button', { type: 'submit' }, 'Check'),
    )
    form.addEventListener('submit', (event) => {
        event.preventDefault()
        if (!textarea.value.trim()) {
            notes.replaceChildren()
            return
        }
        const found = checkFreeText(textarea.value, identity)
        notes.replaceChildren(
            ...(found.length
                ? found.map(noteItem)
                : [el('li', { class: 'correct' }, 'Nothing to flag. Nice.')]),
        )
    })
    return el(
        'section',
        { class: 'free', 'aria-labelledby': 'free-heading' },
        el('h2', { id: 'free-heading' }, 'Say it your way'),
        form,
        notes,
    )
}
```

- [ ] **Step 4: Write the page and its bootstrap**

`src/scripts/practice-page.ts`:

```ts
import { entriesFromFragment } from '../lib/pronouns/identity'
import { loadIdentity } from '../lib/pronouns/load'
import { el } from './dom'
import { mountPractice } from './practice-ui'

async function start(): Promise<void> {
    const root = document.getElementById('practice')
    if (!root) return
    const entries = entriesFromFragment(window.location.hash)
    if (!entries) {
        root.replaceChildren(
            el('h1', {}, 'Practice'),
            el(
                'p',
                {},
                'This link is missing a name and pronouns. ',
                el('a', { href: '/' }, 'Make a practice link'),
                '.',
            ),
        )
        return
    }
    root.replaceChildren(
        el('p', { role: 'status' }, 'Loading pronouns from pronouns.page...'),
    )
    // Only the pronoun set goes to pronouns.page. The name stays here.
    const identity = await loadIdentity(entries)
    if (!identity) {
        root.replaceChildren(
            el('h1', {}, 'Practice'),
            el(
                'p',
                { role: 'alert' },
                "Couldn't reach pronouns.page. Try again in a moment.",
            ),
        )
        return
    }
    mountPractice(root, identity)
    const unknown =
        entries.pronouns.length > 0 &&
        identity.sets.length === 0 &&
        identity.askMe === null
    if (unknown) {
        root.querySelector('h1')?.after(
            el(
                'p',
                { role: 'alert' },
                "pronouns.page doesn't know those pronouns. Check the spelling, or write all five forms, like ae/aer/aer/aers/aerself.",
            ),
        )
    }
}

void start()
window.addEventListener('hashchange', () => void start())
```

`src/pages/practice.astro`:

```astro
---
import Layout from '../layouts/Layout.astro'
---

<Layout title="Practice | transbot" noindex>
    <div id="practice">
        <p>Loading practice...</p>
    </div>
    <noscript>
        <p>
            Practice needs JavaScript, because the name and pronouns in this
            link stay in your browser.
        </p>
    </noscript>
</Layout>

<script>
    import '../scripts/practice-page'
</script>
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `bun run build && bunx playwright test practice.spec`
Expected: PASS (9 tests x 2 projects).

- [ ] **Step 6: Commit**

```bash
bun run format && bun run lint && bun run check
git add -A
git commit -m "feat: practice drills and free typing on /practice"
```

---

### Task 8: Server routes (`/@username`, `/api/card`, `/tara`) with a fixture API for e2e

**Files:**
- Create: `src/lib/server/runtime.ts`, `src/pages/@[username].astro`, `src/pages/api/card/[username].ts`, `src/pages/tara.astro`, `scripts/e2e-preview.ts`
- Modify: `playwright.config.ts` (swap the webServer command)
- Test: `test/e2e/server.spec.ts`

**Interfaces:**
- Consumes: `getCard`, `CardDeps` (card); `jsonForScript` (embed); `summarize` (identity); `mountPractice` (practice-ui); `DEFAULT_API_BASE` (client); `fixtureResponse` (resolve).
- Produces: `cardDeps(): CardDeps`. `GET /api/card/<username>` returns `200 { identity }`, `404 { error: 'not-found' }` or `502 { error: 'error' }`, always `cache-control: no-store`. `/@<username>` returns 200/404/502 HTML. `/tara` returns 302 to `/@taravie`.

Why a fixture server: `/@username` fetches pronouns.page inside the Worker, where Playwright's `page.route` can't reach. `scripts/e2e-preview.ts` serves fixtures over HTTP and writes `PRONOUNS_API_BASE` into a `.dev.vars` next to the build-generated wrangler config (found through `.wrangler/deploy/config.json`), which the preview Worker reads. Production never sees this file: `wrangler deploy` doesn't upload `.dev.vars`, and the deploy job builds from a clean checkout.

- [ ] **Step 1: Write the e2e preview script and point Playwright at it**

`scripts/e2e-preview.ts`:

```ts
/// <reference types="bun" />
// Playwright's web server: a pronouns.page stand-in served from
// test/fixtures, plus `astro preview` with the Worker pointed at it.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fixtureResponse } from '../test/fixtures/resolve'

const portIndex = process.argv.indexOf('--port')
const port = portIndex === -1 ? '4344' : process.argv[portIndex + 1]

const api = Bun.serve({
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
    `PRONOUNS_API_BASE=http://localhost:${api.port}/v3\n`,
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
```

`playwright.config.ts` (replace the file):

```ts
import { devices } from '@playwright/test'
import { definePreviewConfig } from '@taraxvoid/voidflow/playwright'

const config = definePreviewConfig({
    ciPort: 4344,
    timeout: 60_000,
    projects: [
        {
            name: 'mobile-chrome',
            use: devices['Pixel 7'],
            testIgnore: /a11y\.spec\.ts/,
        },
        {
            name: 'desktop-chrome',
            use: devices['Desktop Chrome'],
            testIgnore: /a11y\.spec\.ts/,
        },
        {
            name: 'a11y',
            use: devices['Pixel 7'],
            testMatch: /a11y\.spec\.ts/,
        },
    ],
})

// /@username pages fetch pronouns.page from the Worker, out of reach of
// page.route, so the preview runs next to a fixture API.
const port = new URL(config.use?.baseURL ?? 'http://localhost:4344').port

export default {
    ...config,
    webServer: config.webServer && {
        ...config.webServer,
        command: `bun scripts/e2e-preview.ts --port ${port}`,
    },
}
```

- [ ] **Step 2: Write the failing tests** (`test/e2e/server.spec.ts`)

```ts
import { expect, test } from '@playwright/test'

test('/@testcard teaches the card without private entries', async ({ page }) => {
    const response = await page.goto('/@testcard')
    expect(response?.status()).toBe(200)
    await expect(
        page.getByRole('heading', { name: 'Practice with Sam' }),
    ).toBeVisible()
    await expect(page.getByText('You can also ask Sam')).toBeVisible()
    const html = await page.content()
    for (const hidden of [
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
    expect(await page.locator('body').innerText()).not.toContain('Oldname')
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
})

test('/@mehonly says there is nothing to practice', async ({ page }) => {
    await page.goto('/@mehonly')
    await expect(page.getByText("there's nothing to practice yet")).toBeVisible()
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
```

- [ ] **Step 3: Run them to see them fail**

Run: `bun run build && bunx playwright test server.spec --project=mobile-chrome`
Expected: FAIL, the routes are 404s.

- [ ] **Step 4: Write the routes**

`src/lib/server/runtime.ts`:

```ts
import { env } from 'cloudflare:workers'
import { DEFAULT_API_BASE } from '../pronouns/client'
import type { CardDeps } from './card'

/** Worker wiring for getCard. Kept apart so card.ts stays unit-testable. */
export function cardDeps(): CardDeps {
    return {
        base: env.PRONOUNS_API_BASE || DEFAULT_API_BASE,
        cache: typeof caches === 'undefined' ? null : caches.default,
    }
}
```

`src/pages/api/card/[username].ts`:

```ts
import type { APIRoute } from 'astro'
import { getCard } from '../../../lib/server/card'
import { cardDeps } from '../../../lib/server/runtime'

export const prerender = false

const headers = { 'cache-control': 'no-store' }

export const GET: APIRoute = async ({ params }) => {
    const result = await getCard(params.username ?? '', cardDeps())
    if (result.status === 'found') {
        return Response.json({ identity: result.identity }, { headers })
    }
    return Response.json(
        { error: result.status },
        { status: result.status === 'not-found' ? 404 : 502, headers },
    )
}
```

`src/pages/@[username].astro`:

```astro
---
import Layout from '../layouts/Layout.astro'
import { summarize } from '../lib/pronouns/identity'
import { getCard } from '../lib/server/card'
import { jsonForScript } from '../lib/server/embed'
import { cardDeps } from '../lib/server/runtime'

export const prerender = false

const result = await getCard(Astro.params.username ?? '', cardDeps())
if (result.status === 'not-found') Astro.response.status = 404
if (result.status === 'error') Astro.response.status = 502

const identity = result.status === 'found' ? result.identity : null
const empty = identity ? summarize(identity).nothingToTeach : false
const name = identity?.names.preferred
const title = name ? `Practice with ${name} | transbot` : 'transbot'
---

<Layout title={title} noindex>
    {
        result.status === 'not-found' && (
            <section>
                <h1>Card not found</h1>
                <p>
                    We couldn't find that card yet. Cards show up once they're
                    saved on pronouns.page.
                </p>
                <p>
                    <a href="/">Back to transbot</a>
                </p>
            </section>
        )
    }
    {
        result.status === 'error' && (
            <section>
                <h1>pronouns.page didn't answer</h1>
                <p>Try again in a moment.</p>
            </section>
        )
    }
    {
        identity && empty && (
            <section>
                <h1>Nothing to practice yet</h1>
                <p>
                    This card doesn't have a name or pronouns marked yes, so
                    there's nothing to practice yet.
                </p>
            </section>
        )
    }
    {
        identity && !empty && (
            <>
                <div id="practice" />
                <script
                    type="application/json"
                    id="identity-data"
                    set:html={jsonForScript(identity)}
                />
            </>
        )
    }
</Layout>

<script>
    import { mountPractice } from '../scripts/practice-ui'

    const data = document.getElementById('identity-data')
    const root = document.getElementById('practice')
    if (data?.textContent && root) {
        mountPractice(root, JSON.parse(data.textContent))
    }
</script>
```

If Astro does not match the `@[username].astro` file name (the e2e tests 404), rename it to `src/pages/[handle].astro`, return the not-found branch unless `Astro.params.handle` starts with `@`, and pass `handle.slice(1)` to `getCard`.

`src/pages/tara.astro`:

```astro
---
export const prerender = false
// 302, not 301: browsers cache 301s forever, and the alias may change.
return Astro.redirect('/@taravie', 302)
---
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `bun run build && bunx playwright test server.spec`
Expected: PASS (9 tests x 2 projects). If every `/@` test fails with "Card not found", the Worker isn't reading the fixture base: run `bun scripts/e2e-preview.ts --port 4399` by hand, then `curl -s localhost:4399/api/card/testcard | head -c 200`. Expect JSON with `"preferred":"Sam"`. If it isn't there, check where `.wrangler/deploy/config.json` points and that the `.dev.vars` file landed next to that config.

- [ ] **Step 6: Run the whole e2e suite** (the new web server must not break earlier specs)

Run: `bun run test:e2e:full`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
bun run format && bun run lint && bun run check
git add -A
git commit -m "feat: /@username practice, /api/card and /tara alias"
```

---

### Task 9: Landing page, link builder and card-sharing flow

**Files:**
- Modify: `src/lib/links.ts` (add link helpers), `src/pages/index.astro` (replace placeholder)
- Create: `src/lib/setup-flag.ts`, `src/scripts/landing.ts`
- Test: `test/lib/links.test.ts`, `test/lib/setup-flag.test.ts`, `test/e2e/landing.spec.ts`

**Interfaces:**
- Consumes: `summarize` (identity); `Identity`; `el` (dom); `entriesFromFragment` in tests.
- Produces:
  - `links.ts`: `practiceLink(name, pronouns, origin): string | null`, `cardLink(username, origin): string`, `normalizeUsername(input): string | null` (plus Task 6's `USERNAME_PATTERN`, `isValidUsername`).
  - `setup-flag.ts`: `SETUP_KEY = 'transbot:setup-clicked'`, `SETUP_TTL_MS` (14 days), `FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`, `safeStorage(): FlagStorage | null`, `markSetupClicked(storage, now)`, `isSetupPending(storage, now): boolean`, `clearSetup(storage)`.

"Not now" clears the flag, so the prompt does not come back on later visits. That is the gentlest reading of "dismisses it".

- [ ] **Step 1: Write the failing unit tests**

`test/lib/links.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
    cardLink,
    normalizeUsername,
    practiceLink,
} from '../../src/lib/links'
import { entriesFromFragment } from '../../src/lib/pronouns/identity'

describe('practiceLink', () => {
    it('encodes the name and shorthand into the fragment', () => {
        const link = practiceLink('Sam Lee', 'xe&she', 'https://transbot.net')
        expect(link).toBe('https://transbot.net/practice#n=Sam+Lee&p=xe%26she')
    })

    it('round-trips through entriesFromFragment', () => {
        const link = practiceLink(' Zoë ', 'ae/aer/aer/aers/aerself', 'https://x')
        const entries = entriesFromFragment(new URL(link ?? '').hash)
        expect(entries?.names[0].value).toBe('Zoë')
        expect(entries?.pronouns[0].value).toBe('ae/aer/aer/aers/aerself')
    })

    it('needs both a name and pronouns', () => {
        expect(practiceLink('', 'xe', 'https://x')).toBeNull()
        expect(practiceLink('Sam', '  ', 'https://x')).toBeNull()
    })
})

describe('cardLink', () => {
    it('builds the /@ link', () => {
        expect(cardLink('taravie', 'https://transbot.net')).toBe(
            'https://transbot.net/@taravie',
        )
    })
})

describe('normalizeUsername', () => {
    it('accepts a bare name, an @name and a pasted profile URL', () => {
        expect(normalizeUsername(' taravie ')).toBe('taravie')
        expect(normalizeUsername('@taravie')).toBe('taravie')
        expect(normalizeUsername('https://en.pronouns.page/@taravie/')).toBe(
            'taravie',
        )
    })

    it('rejects anything that is not a username', () => {
        expect(normalizeUsername('')).toBeNull()
        expect(normalizeUsername('two words')).toBeNull()
        expect(normalizeUsername('..')).toBeNull()
    })
})
```

`test/lib/setup-flag.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
    type FlagStorage,
    SETUP_KEY,
    SETUP_TTL_MS,
    clearSetup,
    isSetupPending,
    markSetupClicked,
} from '../../src/lib/setup-flag'

function memory(): FlagStorage & { data: Map<string, string> } {
    const data = new Map<string, string>()
    return {
        data,
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => void data.set(k, v),
        removeItem: (k) => void data.delete(k),
    }
}

const throwing: FlagStorage = {
    getItem: () => {
        throw new Error('blocked')
    },
    setItem: () => {
        throw new Error('blocked')
    },
    removeItem: () => {
        throw new Error('blocked')
    },
}

describe('setup flag', () => {
    it('is pending after a click and cleared on demand', () => {
        const storage = memory()
        markSetupClicked(storage, 1000)
        expect(isSetupPending(storage, 2000)).toBe(true)
        clearSetup(storage)
        expect(isSetupPending(storage, 2000)).toBe(false)
    })

    it('expires after 14 days and removes itself', () => {
        const storage = memory()
        markSetupClicked(storage, 0)
        expect(isSetupPending(storage, SETUP_TTL_MS + 1)).toBe(false)
        expect(storage.data.has(SETUP_KEY)).toBe(false)
    })

    it('ignores junk and future timestamps', () => {
        const storage = memory()
        storage.setItem(SETUP_KEY, 'soon')
        expect(isSetupPending(storage, 1000)).toBe(false)
        storage.setItem(SETUP_KEY, '5000')
        expect(isSetupPending(storage, 1000)).toBe(false)
    })

    it('works with no storage or storage that throws', () => {
        expect(() => markSetupClicked(throwing, 1)).not.toThrow()
        expect(isSetupPending(throwing, 1)).toBe(false)
        expect(() => clearSetup(throwing)).not.toThrow()
        expect(isSetupPending(null, 1)).toBe(false)
    })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `bunx vitest run test/lib`
Expected: FAIL, missing exports and module.

- [ ] **Step 3: Write `links.ts` additions and `setup-flag.ts`**

Append to `src/lib/links.ts`:

```ts
export function practiceLink(
    name: string,
    pronouns: string,
    origin: string,
): string | null {
    const n = name.trim()
    const p = pronouns.trim()
    if (!n || !p) return null
    // The fragment never reaches a server, so the name stays in the browser.
    return `${origin}/practice#${new URLSearchParams({ n, p })}`
}

export function cardLink(username: string, origin: string): string {
    return `${origin}/@${username}`
}

/** Accepts "name", "@name" or a pasted pronouns.page profile URL. */
export function normalizeUsername(input: string): string | null {
    const value = input
        .trim()
        .replace(/^https?:\/\/[^/]+\/+/i, '')
        .replace(/^@/, '')
        .replace(/\/+$/, '')
    return isValidUsername(value) ? value : null
}
```

`src/lib/setup-flag.ts`:

```ts
// Remembers, in this browser only, that someone clicked "Set up your
// pronouns.page card", so the page can ask for the username when they come
// back. It never leaves the browser.
export const SETUP_KEY = 'transbot:setup-clicked'
export const SETUP_TTL_MS = 14 * 24 * 60 * 60 * 1000

export type FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function safeStorage(): FlagStorage | null {
    try {
        const storage = window.localStorage
        storage.getItem(SETUP_KEY)
        return storage
    } catch {
        return null
    }
}

export function markSetupClicked(storage: FlagStorage | null, now: number): void {
    try {
        storage?.setItem(SETUP_KEY, String(now))
    } catch {
        // Storage blocked: the page works without the reminder.
    }
}

export function clearSetup(storage: FlagStorage | null): void {
    try {
        storage?.removeItem(SETUP_KEY)
    } catch {
        // Storage blocked: nothing to clear.
    }
}

export function isSetupPending(storage: FlagStorage | null, now: number): boolean {
    try {
        const raw = storage?.getItem(SETUP_KEY)
        if (!raw) return false
        const at = Number(raw)
        if (!Number.isFinite(at) || at > now || now - at > SETUP_TTL_MS) {
            clearSetup(storage)
            return false
        }
        return true
    } catch {
        return false
    }
}
```

- [ ] **Step 4: Run the unit tests to see them pass**

Run: `bunx vitest run test/lib`
Expected: PASS (10 tests).

- [ ] **Step 5: Write the failing e2e tests** (`test/e2e/landing.spec.ts`)

```ts
import { type Page, expect, test } from '@playwright/test'
import { mockPronounsPage } from './mock-pronouns-page'

const XE = {
    pronoun_subject: 'xe',
    pronoun_object: 'xem',
    possessive_determiner: 'xyr',
    possessive_pronoun: 'xyrs',
    reflexive: 'xemself',
}

function identity(preferred: string | null, withSet: boolean) {
    return {
        names: { preferred, accepted: preferred ? [preferred] : [], avoid: [] },
        sets: withSet
            ? [{ kind: 'pronouns', label: 'xe/xem', forms: XE, pronunciations: {}, opinion: 'yes' }]
            : [],
        askMe: null,
        templates: [],
    }
}

async function mockCards(page: Page): Promise<void> {
    await page.route('**/api/card/*', async (route) => {
        const username = new URL(route.request().url()).pathname.split('/').pop()
        if (username === 'found') {
            return route.fulfill({ json: { identity: identity('Sam', true) } })
        }
        if (username === 'empty') {
            return route.fulfill({ json: { identity: identity(null, false) } })
        }
        if (username === 'slow') {
            await new Promise((r) => setTimeout(r, 1500))
            return route.fulfill({ json: { identity: identity('Slow', true) } })
        }
        return route.fulfill({ status: 404, json: { error: 'not-found' } })
    })
}

const SETUP = 'Set up your pronouns.page card'
const PROMPT = 'Made your card? Enter your username to get your link.'

test.beforeEach(async ({ page }) => {
    await mockCards(page)
})

test('the setup link opens pronouns.page in a new tab', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: "I don't have one yet" }).click()
    const link = page.getByRole('link', { name: SETUP })
    await expect(link).toHaveAttribute('href', 'https://en.pronouns.page/account')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
    await expect(page.getByText('The link builder below works without an account.')).toBeVisible()
})

test('coming back after setup asks for the username', async ({ page, context }) => {
    await context.route('https://en.pronouns.page/**', (route) =>
        route.fulfill({ body: 'ok' }),
    )
    await page.goto('/')
    await page.getByRole('button', { name: "I don't have one yet" }).click()
    const popup = page.waitForEvent('popup')
    await page.getByRole('link', { name: SETUP }).click()
    await (await popup).close()
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(page.getByText(PROMPT)).toBeVisible()
    await expect(page.getByLabel('pronouns.page username')).toBeFocused()
})

test('a later visit shows the prompt until 14 days pass', async ({ page }) => {
    await page.addInitScript(() =>
        localStorage.setItem('transbot:setup-clicked', String(Date.now() - 1000)),
    )
    await page.goto('/')
    await expect(page.getByText(PROMPT)).toBeVisible()
})

test('a stale flag is ignored', async ({ page }) => {
    await page.addInitScript(() =>
        localStorage.setItem(
            'transbot:setup-clicked',
            String(Date.now() - 15 * 24 * 60 * 60 * 1000),
        ),
    )
    await page.goto('/')
    await expect(page.getByText(PROMPT)).toBeHidden()
})

test('not now dismisses the prompt', async ({ page }) => {
    await page.addInitScript(() =>
        localStorage.setItem('transbot:setup-clicked', String(Date.now())),
    )
    await page.goto('/')
    await page.getByRole('button', { name: 'Not now' }).click()
    await expect(page.getByText(PROMPT)).toBeHidden()
    expect(await page.evaluate(() => localStorage.getItem('transbot:setup-clicked'))).toBeNull()
})

test('a found card shows the preview, link and copy button', async ({ page }) => {
    await page.addInitScript(() =>
        localStorage.setItem('transbot:setup-clicked', String(Date.now())),
    )
    await page.goto('/')
    await page.getByLabel('pronouns.page username').fill('@found')
    await expect(page.getByText('transbot will teach: Sam, xe/xem')).toBeVisible()
    await expect(page.getByRole('link', { name: /\/@found$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('transbot:setup-clicked'))).toBeNull()
})

test('a missing card keeps the prompt open', async ({ page }) => {
    await page.addInitScript(() =>
        localStorage.setItem('transbot:setup-clicked', String(Date.now())),
    )
    await page.goto('/')
    await page.getByLabel('pronouns.page username').fill('nobody')
    await expect(
        page.getByText("We couldn't find that card yet. Cards show up once they're saved on pronouns.page."),
    ).toBeVisible()
    await expect(page.getByText(PROMPT)).toBeVisible()
})

test('a card with nothing marked yes says so', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'I have a pronouns.page card' }).click()
    await page.getByLabel('pronouns.page username').fill('empty')
    await expect(page.getByText("nothing on it is marked yes yet")).toBeVisible()
})

test('a slow earlier lookup never replaces the latest one', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'I have a pronouns.page card' }).click()
    const field = page.getByLabel('pronouns.page username')
    await field.fill('slow')
    await page.waitForTimeout(600)
    await field.fill('found')
    await expect(page.getByRole('link', { name: /\/@found$/ })).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(page.getByRole('link', { name: /\/@slow$/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /\/@found$/ })).toBeVisible()
})

test('the link builder makes a working practice link', async ({ page }) => {
    await mockPronounsPage(page)
    await page.goto('/')
    await page.getByLabel('Name', { exact: true }).fill('Sam Lee')
    await page.getByLabel('Pronouns', { exact: true }).fill('xe&she')
    const link = page.getByRole('link', { name: /\/practice#n=Sam\+Lee&p=xe%26she$/ })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByRole('heading', { name: 'Practice with Sam Lee' })).toBeVisible()
})
```

- [ ] **Step 6: Run them to see them fail**

Run: `bun run build && bunx playwright test landing.spec --project=mobile-chrome`
Expected: FAIL, the landing page has none of these controls.

- [ ] **Step 7: Write the landing page**

`src/pages/index.astro`:

```astro
---
import Layout from '../layouts/Layout.astro'
---

<Layout title="transbot">
    <section>
        <h1>Practice someone's name and pronouns</h1>
        <p>
            Someone shared this site so you can get comfortable with their name
            and pronouns before you talk. You fill in short sentences, and
            transbot shows the right form each time. Nobody keeps score.
        </p>
        <p>
            Got a link from a friend? Open it and start. Want a link for
            yourself? Make one below.
        </p>
    </section>

    <section aria-labelledby="share-heading">
        <h2 id="share-heading">Make your own link</h2>
        <div class="choices">
            <button
                type="button"
                id="have-card"
                class="secondary"
                aria-expanded="false"
                aria-controls="card-panel">I have a pronouns.page card</button
            >
            <button
                type="button"
                id="no-card"
                class="secondary"
                aria-expanded="false"
                aria-controls="setup-panel">I don't have one yet</button
            >
        </div>

        <div id="setup-panel" hidden>
            <p>
                <a
                    id="setup-link"
                    href="https://en.pronouns.page/account"
                    target="_blank"
                    rel="noopener">Set up your pronouns.page card</a
                > (opens in a new tab).
            </p>
            <p>The link builder below works without an account.</p>
        </div>

        <div id="card-panel" hidden>
            <div id="return-prompt" hidden>
                <p>Made your card? Enter your username to get your link.</p>
                <button type="button" id="not-now" class="secondary"
                    >Not now</button
                >
            </div>
            <label for="username">pronouns.page username</label>
            <input
                id="username"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
            />
            <div id="card-result" aria-live="polite"></div>
        </div>
    </section>

    <section aria-labelledby="builder-heading">
        <h2 id="builder-heading">Link builder</h2>
        <p class="hint">
            No account needed. The name stays in the link and never reaches
            transbot's server.
        </p>
        <form id="builder">
            <label for="b-name">Name</label>
            <input id="b-name" autocomplete="off" />
            <label for="b-pronouns">Pronouns</label>
            <input
                id="b-pronouns"
                list="common-sets"
                autocomplete="off"
                autocapitalize="none"
                aria-describedby="b-pronouns-hint"
            />
            <p id="b-pronouns-hint" class="hint">
                Type any set, like xe, she&xe or ae/aer/aer/aers/aerself. Type
                null to practice using just the name.
            </p>
            <datalist id="common-sets">
                <option value="xe"></option>
                <option value="she"></option>
                <option value="he"></option>
                <option value="they"></option>
                <option value="ze/zir"></option>
                <option value="fae/faer"></option>
                <option value="null"></option>
            </datalist>
            <div id="builder-result" aria-live="polite"></div>
        </form>
    </section>
</Layout>

<script>
    import '../scripts/landing'
</script>
```

The datalist options are only shortcuts; the field takes any text.

`src/scripts/landing.ts`:

```ts
import { cardLink, normalizeUsername, practiceLink } from '../lib/links'
import { summarize } from '../lib/pronouns/identity'
import type { Identity } from '../lib/pronouns/types'
import {
    clearSetup,
    isSetupPending,
    markSetupClicked,
    safeStorage,
} from '../lib/setup-flag'
import { el } from './dom'

type Lookup =
    | { kind: 'found'; identity: Identity }
    | { kind: 'not-found' }
    | { kind: 'error' }

const DEBOUNCE_MS = 400
const storage = safeStorage()

function byId<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id)
    if (!node) throw new Error(`#${id} is missing`)
    return node as T
}

const haveCard = byId<HTMLButtonElement>('have-card')
const noCard = byId<HTMLButtonElement>('no-card')
const cardPanel = byId('card-panel')
const setupPanel = byId('setup-panel')
const setupLink = byId<HTMLAnchorElement>('setup-link')
const returnPrompt = byId('return-prompt')
const notNow = byId<HTMLButtonElement>('not-now')
const username = byId<HTMLInputElement>('username')
const cardResult = byId('card-result')
const builder = byId<HTMLFormElement>('builder')
const builderName = byId<HTMLInputElement>('b-name')
const builderPronouns = byId<HTMLInputElement>('b-pronouns')
const builderResult = byId('builder-result')

function setOpen(button: HTMLButtonElement, panel: HTMLElement, open: boolean): void {
    panel.hidden = !open
    button.setAttribute('aria-expanded', String(open))
}

function copyButton(text: string): HTMLButtonElement {
    const button = el('button', { type: 'button', class: 'secondary' }, 'Copy link')
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(text)
            button.textContent = 'Copied'
        } catch {
            button.textContent = 'Copy failed, select the link instead'
        }
    })
    return button
}

function linkRow(href: string): HTMLElement {
    return el('p', { class: 'link-out' }, el('a', { href }, href), copyButton(href))
}

haveCard.addEventListener('click', () => setOpen(haveCard, cardPanel, cardPanel.hidden))
noCard.addEventListener('click', () => setOpen(noCard, setupPanel, setupPanel.hidden))
setupLink.addEventListener('click', () => markSetupClicked(storage, Date.now()))

function circleBack(): void {
    if (!isSetupPending(storage, Date.now())) return
    returnPrompt.hidden = false
    setOpen(haveCard, cardPanel, true)
    username.focus()
}

circleBack()
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') circleBack()
})
notNow.addEventListener('click', () => {
    clearSetup(storage)
    returnPrompt.hidden = true
})

function renderLookup(name: string, lookup: Lookup): void {
    if (lookup.kind === 'not-found') {
        cardResult.replaceChildren(
            el('p', {}, "We couldn't find that card yet. Cards show up once they're saved on pronouns.page."),
        )
        return
    }
    if (lookup.kind === 'error') {
        cardResult.replaceChildren(
            el('p', {}, "Couldn't reach pronouns.page. Try again in a moment."),
        )
        return
    }
    const summary = summarize(lookup.identity)
    if (summary.nothingToTeach) {
        cardResult.replaceChildren(
            el(
                'p',
                {},
                "Found your card, but nothing on it is marked yes yet, so there's nothing to teach. Mark a name or pronouns as yes on pronouns.page, then check again.",
            ),
        )
        return
    }
    clearSetup(storage)
    returnPrompt.hidden = true
    const parts: Node[] = []
    if (summary.teach.length) {
        parts.push(el('p', {}, `transbot will teach: ${summary.teach.join(', ')}`))
    }
    if (summary.accept.length) {
        parts.push(el('p', {}, `Also accepted: ${summary.accept.join(', ')}`))
    }
    if (summary.askMe) {
        parts.push(el('p', {}, 'Visitors will see a note to ask about pronouns.'))
    }
    parts.push(linkRow(cardLink(name, window.location.origin)))
    cardResult.replaceChildren(...parts)
}

let latest = 0
let timer: ReturnType<typeof setTimeout> | undefined

async function lookup(): Promise<void> {
    const id = ++latest
    const name = normalizeUsername(username.value)
    if (!name) {
        cardResult.replaceChildren()
        return
    }
    cardResult.replaceChildren(el('p', {}, 'Checking pronouns.page...'))
    let result: Lookup
    try {
        const res = await fetch(`/api/card/${encodeURIComponent(name)}`)
        if (res.status === 404) result = { kind: 'not-found' }
        else if (!res.ok) result = { kind: 'error' }
        else result = { kind: 'found', identity: (await res.json()).identity }
    } catch {
        result = { kind: 'error' }
    }
    // A slower, older lookup must not replace the newest one.
    if (id !== latest) return
    renderLookup(name, result)
}

username.addEventListener('input', () => {
    clearTimeout(timer)
    timer = setTimeout(() => void lookup(), DEBOUNCE_MS)
})

function updateBuilder(): void {
    const link = practiceLink(
        builderName.value,
        builderPronouns.value,
        window.location.origin,
    )
    builderResult.replaceChildren(...(link ? [linkRow(link)] : []))
}

builderName.addEventListener('input', updateBuilder)
builderPronouns.addEventListener('input', updateBuilder)
builder.addEventListener('submit', (event) => {
    event.preventDefault()
    updateBuilder()
})
```

- [ ] **Step 8: Run the tests to see them pass**

Run: `bun run build && bunx playwright test landing.spec site.spec`
Expected: PASS (12 tests x 2 projects).

- [ ] **Step 9: Commit**

```bash
bun run format && bun run lint && bun run check && bun run test:unit
git add -A
git commit -m "feat: landing page with card check, setup reminder and link builder"
```

---

### Task 10: Accessibility checks, README and full verification

**Files:**
- Create: `test/e2e/a11y.spec.ts`, `README.md`

**Interfaces:**
- Consumes: `mockPronounsPage`; every route.
- Produces: the `a11y` Playwright project's tests (run by `test:e2e:a11y` in CI on `main`).

- [ ] **Step 1: Write the a11y tests** (`test/e2e/a11y.spec.ts`)

```ts
import AxeBuilder from '@axe-core/playwright'
import { type Page, expect, test } from '@playwright/test'
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
    await page.getByRole('button', { name: 'I have a pronouns.page card' }).click()
    await page.getByRole('button', { name: "I don't have one yet" }).click()
    await page.getByLabel('Name', { exact: true }).fill('Sam')
    await page.getByLabel('Pronouns', { exact: true }).fill('xe')
    await expectNoViolations(page)
})

test('/practice has no axe violations, with feedback shown', async ({ page }) => {
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
```

- [ ] **Step 2: Run them**

Run: `bun run build && bun run test:e2e:a11y`
Expected: PASS (7 tests). If axe reports a violation, fix the markup or CSS it names (most likely color contrast in `global.css` or a missing label), not the test.

- [ ] **Step 3: Write `README.md`**

```markdown
# transbot

[transbot.net](https://transbot.net) is a place to practice someone's name and pronouns. A person shares a link, and visitors fill in short sentences. transbot shows the right form each time and never keeps score.

- `/practice#n=<name>&p=<pronouns>`: a link anyone can make. The name stays in the URL fragment and never reaches the server.
- `/@<username>`: practice from a [pronouns.page](https://en.pronouns.page) card. Only entries marked yes, meh or no are used. Private custom opinions, "close" and "jokingly" are filtered out on the server.

Design: `docs/superpowers/specs/2026-10-12-transbot-design.md`.

## Develop

    mise install
    bun install
    bun run dev

## Test

    bun run test:unit        # Vitest, core logic
    bun run build
    bun run test:e2e:full    # Playwright against astro preview
    bun run test:e2e:a11y    # axe at phone width

Tests never call the live pronouns.page API. Pronoun-set fixtures live in `test/fixtures/api/pronouns` and are refreshed by hand with `bun run fixtures:refresh`. Profile fixtures are synthetic: never copy a real profile into the repo.

## Credits

Pronoun data comes from [pronouns.page](https://en.pronouns.page), used under the [Opinionated Queer License v1.4](https://en.pronouns.page/license).
```

- [ ] **Step 4: Full verification**

Run: `bun run format && bun run lint && bun run check && bun run test:unit && bun run build && bun run test:e2e:full && bun run test:e2e:a11y && bun run check:licenses`
Expected: every command exits 0. Paste the summary lines (test counts) into the PR description.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: axe checks for every route; add README"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| Opinion mapping, private custom opinions | 4 (filter), 5 (never graded), 6 and 8 (server-side only) |
| Special values `null`, `:void`, `ask-me` | 4, 5, 7, 8 |
| Ordering (first `yes` set modeled, no overrides) | 4 |
| Stack (bun, Astro, Cloudflare, Biome, Vitest, Playwright, axe, voidflow) | 1, 10 |
| Routes `/`, `/practice`, `/@username`, `/api/card`, `/tara` | 9, 7, 8, 8, 8 |
| Cache about an hour, never cache not-found | 6 |
| Sharing flow (two choices, new tab, local flag, circle back, found/not-found/nothing-to-teach, 14-day expiry) | 9 |
| Core module `client`, `identity`, `check` | 2, 4, 5 (plus `drills` 3 and `load` 6) |
| Drill flow (sandwich trio, xyrs and xemself lines, shuffled examples, typed answers, feedback with pronunciation, free typing) | 3, 7 |
| Rules from trans-rights (no inference, free-text input, only published data) | 4, 5, 9 |
| Privacy (no analytics, nothing logged, name stays in the fragment) | 1 (observability off), 7 (e2e) |
| Testing (fixtures, checker cases, e2e per route, axe at phone width, sharing flow) | 2 to 10 |
| OQL attribution | 1 |
| Phase 2 | out of scope |
