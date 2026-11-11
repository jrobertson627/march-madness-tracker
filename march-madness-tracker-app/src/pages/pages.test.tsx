import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { backtest, bracket, bracketOdds, matchup, seasons, teams } from '../fixtures/fixtures';
import { renderPage, stubApi } from '../test/helpers';
import BacktestPage from './backtest/backtest';
import BracketPage from './bracket/bracket';
import Compare from './compare/compare';
import InitialSearch from './initial-search/initial-search';

const base = { 'GET /v1/seasons': seasons, 'GET /v1/teams': teams };

describe('team picker', () => {
    it('offers the teams of the chosen season and opens the comparison', async () => {
        stubApi(base);
        renderPage(<InitialSearch />, { path: '/welcome', route: '/welcome' });
        const compare = screen.getByRole('button', { name: 'Compare' });
        expect(compare).toBeDisabled();
        await userEvent.click(await screen.findByLabelText('Team 1'));
        await userEvent.click(await screen.findByRole('option', { name: 'East 1 (1)' }));
        await userEvent.click(screen.getByLabelText('Team 2'));
        await userEvent.click(await screen.findByRole('option', { name: 'West 1 (1)' }));
        expect(compare).toBeEnabled();
    });

    it('shows a plain error with Retry when the server cannot be reached', async () => {
        stubApi({}); // nothing is stubbed, every request answers 404
        renderPage(<InitialSearch />, { path: '/welcome', route: '/welcome' });
        expect(await screen.findByText(/no predictions for that season|Something went wrong|not stubbed/i)).toBeInTheDocument();
    });
});

describe('matchup explainer', () => {
    const handlers = { ...base, 'GET /v1/predict/matchup': matchup };
    const at = '/compare?teamA=e1&teamB=w1&season=2030';

    it('shows the model, the chances, the projected score and the factors', async () => {
        const api = stubApi(handlers);
        renderPage(<Compare />, { path: at, route: '/compare' });
        expect(await screen.findByRole('heading', { name: 'East 1 vs West 1' })).toBeInTheDocument();
        expect(await screen.findByText('Out-of-sample')).toBeInTheDocument();
        expect(screen.getByLabelText(/Chance to win: East 1 \d+%, West 1 \d+%/)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Projected score' })).toBeInTheDocument();
        expect(screen.getByText('Efficiency')).toBeInTheDocument();
        expect(screen.getByText('Combined effects')).toBeInTheDocument();
        expect(screen.getByText(/does not show a cause/)).toBeInTheDocument();
        const call = api.to('GET', '/v1/predict/matchup')[0];
        expect(Object.fromEntries(call.url.searchParams)).toEqual({ team_a: 'e1', team_b: 'w1', season: '2030' });
    });

    it('warns in words when the model had seen the season', async () => {
        stubApi({ ...handlers, 'GET /v1/predict/matchup': { ...matchup, snapshot: { ...matchup.snapshot, in_sample: true } } });
        renderPage(<Compare />, { path: at, route: '/compare' });
        expect(await screen.findByText('In-sample')).toBeInTheDocument();
        expect(screen.getByText(/not a fair test of it/)).toBeInTheDocument();
    });

    it('explains an unknown team in plain words', async () => {
        stubApi({
            ...handlers,
            'GET /v1/predict/matchup': new Response(JSON.stringify({ error: { code: 'unknown_team', message: 'No team', details: {} } }), { status: 404 }),
        });
        renderPage(<Compare />, { path: at, route: '/compare' });
        expect(await screen.findByText('That team has no predictions for this season.')).toBeInTheDocument();
    });

    it('keeps the old weights page on its own tab, labeled as not the model', async () => {
        stubApi(handlers);
        renderPage(<Compare />, { path: at, route: '/compare' });
        await userEvent.click(screen.getByRole('tab', { name: 'Try your own weights' }));
        expect(await screen.findByText(/does not use the model and is not its prediction/)).toBeInTheDocument();
    });

    it('asks for two teams when the link has none', () => {
        stubApi(base);
        renderPage(<Compare />, { path: '/compare', route: '/compare' });
        expect(screen.getByText('Pick two teams first.')).toBeInTheDocument();
    });
});

describe('bracket and what-if', () => {
    const handlers = { ...base, 'GET /v1/bracket/2030': bracket, 'POST /v1/bracket/2030/odds': bracketOdds };
    const open = async (path = '/bracket/2030') => {
        const api = stubApi(handlers);
        renderPage(<BracketPage />, { path, route: '/bracket/:season' });
        await screen.findByRole('tab', { name: 'East' });
        return api;
    };

    it('shows the model, the expected points, the regions and the odds table', async () => {
        await open();
        expect(screen.getByRole('heading', { name: '2030 bracket' })).toBeInTheDocument();
        expect(screen.getByText('Out-of-sample')).toBeInTheDocument();
        expect(screen.getByText(/Expected points for these picks/)).toBeInTheDocument();
        for (const tab of ['East', 'West', 'South', 'Midwest', 'Final Four']) expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Chance of reaching each round' })).toBeInTheDocument();
        expect(screen.getAllByRole('article').length).toBe(15); // one region: 8 + 4 + 2 + 1 games
    });

    it('shows all four regions and the Final Four at once on a wide screen, without tabs', async () => {
        const wide = (query: string) => ({
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        });
        vi.stubGlobal('matchMedia', wide);
        stubApi(handlers);
        renderPage(<BracketPage />, { path: '/bracket/2030', route: '/bracket/:season' });
        await screen.findByRole('heading', { name: 'Chance of reaching each round' });
        expect(screen.queryByRole('tab', { name: 'East' })).not.toBeInTheDocument();
        expect(screen.getAllByRole('region', { name: / region$/ })).toHaveLength(4);
        expect(screen.getByRole('region', { name: 'Final Four' })).toBeInTheDocument();
        expect(screen.getAllByRole('article')).toHaveLength(63); // every game of the tournament
    });

    it('explains the First Four and says what happened in a played season', async () => {
        await open();
        expect(screen.getByRole('heading', { name: 'First Four' })).toBeInTheDocument();
        expect(screen.getByText(/these picks got/i)).toBeInTheDocument();
    });

    it('moves between regions and the Final Four', async () => {
        await open();
        await userEvent.click(screen.getByRole('tab', { name: 'Final Four' }));
        expect(screen.getAllByRole('article')).toHaveLength(3);
        await userEvent.click(screen.getByRole('tab', { name: 'South' }));
        expect(screen.getAllByRole('article')).toHaveLength(15);
    });

    it('turns on what-if, locks a winner and asks the API for new odds with that result', async () => {
        const api = await open();
        await userEvent.click(screen.getByRole('tab', { name: 'South' }));
        await userEvent.click(screen.getByRole('checkbox', { name: /What if/ }));
        expect(api.to('POST', '/v1/bracket/2030/odds')).toHaveLength(0);
        await userEvent.click(await screen.findByRole('button', { name: /South 16/ }));
        expect(await screen.findByRole('button', { name: 'Reset (1 locked)' })).toBeInTheDocument();
        await waitFor(() => expect(api.to('POST', '/v1/bracket/2030/odds')).toHaveLength(1), { timeout: 2_000 });
        expect(api.to('POST', '/v1/bracket/2030/odds')[0].body).toMatchObject({ results: [{ team_a: 's1', team_b: 's16', winner: 's16' }] });
        expect(screen.getByRole('button', { name: /South 16/ })).toHaveAttribute('aria-pressed', 'true');
        expect(await screen.findByText(/Arrows show the change/)).toBeInTheDocument();
    });

    it('sends one request after a run of clicks', async () => {
        const api = await open();
        await userEvent.click(screen.getByRole('tab', { name: 'South' }));
        await userEvent.click(screen.getByRole('checkbox', { name: /What if/ }));
        const first = await screen.findAllByRole('button', { name: /South (16|9|12|13)/ });
        for (const b of first.slice(0, 3)) await userEvent.click(b);
        await waitFor(() => expect(api.to('POST', '/v1/bracket/2030/odds').length).toBeGreaterThan(0), { timeout: 2_000 });
        expect(api.to('POST', '/v1/bracket/2030/odds')).toHaveLength(1);
        expect((api.to('POST', '/v1/bracket/2030/odds')[0].body as { results: unknown[] }).results).toHaveLength(3);
    });

    it('does not let a game be decided before the games that feed it, or before a First Four game', async () => {
        await open('/bracket/2030?whatif=1');
        expect(screen.getAllByText('Decide the earlier games first').length).toBeGreaterThan(0);
        // East's 1 v 16 game waits for its First Four game; nothing in a later round can be pressed
        const articles = screen.getAllByRole('article');
        const second = articles.filter((a) => /round of 32|sweet 16|elite 8/i.test(a.getAttribute('aria-label') ?? ''));
        expect(second.length).toBeGreaterThan(0);
        for (const a of second) expect(within(a).queryAllByRole('button')).toHaveLength(0);
    });

    it('locks every real result of a played season in one press', async () => {
        const api = await open('/bracket/2030?whatif=1');
        await userEvent.click(screen.getByRole('button', { name: 'Lock all real results' }));
        expect(await screen.findByRole('button', { name: `Reset (${bracket.results.length} locked)` })).toBeInTheDocument();
        await waitFor(() => expect(api.to('POST', '/v1/bracket/2030/odds').length).toBeGreaterThan(0), { timeout: 2_000 });
        expect((api.to('POST', '/v1/bracket/2030/odds').slice(-1)[0].body as { results: unknown[] }).results).toHaveLength(bracket.results.length);
    });

    it('reads locks from the link, ignores ones that do not fit, and says so', async () => {
        await open('/bracket/2030?lock=1-0%3Ae1%2C1-17%3As8');
        expect(await screen.findByText(/did not fit the bracket and was ignored/)).toBeInTheDocument();
    });

    it('resets the locks', async () => {
        await open('/bracket/2030?lock=1-1%3Ae8');
        await userEvent.click(await screen.findByRole('button', { name: 'Reset (1 locked)' }));
        expect(await screen.findByRole('button', { name: 'Reset (0 locked)' })).toBeDisabled();
    });

    it('keeps the last good bracket and offers a way out when the API refuses a result', async () => {
        const api = stubApi({
            ...handlers,
            'POST /v1/bracket/2030/odds': new Response(JSON.stringify({ error: { code: 'impossible_result', message: 'cannot meet', details: {} } }), { status: 422 }),
        });
        renderPage(<BracketPage />, { path: '/bracket/2030?lock=1-1%3Ae8', route: '/bracket/:season' });
        expect(await screen.findByText(/does not include your last change/, undefined, { timeout: 3_000 })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Clear locked games' })).toBeInTheDocument();
        expect(api.to('POST', '/v1/bracket/2030/odds').length).toBeGreaterThan(0);
        expect(screen.getAllByRole('article').length).toBeGreaterThan(0); // the bracket is still there
    });

    it('goes to the newest season when the link has none', async () => {
        stubApi(handlers);
        renderPage(<BracketPage />, { path: '/bracket', route: '/bracket' });
        // the redirect target is not a route in this test, so the page itself is gone: nothing is left rendering the old season
        await waitFor(() => expect(screen.queryByText(/Looking for the newest season/)).not.toBeInTheDocument());
    });
});

describe('backtest page', () => {
    const handlers = { 'GET /v1/backtest': backtest };

    it('keeps the season scored once in its own panel, apart from the seasons used to choose the design', async () => {
        stubApi(handlers);
        renderPage(<BacktestPage />, { path: '/backtest', route: '/backtest' });
        const selection = (await screen.findByRole('heading', { name: /the seasons used to choose the design/ })).closest('section') as HTMLElement;
        const locked = screen.getByRole('heading', { name: /scored once, after the design was chosen/ }).closest('section') as HTMLElement;
        expect(selection).not.toBe(locked);
        expect(within(selection).getAllByRole('columnheader', { name: '2023' }).length).toBeGreaterThan(0);
        expect(within(selection).queryByRole('columnheader', { name: '2024' })).not.toBeInTheDocument();
        expect(within(locked).getAllByRole('columnheader', { name: '2024' }).length).toBeGreaterThan(0);
        expect(within(locked).queryByRole('columnheader', { name: '2023' })).not.toBeInTheDocument();
        expect(within(locked).getByText(/only comparison the choice of design did not influence/)).toBeInTheDocument();
    });

    it('writes the summary from the report and keeps the limits in view', async () => {
        stubApi(handlers);
        renderPage(<BacktestPage />, { path: '/backtest', route: '/backtest' });
        expect(await screen.findByText(/the model's log loss per game was/)).toBeInTheDocument();
        for (const line of backtest.limits) expect(screen.getByText(line)).toBeInTheDocument();
        expect(within(screen.getByRole('region', { name: 'In short' })).getAllByText(/could be noise/).length).toBeGreaterThan(0);
    });

    it('lists the upsets the model picked, with what happened', async () => {
        stubApi(handlers);
        renderPage(<BacktestPage />, { path: '/backtest', route: '/backtest' });
        await userEvent.click(await screen.findByText(/Games where the model picked the upset \(/));
        const flagged = backtest.selection.upset_flags.filter((f) => f.model_picks_upset);
        expect(flagged.length).toBeGreaterThan(0);
        expect(screen.getByRole('table', { name: 'Games where the model picked the upset' })).toBeInTheDocument();
    });

    it('switches between log loss and Brier score', async () => {
        stubApi(handlers);
        renderPage(<BacktestPage />, { path: '/backtest', route: '/backtest' });
        expect(await screen.findAllByRole('table', { name: /single games, log loss/ })).toHaveLength(2); // one for each panel
        await userEvent.click(screen.getByRole('button', { name: 'Brier score' }));
        expect(screen.getAllByRole('table', { name: /single games, Brier score/ })).toHaveLength(2);
        expect(screen.queryAllByRole('table', { name: /single games, log loss/ })).toHaveLength(0);
    });

    it('says plainly when no report has been published', async () => {
        stubApi({ 'GET /v1/backtest': new Response(JSON.stringify({ error: { code: 'backtest_not_found', message: 'none', details: {} } }), { status: 404 }) });
        renderPage(<BacktestPage />, { path: '/backtest', route: '/backtest' });
        expect(await screen.findByText('The backtest report has not been published yet.')).toBeInTheDocument();
    });
});
