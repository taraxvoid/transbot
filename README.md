# transbot

[transbot.net](https://transbot.net) is a place to practice someone's name and pronouns. A person shares a link, and visitors practice in a short pretend group chat that uses the right name and pronouns. Nobody keeps score.

- `/practice/<name>?p=<pronouns>`: a link anyone can make. Join sets with `+` (`?p=he+they`); the first is the one practiced. Full sets keep their slashes (`?p=ae/aer/aer/aers/aerself`). Without `p`, the page asks for pronouns. The name is in the URL path, so the server can see it.
- `/profile/<username>`: practice from a [pronouns.page](https://en.pronouns.page) card. Only entries marked yes or meh are used. Names marked no, private custom opinions, "close" and "jokingly" are filtered out on the server and never reach the browser.

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

The code is [MIT](LICENSE) licensed.

## Credits

Pronoun data comes from [pronouns.page](https://en.pronouns.page), used under the [Opinionated Queer License v1.4](https://en.pronouns.page/license). That data is not covered by the MIT license: this includes the copies in `test/fixtures/api/pronouns`, which stay under the Opinionated Queer License.
