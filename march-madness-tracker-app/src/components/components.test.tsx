import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { bracket, matchup } from '../fixtures/fixtures';
import { ApiError } from '../services/v1/client';
import type { Pick as PickRow } from '../services/v1/types';
import BracketGame from './bracket-game/bracket-game';
import FactorBars from './factor-bars/factor-bars';
import ModelBadge from './model-badge/model-badge';
import StatusBanner from './status-banner/status-banner';
import TitleOdds from './title-odds/title-odds';
import WinBar from './win-bar/win-bar';

describe('ModelBadge', () => {
    it('says out-of-sample for a model that had not seen the season', () => {
        render(<ModelBadge snapshot={{ ...matchup.snapshot, in_sample: false }} notes={['neutral court']} />);
        expect(screen.getByText('Out-of-sample')).toBeInTheDocument();
        expect(screen.getByText('neutral court')).toBeInTheDocument();
        expect(screen.queryByText(/not a fair test/)).not.toBeInTheDocument();
    });

    it('says in-sample, and why that matters, in plain text rather than only a tooltip', () => {
        render(<ModelBadge snapshot={{ ...matchup.snapshot, in_sample: true }} notes={['in-sample: this model was trained on 2030', 'neutral court']} />);
        expect(screen.getByText('In-sample')).toBeInTheDocument();
        expect(screen.getByText(/not a fair test of it/)).toBeInTheDocument();
        expect(screen.getAllByText(/trained on 2030/)).toHaveLength(1); // the API's in-sample note is not repeated
    });

    it('shows which model and when its ratings are from', () => {
        render(<ModelBadge snapshot={matchup.snapshot} />);
        expect(screen.getByText(matchup.snapshot.model_id)).toBeInTheDocument();
        expect(screen.getByText(/ratings as of 2030-03-15/)).toBeInTheDocument();
        expect(screen.queryByText(/season in progress/)).not.toBeInTheDocument();
    });

    it('says the season is in progress for a live snapshot, so the age of the ratings is clear', () => {
        render(<ModelBadge snapshot={{ ...matchup.snapshot, kind: 'latest', as_of: '2031-01-12' }} />);
        expect(screen.getByText(/ratings as of 2031-01-12 · season in progress/)).toBeInTheDocument();
    });
});

describe('WinBar', () => {
    it('writes both chances out and describes the bar to a screen reader', () => {
        render(<WinBar nameA="Duke" nameB="Houston" pA={0.583} />);
        expect(screen.getByLabelText('Chance to win: Duke 58%, Houston 42%')).toBeInTheDocument();
    });

    it('shows dashes, not a made-up half, when there is no probability', () => {
        render(<WinBar nameA="Duke" nameB="Houston" pA={null} />);
        expect(screen.getByLabelText('Chance to win: Duke –, Houston –')).toBeInTheDocument();
    });
});

describe('FactorBars', () => {
    const factors = [
        { group: 'efficiency', effect: 0.061, headline: 'adj_em', a: 24.1, b: 22.4 },
        { group: 'form', effect: -0.018, headline: 'last10_margin', a: 4.2, b: 8.9 },
        { group: 'schedule', effect: 0, headline: 'sos_elo', a: 1500, b: 1500 },
    ];

    it('says in words which team each group favors and by how much', () => {
        render(<FactorBars factors={factors} interaction={0.012} nameA="Duke" nameB="Houston" />);
        expect(screen.getByText('+6.1 points toward Duke')).toBeInTheDocument();
        expect(screen.getByText('+1.8 points toward Houston')).toBeInTheDocument();
        expect(screen.getByText('No effect')).toBeInTheDocument();
    });

    it('shows each team\'s number for the group and ends with the combined effects', () => {
        render(<FactorBars factors={factors} interaction={0.012} nameA="Duke" nameB="Houston" />);
        expect(screen.getByText('Adjusted efficiency margin: Duke 24.1, Houston 22.4')).toBeInTheDocument();
        const items = screen.getAllByRole('listitem');
        expect(within(items[items.length - 1]).getByText('Combined effects')).toBeInTheDocument();
    });

    it('leaves the combined row out when the API has none', () => {
        render(<FactorBars factors={factors} nameA="Duke" nameB="Houston" />);
        expect(screen.queryByText('Combined effects')).not.toBeInTheDocument();
    });
});

describe('StatusBanner', () => {
    it('says the server is waking up', () => {
        render(<StatusBanner status="waking" error={null} />);
        expect(screen.getByRole('status')).toHaveTextContent(/server is starting up/);
    });

    it('shows a plain error with Retry for something that can be retried', async () => {
        const retry = vi.fn();
        render(<StatusBanner status="error" error={new ApiError('network', 'x')} onRetry={retry} />);
        expect(screen.getByText(/Could not reach the server/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
        expect(retry).toHaveBeenCalledOnce();
    });

    it('offers no Retry for an answer that will not change', () => {
        render(<StatusBanner status="error" error={new ApiError('unknown_team', 'x', 404)} onRetry={() => {}} />);
        expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    });

    it('shows nothing once the data is there', () => {
        const { container } = render(<StatusBanner status="success" error={null} />);
        expect(container).toBeEmptyDOMElement();
    });
});

describe('BracketGame', () => {
    const pick: PickRow = bracket.picks.model_favorite.find((p) => p.round === 1 && p.team_a === 's1' && p.team_b === 's16') as PickRow;
    const name = (id: string) => id.toUpperCase();
    const seed = (id: string) => (id === 's1' ? 1 : id === 's16' ? 16 : undefined);
    const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

    it('shows both teams with seed, projected score and head-to-head chance, and labels the pick', () => {
        wrap(<BracketGame pick={pick} season={2030} name={name} seed={seed} />);
        expect(screen.getByRole('article', { name: /S1 against S16/ })).toBeInTheDocument();
        expect(screen.getByText('S1')).toBeInTheDocument();
        expect(screen.getByText(/^Pick/, { selector: '.bracket-game__tags' })).toBeInTheDocument();
        expect(screen.getAllByText(/Chance to win/)).toHaveLength(2);
        expect(screen.getAllByText(/Projected score/)).toHaveLength(2);
    });

    it('is a plain card with a link to the matchup when what-if is off', () => {
        wrap(<BracketGame pick={pick} season={2030} name={name} seed={seed} />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Details/ })).toHaveAttribute('href', '/compare?teamA=s1&teamB=s16&season=2030');
    });

    it('turns each team into a button when what-if is on and the game can be decided', async () => {
        const onChoose = vi.fn();
        wrap(<BracketGame pick={pick} season={2030} name={name} seed={seed} whatIf={{ active: true, lockable: true, onChoose }} />);
        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(2);
        await userEvent.click(buttons[1]);
        expect(onChoose).toHaveBeenCalledWith('s16');
    });

    it('marks the locked winner as pressed and labels it', () => {
        wrap(<BracketGame pick={pick} season={2030} name={name} seed={seed} whatIf={{ active: true, lockable: true, lockedWinner: 's16', onChoose: () => {} }} />);
        expect(screen.getByRole('button', { name: /S16/ })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/Locked/)).toBeInTheDocument();
    });

    it('explains why a game cannot be decided yet, and offers no buttons', () => {
        wrap(<BracketGame pick={pick} season={2030} name={name} seed={seed} whatIf={{ active: true, lockable: false, onChoose: () => {} }} />);
        expect(screen.getByText('Decide the earlier games first')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('says whether the pick was right when the game has been played', () => {
        wrap(<BracketGame pick={pick} season={2030} name={name} seed={seed} actual={{ round: 1, round_name: 'round of 64', game: pick.game, team_a: 's1', team_b: 's16', winner: pick.pick }} />);
        expect(screen.getByText('Pick was right')).toBeInTheDocument();
        expect(screen.getByText(/Won/, { selector: '.bracket-game__tags' })).toBeInTheDocument();
    });

    it('says the pick was wrong when the other team won', () => {
        const other = pick.pick === 's1' ? 's16' : 's1';
        wrap(<BracketGame pick={pick} season={2030} name={name} seed={seed} actual={{ round: 1, round_name: 'round of 64', game: pick.game, team_a: 's1', team_b: 's16', winner: other }} />);
        expect(screen.getByText('Pick was wrong')).toBeInTheDocument();
    });
});

describe('TitleOdds', () => {
    it('lists the top teams by championship chance and can show them all', async () => {
        render(<TitleOdds field={bracket.field} rowsShown={5} />);
        const rows = () => screen.getAllByRole('row').slice(1);
        expect(rows()).toHaveLength(5);
        const top = [...bracket.field].sort((a, b) => (b.p_champion ?? 0) - (a.p_champion ?? 0))[0];
        expect(within(rows()[0]).getByText(new RegExp(top.name ?? top.team))).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /Show all/ }));
        expect(rows()).toHaveLength(bracket.field.length);
    });

    it('sorts by another column when its header is pressed', async () => {
        render(<TitleOdds field={bracket.field} rowsShown={3} />);
        await userEvent.click(screen.getByRole('button', { name: 'Round of 32' }));
        const best = [...bracket.field].sort((a, b) => (b.p_round_of_32 ?? 0) - (a.p_round_of_32 ?? 0) || a.seed - b.seed)[0];
        expect(within(screen.getAllByRole('row')[1]).getByText(new RegExp(best.name ?? best.team))).toBeInTheDocument();
    });

    it('shows how far a team moved against the unlocked odds', () => {
        const moved = bracket.field.map((t, i) => (i === 0 ? { ...t, p_champion: (t.p_champion ?? 0) + 0.05 } : t));
        render(<TitleOdds field={moved} base={bracket.field} rowsShown={bracket.field.length} />);
        expect(screen.getByText(/▲ \+5\.0/)).toBeInTheDocument();
    });
});
