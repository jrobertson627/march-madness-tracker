# Frontend decisions

Short records. Each says what was chosen, what it gives up and what would change it. The model and API decisions are in the API repository's `docs/decisions.md`.

## 1. The app displays; the API computes (2026-11-10)

Win probabilities, projected scores, factor effects, bracket odds and picks all come from the API. The app formats and arranges them. The one exception is the older
weights page, kept on its own tab ("Try your own weights") and labeled as a formula the person controls, not the model.
Gives up: that page cannot show the model's output. Would change if a live "build your own model" feature were wanted, which would need its own design.

## 2. A typed client with start-up handling, not a data library

`src/services/v1/client.ts` does the fetch with a timeout, cancellation and a retry only for network errors, timeouts and 502, 503 and 504, with a growing pause. A 4xx is never
retried. `useApi` reports loading, waking (a request still pending after four seconds), error and data, keeps the last answer while a new one loads, and ignores a late
answer from a request that was replaced. No data-fetching library was added: the app has four pages and one request per page.
Gives up: no shared cache across pages beyond a five-minute copy of the season and team lists. Would change if the pages grew many overlapping requests.

## 3. Types are written by hand and checked against real responses

The response types in `src/services/v1/types.ts` follow the API's `docs/api.md`. The API's sample responses are copied into `src/fixtures/`, and `fixtures.ts` checks each against its
type when the app is built (a response with a field missing, or a number where a string is expected, fails the build). Gives up: not generated, so a new field needs a manual type edit.
Would change if the number of response shapes doubled, when generating from the JSON Schemas would pay for the extra build step.

## 4. Bracket layout: four regions at once on wide screens, region tabs below that

At 1700 px and wider all four regions show two across with the Final Four under them. Narrower, a tab for each region and one for the Final Four, and on a phone the rounds
stack. A mirrored tree with the Final Four in the middle was tried first and dropped: at common screen widths each game card was too narrow to read a team name.

## 5. What-if: a list of locked games, shareable in the link

A game can be locked once both of its teams are known (every first-round game without a First Four team, a game whose First Four game is locked, a later game whose two
earlier games are locked). That is the rule the API enforces with a 422, so the app does not send a result the API would refuse. Changing or undoing a choice removes the
locks that depended on it. Locks are sent 300 ms after the last click, as one request, and the previous bracket stays on screen, dimmed, until the answer arrives.
The locks are kept in the link (`?lock=1-3:duke,...`), capped at 67 (a whole tournament including the First Four), and anything that does not parse is ignored.
Gives up: a Final Four winner cannot be chosen before the earlier rounds. Would change if people ask to pick a whole path at once.

## 6. The backtest page keeps the scored-once season apart

The 2022 to 2025 seasons were used to choose the design and 2026 was scored once afterwards, so the page shows them in separate panels with separate sample sizes and never pools them.
Differences against a baseline carry their interval, and the text says when the interval includes zero. The summary is written from the report's numbers and never says the
model is better than a baseline. Pick, upset pick, lock and winner are written in words, not only color.

## 7. No chart library

Bars are drawn with CSS and the numbers are always written next to them. Would change if a page needs a real time series or a scatter plot.

## 8. Dependencies

Vitest 5 and Testing Library were added for tests. Vitest 3 had critical advisories in its test runner, so the version with the fixes was used (this needed Vite 6.4).
react-router was updated within its allowed range because the earlier version had a high advisory (open-redirect XSS). The remaining `npm audit` findings are in
development tools that were already in the project (ESLint, Babel and similar); `npm audit fix --force` was not run because it makes breaking upgrades.

## 9. Seasons without a bracket

A season in progress has ratings and no field until Selection Sunday. `/v1/seasons` says which seasons have a bracket (`has_bracket`). The bracket page opens on the
newest season that has one, lists only those seasons, and for a season without one says when the field is announced and links to the comparison page, rather than asking
the API for a bracket it does not have. It waits for the season list before asking for a bracket, which costs one extra short request on the first visit and avoids a
request that is sure to fail. The comparison page still defaults to the newest season, and its badge says "season in progress" with the date of the ratings.

## 10. Checks on every change

GitHub Actions runs lint, the tests and the build on every push to `main` and every pull request (Node 22), plus a report-only `npm audit --omit=dev`. The build runs
`tsc -b`, which also checks the fixtures against the API types. Render should deploy the static site only after these pass (the "After CI checks pass" auto-deploy
setting in the Render dashboard).
