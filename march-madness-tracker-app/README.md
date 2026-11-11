# March Madness Tracker (web app)

React 19, TypeScript, Vite, MUI 7 and React Router 7. It shows the predictions served by the prediction API
([api-march-madness-tracker](https://github.com/jrobertson627/api-march-madness-tracker), see its `docs/api.md`). The app only displays what
the API returns. It never computes a probability itself, except on the "Try your own weights" tab, which is a separate formula you control and is
labeled as not being the model.

## Pages

| Route | What it shows | API calls |
|---|---|---|
| `/welcome` | Pick a season and two teams | `GET /v1/seasons`, `GET /v1/teams?season=` |
| `/compare?teamA=&teamB=&season=` | Chance for each team, projected score, and what drives the difference. A second tab keeps the older weights sliders. | `GET /v1/predict/matchup` |
| `/bracket/:season` | Every game with projected score and head-to-head chance, three kinds of picks, chance of reaching each round. **What if** mode: press a team to lock it as the winner and the odds update. For a played season, what actually happened. | `GET /v1/bracket/{season}`, `POST /v1/bracket/{season}/odds` |
| `/backtest` | How the model did on past tournaments against simple baselines. The season scored once (2026) is kept apart from the seasons used to choose the design. | `GET /v1/backtest` |

Bracket links keep their state: `?picks=`, `?scoring=` and `?lock=1-3:duke,1-0:houston` (round, game, winner) so a what-if scenario can be sent as a link.
A game can be locked once both its teams are known, which is also what the API accepts.

## Run it

```bash
cd march-madness-tracker-app
npm ci
cp .env.example .env     # VITE_API_BASE_URL, default http://localhost:5000
npm run dev              # http://localhost:5173
```

To run against a local copy of the API, start it from the API repository on its file store (CORS already allows `localhost:5173`):

```bash
STORE=files python app.py
```

| Script | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Vitest, once. `npm run test:watch` while editing. |

## Settings

`VITE_API_BASE_URL` is the API's address with no trailing slash. It is **public**: Vite puts it in the built files, so never put a secret in a `VITE_` variable.
It is read at build time, so changing it on the host means a new build. The API must allow this site's address in its `CORS_ORIGINS`, exactly as the
browser shows it (scheme and host, no path, no trailing slash). A missing entry shows up as every request failing in the browser console with a CORS error.

## The server may be asleep

On the free hosting plan the API sleeps when nobody has used it for a while, and the first request can take most of a minute. The app asks the API to wake as soon as it
opens (`useWarmUp`), says "The server is starting up" if a request takes longer than four seconds (`useApi`), retries the usual start-up failures (502, 503, 504 and
network errors) with a growing pause, and shows a plain error with Retry if it gives up. A request is never retried when the answer was a 4xx.

## Where things are

```
src/services/v1/   client.ts (fetch with timeout, cancel and retry; one ApiError) and types.ts (response types)
src/hooks/         useApi (loading, waking, error, data), useWarmUp, useSeasons, useDebounced
src/utils/         bracketModel.ts (bracket shape and the what-if rules), lockState.ts (locks in the link), format, factors, backtestSummary
src/components/    ModelBadge, StatusBanner, WinBar, FactorBars, BracketGame, RegionBracket, TitleOdds, SeasonSelect, AppShell
src/pages/         initial-search, compare, bracket, backtest
src/fixtures/      real API responses (from the API's sample data) used by the tests
```

## Tests and fixtures

Tests run against `src/fixtures/*.json`, which are copies of the API repository's `docs/examples/` (made by its `scripts/gen_api_docs.py`). Each fixture is also
checked against the response types in `src/fixtures/fixtures.ts` when the app is built, so if the API changes a response shape in a way the types do not expect,
`npm run build` fails here instead of a page breaking later. To pick up an API change: copy `docs/examples/*.json` into `src/fixtures/`, update `src/services/v1/types.ts`, run `npm test`.

## What the pages show, and what they do not

- Every prediction sits next to its model, the season and ratings date, and whether the model had been trained on that season (in-sample). For a past season the API
  prefers a model that had not seen it.
- Probabilities are for a neutral court. Bracket odds treat games as independent and use ratings frozen at Selection Sunday.
- The model is within noise of a simple efficiency model and of betting lines on tournament games. The pages never say it is better than either, and the backtest
  page shows each difference with its interval and says when the interval includes zero.
- The factor bars describe what the model does with each group of inputs. They are not causes.
- Pick, upset pick, lock and winner are written in words as well as shown in a style, so nothing depends on color.

## Deploying (Render static site)

Root directory `march-madness-tracker-app`, build command `npm ci && npm run build`, publish directory `dist`, environment variables `VITE_API_BASE_URL` (the API's address)
and `NODE_VERSION`, and a rewrite of `/*` to `/index.html` so direct links work. After the first deploy, add the site's address to the API's `CORS_ORIGINS`.
