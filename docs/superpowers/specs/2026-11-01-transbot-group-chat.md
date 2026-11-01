# transbot phase 2: group chat practice

Date: 2026-11-01 (first draft 2026-10-13). Status: approved direction, refreshed after #6, #7 and #9. Issue: #2. Follow-ons: #5 (share from the chat), #11 (share from the builder), #14 (ask-page picker, shorter links).

## Goal

Replace the typed drills with a simulated group chat, styled like iMessage. The visitor sits in a chat with two made-up friends who are planning something with the person (the one whose name and pronouns are being practiced). The friends use the person's name and pronouns naturally. When it's the visitor's turn, a pre-written reply sits in the compose bar and the visitor taps send. They can't edit it and don't choose between options: saying it is the practice.

Why: typed answers feel like homework and are awkward on phones. Reading correct usage in a familiar setting and "saying" it yourself is lower effort and closer to real life.

## Decisions

- **Scripted, no LLM.** Scenes are hand-written templates filled in the browser from the identity. No API cost, no Turnstile or rate limits, nothing is sent to a third party, and nothing can misgender the person. The LLM plan in #2 (OpenRouter route, regenerate loop, abuse controls) is parked. Most of #2's open questions (other people's pronouns, invented facts, model cost, correction tone) no longer apply.
- **Privacy.** Unchanged from today: `/practice/<name>?p=…` links (the builder's default since #9) show the name to transbot's server, legacy `/practice#n=…` links don't, and `/profile/<username>` reads a public card. The chat adds no new requests.
- **Drills are removed entirely.** The sandwich lines, example-sentence blanks, free-typing round and checker UI go away.
- **Modeled set:** the first `yes` set, as today. `meh` sets are listed as "Also fine" in the forms box and never used in chat.
- **No corrections, no scores.** There is nothing to get wrong.
- **The landing page link builder stays** as it is. It already validates each value against pronouns.page (#7).

## Identity rules (changes to phase 1)

- **Name with no pronouns means use the name.** If there is a preferred name and no `yes` pronoun set (`/practice/Tara?p=null`, a card with names but no `yes` pronouns), the chat uses the name set: Tara / Tara / Tara's / Tara's / Taraself. Same forms as an explicit `null` set today.
- **Pronouns with no name.** `{name}` slots read "our friend" ("Our friend" at sentence start).
- **`ask-me` as the first `yes` entry:** only the note "Please ask Tara which pronouns to use." No chat. `ask-me` elsewhere: the note plus the chat, as today.
- **Unknown pronouns** (a hand-edited link pronouns.page doesn't recognize): no chat, no guessing, and no "check the spelling" copy. Neutral message: "pronouns.page doesn't have these pronouns yet, so there's nothing to practice here." plus a link to make a practice link.
- **Plural agreement.** `PronounSet` gains `plural: boolean`, taken from pronouns.page's `plural` array (per set in compound values like `xe&she`). Name sets and `:void` are singular. A set whose subject is "they" is always plural, whatever the API says. (#7 already maps written-out common sets such as `they/them/their/theirs/themself` back to their short value.)
- `Identity.templates` and the example-sentence `templatize` step are removed with the drills.

## Page

`/practice/<name>`, `/practice` (legacy fragment) and `/profile/<username>` render the same component, top to bottom:

1. **Header:** "Practice with Tara" ("Practice" with no name).
2. **Forms box, collapsed:** a `<details>` whose summary reads "Tara: xe/xem". Expanded: the five forms of the modeled set with IPA pronunciations where pronouns.page has them, plus "Also fine: she/her" for other `yes` sets and `meh` sets. Nothing in it is typed or graded.
3. **ask-me note** when applicable.
4. **Group chat panel:**
   - Header bar: the group name ("Lunch crew"), avatars with initials for the two friends, and "You".
   - Friend bubbles: gray, left, sender's name above the first bubble in a run.
   - Visitor bubbles: blue, right, "Delivered" under the latest one.
   - Compose bar: shows the pre-written reply when it's the visitor's turn, and a round send button (accessible name "Send"). Between turns the compose bar is empty and the button is `aria-disabled`.
5. **End of scene:** a "Next chat" button. **End of session:** "That's it. You're ready to talk about Tara." and a "Start over" button. Share actions are #5.

`/practice/<name>` with no `p` keeps asking for pronouns first, using the landing page's multi-select picker (#14 item 1).

All text goes through `textContent`. Copy has no em dashes or unicode arrows.

## Flow

- Scenes play in a fixed order, 4 per session.
- Friend bubbles auto-play. Each one is preceded by a typing indicator for `clamp(600 + 25 * length, 800, 1800)` ms.
- Playback pauses at a `me` line: the reply appears in the compose bar and the send button gets a gentle pulse. Tapping send moves it into the thread, then playback resumes.
- `prefers-reduced-motion`: no typing dots, no pulse, and bubbles up to the next visitor turn appear at once.
- The thread is `role="log"` (polite live region), so each new message is announced. The send button uses `aria-disabled` rather than `disabled`, so focus stays on it between turns and keyboard or screen reader users can keep pressing it.
- The thread scrolls to keep the newest bubble in view. The page body never scrolls sideways at 360px.

## Friends

- Two first names per scene, drawn from a fixed pool, never equal (case-insensitive) to each other or to the person's name.
- Pool makeup: about half gender-ambiguous or enby names (Alex, Sam, Jordan, Riley, Quinn, Avery, Rowan, Sage, Kai, River, Jules, Robin). The rest about two thirds femme (Priya, Maya, Nina, Lucía, Hana, Zoe, Imani, Leah) and one third masc (Marcus, Theo, Diego, Omar).
- Scripts never refer to a friend with a third-person pronoun. The only third-person pronouns on screen are the person's.

## Scene format

`src/lib/scenes/scenes.ts`, plain data:

```ts
type Line = { from: 'a' | 'b' | 'me'; text: string }
type Scene = { id: string; group: string; lines: Line[] }
```

Template slots in `text`:

- `{name}`: preferred name, or the "our friend" fallback.
- `{pronoun_subject}`, `{pronoun_object}`, `{possessive_determiner}`, `{possessive_pronoun}`, `{reflexive}`.
- Verb pairs `{singular|plural}`, for example `{does|do}`, `{is|are}`, `{likes|like}`: the first word for singular sets, the second for plural.
- Capitalized at sentence start (`src/lib/scenes/template.ts`).

Writing rules for scenes:

- No contractions on pronoun or name slots ("xe is", not "xe's"), since "they's" and "Tara's" (for "Tara is") break.
- Keep lines short enough for one or two bubble lines on a phone.
- No facts about the real person. Everything is plainly made-up small talk: lunch plans, a gift, running late.

`renderScene(scene, person, friends)` returns `{ group, lines: { from, sender, text }[] }` with plain strings.

### Coverage rule (unit-tested)

Across the 4 scenes, each of the five forms appears at least once in a `me` line and at least once in a friend line. `{name}` appears in every scene.

### Starter scenes

1. **Lunch crew:** planning Saturday lunch.
2. **Birthday gift:** picking a present. Covers `possessive_pronoun` and `reflexive`.
3. **Running late:** meeting before a show. Covers `pronoun_subject` and `possessive_determiner`.
4. **Moving day:** helping carry boxes. Covers `pronoun_object` and `reflexive`.

## Delivery

Three PRs, each green on its own:

1. **Library.** `plural` on `PronounSet`; `src/lib/scenes/{template,render,friends,scenes}.ts` with `chatPerson(identity)` (applies the name-only fallback and the "our friend" name), the 4 scenes and unit tests. Additive: the drills keep working on `modeledSet` and `templates`.
2. **UI.** `src/scripts/chat-ui.ts`, chat styles in `global.css`, forms box, ask-me note, neutral unknown-pronouns copy, the picker on the ask page, and e2e at mobile width plus axe. The drills stop rendering.
3. **Removal.** `drills.ts`, `check.ts`, `Identity.templates`, the drill and free-typing UI and their tests. Hero copy on `/` ("fill-in-the-blank sentences") changes to "a short pretend group chat".

## Testing

- Unit: verb agreement for xe, they, a name set, `:void` and a compound set; "our friend" fallback and its capitalization; the name-only fallback set; the coverage rule; friend names never colliding with the person's name or each other; no contraction after a pronoun or name slot in any scene (lint-style test over the scene data).
- E2E (pronouns.page mocked, mobile width): play a full scene by tapping send; "Next chat" through to the end message; reduced motion shows bubbles without delay; `ask-me`-only and unknown-pronoun pages show no chat; `/profile/<username>`, `/practice/<name>` and `/practice#…` all render the chat; axe passes.
- Old drill e2e tests are deleted.

## Out of scope

- LLM-generated scenes (could fill the same scene format later).
- Sharing and "make your own" (#5, #11).
- Link format changes (#14 item 3).
- Vanity slugs.
