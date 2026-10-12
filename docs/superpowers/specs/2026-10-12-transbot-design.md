# transbot design

Date: 2026-10-12. Status: approved design, ready for an implementation plan.

## Goal

transbot.net is a site where kind but inexperienced people practice someone else's name and pronouns. Tara hands out a link (`transbot.net/tara`). The visitor practices xyr name and pronouns, and the site gently catches slip-ups.

The core drill is the sandwich line: "xe bought a sandwich, I ate xyr sandwich, I bought xem a new sandwich." Two more lines cover the remaining forms: "the sandwich is xyrs" and "xe made it xemself."

## Prior art

- Practice with Pronouns (practicewithpronouns.com) and the Minus18 pronoun tool: static fill-in-the-sentence practice.
- Gender-Neutral Pronoun Practice (Android): about 600 drill sentences, 70+ neopronouns.
- Discord bots that refer to members by their pronouns.
- "Misgendering as Breakdown in Human-Machine Communication" (arXiv 2609.18186): companion chatbots misgender users even when they set persona fields, pin info or correct the bot. Takeaway: never rely on a prompt alone. A deterministic checker decides what is correct.

Nothing found does conversational practice of a specific person's identity from a shareable link.

## Decisions

- **Mode:** practice for others. The visitor is the one being corrected. Corrections are gentle: show the right form and move on. No scores, streaks or shaming.
- **Phases:** phase 1 is scripted drills with no LLM. Phase 2 adds an LLM conversation through OpenRouter.
- **Identity source:** pronouns.page (`https://en.pronouns.page/api/public/v3`). It's CORS `*` and needs no auth for public routes. It's licensed under the Opinionated Queer License v1.4. Tara has accepted the license, and it requires attribution on the site. This repo has no connection to RavenFlight.
- **Mixed sets:** any listed set is correct, and the site models the first one. Secondary means valid, and hearing the preferred set repeated does the teaching without corrections.
- **Domain:** transbot.net. `/tara` is an alias for `/@taravie`.

## Opinion mapping

pronouns.page tags each name and pronoun set with an opinion.

| Opinion | Behavior |
|---|---|
| `yes` | Taught and modeled. The first `yes` set is the one the site uses. |
| `meh` | Accepted when the visitor uses it, never taught. |
| `close` | "Only if we're close." Ignored and never shown. A stranger from a link isn't close. |
| custom opinions | Private. Dropped entirely (see below). |
| `no` | Flagged. Feedback never repeats the avoided value, it only states the right one ("xyr name is Tara"). |

`jokingly` is open: proposed to be treated like `close`, not yet confirmed.

**Custom opinions are private.** Any opinion that isn't a built-in key is dropped before the data reaches the browser: in the Worker for `/@username`, at build time for anything prerendered. Dropped entries are never displayed, taught or graded. If a visitor happens to type one, the checker doesn't react, because any reaction (even "xyr name is Tara") would confirm that the entry exists. The rule matches on "not a built-in key", so new custom opinions are private by default.

## Special pronoun values

Resolved locally, since the API doesn't return forms for them:

- `null`: use the name instead of pronouns. Drills use the name in every pronoun slot.
- `:void`: void / void / void's / void's / voidself.
- `ask-me`: no drills. A short note says to ask the person.

## Ordering

The site models the first `yes` set as listed on pronouns.page. There are no per-alias overrides. Tara's card currently lists `she&xe` and is being reordered to `xe&she` at the source, which matches xyr stated preference (xe first, she secondary).

## Stack

bun, Astro with `@astrojs/cloudflare`, Biome, Vitest, Playwright and axe, `@taraxvoid/voidflow` site-ci (`single-environment: true`). Deployed to Cloudflare Workers. Pages are prerendered except the routes that need the server. Follows synthomaha's setup.

## Routes

- `/`: explains the site, has a link builder (name plus pronoun shorthand, or a pronouns.page username), and credits pronouns.page per the OQL.
- `/practice#n=<name>&p=<shorthand>`: static. Reads the fragment in the browser and fetches `/pronouns/<p>` from pronouns.page directly. The name never reaches our server. `p` uses pronouns.page's shorthand (`xe`, `xe&she`, or written out like `ae/aer/aer/aers/aerself`).
- `/@<username>`: server-rendered. Fetches the pronouns.page profile, applies the opinion mapping and private-opinion filtering, and caches the result for about an hour with the Cache API.
- `/tara`: alias for `/@taravie`.

## Core module

`src/lib/pronouns/`, framework-free and fully unit-tested.

- `client.ts`: typed pronouns.page calls (`/pronouns/<p>`, `/profile/get/<username>`). `/pronouns/xe&she` returns all five forms per set, IPA pronunciations and about 20 example sentences.
- `identity.ts`: turns a fragment or profile into `{ names: { preferred, accepted, avoid }, sets: [...] }`. Applies the opinion mapping, drops custom opinions, resolves special values.
- `check.ts`: the deterministic checker.
  - Fill-in-the-blank: each blank knows its expected form (subject, object, possessive determiner, possessive pronoun, reflexive). An answer is correct if it matches that form in any accepted set, ignoring case. Mixing sets within one sentence is allowed.
  - Free typing: flags third-person pronouns not in an accepted set, and names marked `no`. Feedback is soft ("Tara uses xe/xem, try *xem*?") because "her" might refer to someone else.

## Drill flow (phase 1)

1. The sandwich trio, then the "xyrs" and "xemself" lines.
2. Shuffled pronouns.page example sentences with blanks.
3. Answers are typed, not multiple choice. Every answer gets immediate feedback showing the correct form and its pronunciation, then the drill moves on.
4. Optional free-typing round ("tell me what Tara did this weekend"), run through the checker.

## Phase 2 (separate spec later)

- `/api/chat` Worker route calling OpenRouter with plain `fetch` and multi-turn `messages`, with `usage.include` for cost. Written fresh, modeled on the pattern in rvnflt's `packages/providers/src/openrouter.ts`. No RavenFlight code is copied.
- The checker runs on both the visitor's message and the bot's reply. A bot reply that fails the check is regenerated before it's shown.
- Turnstile plus a per-IP rate limit.
- Self-serve vanity slugs in KV, mapping `transbot.net/<slug>` to a pronouns.page username.

## Rules carried over from the trans-rights skill

- Never infer pronouns from a name.
- Never ask about the person's gender identity, and never suggest names or pronouns.
- Free-text pronoun input. Common sets are shortcuts, not a closed list.
- A shared link exposes only what the person chose to publish.
- Later: a shared `identity-rules.md` used by both the skill and the phase 2 system prompt, so they don't drift apart.

## Privacy

No analytics on what anyone types. Profiles are cached, and nothing about practice sessions is logged. Fragment links keep the name out of server logs. Phase 2 chat requests will include it.

## Testing

- pronouns.page responses are saved as JSON fixtures, so CI never calls the live API.
- Checker tests cover the trans-rights Common Mistakes cases: names with no pronoun inference, mixed sets, `no` names, irregular neopronouns, the special values, and private custom opinions (never shown, never graded).
- E2E tests for every route, plus axe accessibility checks at mobile width.
