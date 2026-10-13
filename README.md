# transbot

[transbot.net](https://transbot.net) is a place to practice someone's name and pronouns. A person shares a link, and visitors fill in short sentences. transbot shows the right form each time and never keeps score.

- `/practice#n=<name>&p=<pronouns>`: a link anyone can make. The name stays in the URL fragment and never reaches the server.
- `/@<username>`: practice from a [pronouns.page](https://en.pronouns.page) card. Only entries marked yes or meh are used. Names marked no, private custom opinions, "close" and "jokingly" are filtered out on the server and never reach the browser.

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
