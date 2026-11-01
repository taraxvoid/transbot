# Contributing

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach.

## Setup

    mise install
    bun install
    bun run dev

## Checks

Run these before opening a PR:

    bun run lint
    bun run test:unit
    bun run build
    bun run test:e2e:full

`bun run test` runs the type check, unit tests, and e2e together. Use `bun run format` to fix formatting.

## Conventions

- Tests never call the live pronouns.page API. Use the fixtures in `test/fixtures`.
- Profile fixtures must be synthetic. Never copy a real person's profile into the repo.
- Add or update tests with behavior changes, including accessibility (`bun run test:e2e:a11y`) for UI changes.
- Keep PRs focused, with a short description of what changed and why.

## Licensing

Your contributions are licensed under the [MIT License](LICENSE), the same as the rest of the code.

The pronoun-set fixtures in `test/fixtures/api/pronouns` are pronouns.page data and stay under the [Opinionated Queer License v1.4](https://en.pronouns.page/license). If you refresh them, keep them unmodified apart from what `bun run fixtures:refresh` produces.

## Conduct

Be chill.
