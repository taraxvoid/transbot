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
| `jokingly` | Ignored and never shown, same as `close`. |
| custom opinions | Private. Dropped entirely (see below). |
| `no` | Dropped, like custom opinions: never sent to the browser, displayed, taught or graded. These are often deadnames, and transbot doesn't republish them. |

**Custom opinions are private.** Any opinion that isn't a built-in key is dropped before the data reaches the browser: in the Worker for `/@username`, at build time for anything prerendered. Dropped entries are never displayed, taught or graded. If a visitor happens to type one, the checker doesn't react, because any reaction (even "xyr name is Tara") would confirm that the entry exists. The rule matches on "not a built-in key", so new custom opinions are private by default.

## Special pronoun values

Resolved locally, since the API doesn't return forms for them. They follow the opinion mapping like any other entry:

- `null`: use the name instead of pronouns. As `yes`, drills use the name in every pronoun slot. As `meh`, the checker accepts the name in a pronoun slot but drills don't teach it.
- `:void`: void / void / void's / void's / voidself.
- `ask-me`: when it's the first `yes` entry, there are no drills, only a short note to ask the person. Anywhere else, the page shows that note alongside the drills for the `yes` sets.

## Ordering

The site models the first `yes` set as listed on pronouns.page. There are no per-alias overrides. Tara's card lists `xe&she` (reordered 2026-10-12 to match xyr stated preference, xe first and she secondary).

## Stack

bun, Astro with `@astrojs/cloudflare`, Biome, Vitest, Playwright and axe, `@taraxvoid/voidflow` site-ci (`single-environment: true`). Deployed to Cloudflare Workers. Pages are prerendered except the routes that need the server. Follows synthomaha's setup.

## Routes

- `/`: explains the site, has a link builder (name plus pronoun shorthand, or a pronouns.page username), and credits pronouns.page per the OQL.
- `/practice#n=<name>&p=<shorthand>`: static. Reads the fragment in the browser and fetches `/pronouns/<p>` from pronouns.page directly. The name never reaches our server. `p` uses pronouns.page's shorthand (`xe`, `xe&she`, or written out like `ae/aer/aer/aers/aerself`).
- `/@<username>`: server-rendered. Fetches the pronouns.page profile, applies the opinion mapping and private-opinion filtering, and caches the result for about an hour with the Cache API. "Profile not found" results are never cached, so someone who just made a card isn't stuck with a stale miss.
- `/api/card/<username>`: server route returning the filtered identity as JSON. Same code path and cache as `/@<username>`, used by the landing page preview. The browser never fetches raw profiles, so private entries never reach it.
- `/tara`: alias for `/@taravie`.

## Sharing your own card

transbot is a passthrough to pronouns.page: it stores no identities. Anyone with a pronouns.page card shares `transbot.net/@<username>`, with no sign-up. Edits to the card show up once the cache expires (about an hour).

Landing page flow:

1. **Name and pronouns first.** The main call to action is the fragment link builder (name plus pronoun shorthand), which needs no account. Below it, an always-open "Already on pronouns.page?" section takes a username or pasted profile URL. A "set up a pronouns.page card" link to `https://en.pronouns.page/account` opens in a new tab (`target="_blank" rel="noopener"`) as an optional extra, not a required step.
2. **Remember the click locally.** Clicking the setup link sets a `localStorage` flag with a timestamp. It never leaves the browser, so transbot doesn't know who signed up. Storage access is wrapped in try/catch, and the page works without it.
3. **Circle back.** When the flag is set and the tab becomes visible again (`visibilitychange`), or on a later visit, the page shows "Made your card? Enter your username to get your link" and focuses the username field. A "not now" button dismisses it. The flag expires after 14 days.
4. **Check the card.** As the visitor types (debounced), the page calls `/api/card/<username>`:
   - **Found:** a preview of what transbot will teach and accept (private, `close` and `jokingly` entries already removed), the `transbot.net/@<username>` link and a copy button. The flag is cleared.
   - **Not found:** "We couldn't find that card yet. Cards show up once they're saved on pronouns.page." The prompt stays open.
   - **Found but nothing to teach** (no `yes` name or pronoun set): says so, so the visitor can fix the card before sharing.

The username field and preview are also useful to existing users, as a "check my card" step before sharing.

Profiles are read from `en.pronouns.page` only. Other locales would need a locale in the URL (not in scope).

## Core module

`src/lib/pronouns/`, framework-free and fully unit-tested.

- `client.ts`: typed pronouns.page calls (`/pronouns/<p>`, `/profile/get/<username>`). `/pronouns/xe&she` returns all five forms per set, IPA pronunciations and about 20 example sentences.
- `identity.ts`: turns a fragment or profile into `{ names: { preferred, accepted, avoid }, sets: [...] }`. Applies the opinion mapping, drops custom opinions, resolves special values.
- `check.ts`: the deterministic checker.
  - Fill-in-the-blank: each blank knows its expected form (subject, object, possessive determiner, possessive pronoun, reflexive). An answer is correct if it matches that form in any accepted set, ignoring case. Mixing sets within one sentence is allowed.
  - Free typing: flags third-person pronouns not in an accepted set. Feedback is soft ("Tara uses xe/xem, try *xem*?") because "her" might refer to someone else. A note may quote the word the visitor typed, since that's the visitor's own text and reveals nothing from the card.

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
- Checker tests cover the trans-rights Common Mistakes cases: names with no pronoun inference, mixed sets, `no` names (never shipped, never flagged), irregular neopronouns, the special values, and private custom opinions (never shown, never graded).
- E2E tests for every route, plus axe accessibility checks at mobile width.
- E2E for the sharing flow: setup link opens in a new tab, the prompt appears on return, and the found, not-found and nothing-to-teach states (API mocked).
