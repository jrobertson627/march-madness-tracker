import { describe, expect, it } from 'vitest';

import { bracket } from '../fixtures/fixtures';
import {
    MAX_LOCKS,
    buildModel,
    gameKey,
    locksFromResults,
    participants,
    regionGames,
    resolveLocks,
    scorePicks,
    toggleLock,
    winnersOf,
} from './bracketModel';

const model = buildModel(bracket);
const ids = (slot: number) => model.slots[slot].map((t) => t.team).sort();

describe('the bracket model', () => {
    it('finds the four regions in bracket order and puts every team in a slot', () => {
        expect(model.regions).toEqual(['East', 'West', 'South', 'Midwest']);
        expect(model.slots).toHaveLength(64);
        expect(model.slots.flat()).toHaveLength(bracket.field.length);
        expect(model.slots.filter((s) => s.length === 2)).toHaveLength(4); // the four First Four games
        expect(ids(0)).toEqual(['e1']);
        expect(ids(1)).toEqual(['e16', 'e16b']); // East's 16 seed is a First Four game
        expect(ids(16)).toEqual(['w1']);
    });

    it('numbers the games of a region the way the API does', () => {
        expect(regionGames(0).map((r) => r.games)).toEqual([[0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3], [0, 1], [0]]);
        expect(regionGames(2).map((r) => r.games)).toEqual([[16, 17, 18, 19, 20, 21, 22, 23], [8, 9, 10, 11], [4, 5], [2]]);
    });
});

describe('who plays in a game', () => {
    it('knows both teams of a plain first-round game', () => {
        expect(participants(model, new Map(), 1, 1)).toEqual(['e8', 'e9']);
    });

    it('does not know a team that comes out of a First Four game until it is decided', () => {
        expect(participants(model, new Map(), 1, 0)).toEqual(['e1', null]);
        expect(participants(model, winnersOf([{ round: 0, game: 1, winner: 'e16b' }]), 1, 0)).toEqual(['e1', 'e16b']);
    });

    it('takes the teams of a later game from the games before it', () => {
        expect(participants(model, new Map(), 2, 0)).toEqual([null, null]);
        const winners = new Map([[gameKey(1, 0), 'e1'], [gameKey(1, 1), 'e9']]);
        expect(participants(model, winners, 2, 0)).toEqual(['e1', 'e9']);
    });
});

describe('locking games', () => {
    const first = { round: 1, game: 1, winner: 'e9' };

    it('accepts a game whose teams are known and sends both teams and the winner', () => {
        const r = resolveLocks(model, [first]);
        expect(r.valid).toEqual([first]);
        expect(r.results).toEqual([{ team_a: 'e8', team_b: 'e9', winner: 'e9' }]);
        expect(r.dropped).toEqual([]);
    });

    it('drops a game that depends on a First Four game nobody has decided', () => {
        const r = resolveLocks(model, [{ round: 1, game: 0, winner: 'e1' }]);
        expect(r.valid).toEqual([]);
        expect(r.dropped).toHaveLength(1);
    });

    it('accepts it once the First Four game is locked, whatever the order of the list', () => {
        const locks = [{ round: 1, game: 0, winner: 'e16b' }, { round: 0, game: 1, winner: 'e16b' }];
        const r = resolveLocks(model, locks);
        expect(r.valid.map((l) => l.round)).toEqual([0, 1]);
        expect(r.results[1]).toEqual({ team_a: 'e1', team_b: 'e16b', winner: 'e16b' });
    });

    it('drops a winner who is not in the game, and a later game with no feeders locked', () => {
        const r = resolveLocks(model, [{ round: 1, game: 1, winner: 'e1' }, { round: 2, game: 0, winner: 'e8' }]);
        expect(r.valid).toEqual([]);
        expect(r.dropped).toHaveLength(2);
    });

    it('builds a second-round game from two locked first-round winners', () => {
        const locks = [{ round: 1, game: 1, winner: 'e8' }, { round: 0, game: 1, winner: 'e16' }, { round: 1, game: 0, winner: 'e1' }, { round: 2, game: 0, winner: 'e8' }];
        const r = resolveLocks(model, locks);
        expect(r.valid).toHaveLength(4);
        expect(r.results[r.results.length - 1]).toEqual({ team_a: 'e1', team_b: 'e8', winner: 'e8' });
    });

    it('never keeps more than one tournament of games', () => {
        const all = Array.from({ length: 80 }, (_, g) => ({ round: 0, game: g, winner: 'x' }));
        expect(resolveLocks(model, all).valid.length).toBeLessThanOrEqual(MAX_LOCKS);
    });
});

describe('choosing winners', () => {
    it('locks a winner, and pressing the same team again unlocks it', () => {
        const a = toggleLock(model, [], 1, 1, 'e9');
        expect(a).toEqual([{ round: 1, game: 1, winner: 'e9' }]);
        expect(toggleLock(model, a, 1, 1, 'e9')).toEqual([]);
    });

    it('changes the winner when the other team is pressed', () => {
        const a = toggleLock(model, [], 1, 1, 'e9');
        expect(toggleLock(model, a, 1, 1, 'e8')).toEqual([{ round: 1, game: 1, winner: 'e8' }]);
    });

    it('drops the games that depended on a choice that was undone or changed', () => {
        let locks = toggleLock(model, [], 0, 1, 'e16');
        locks = toggleLock(model, locks, 1, 0, 'e16'); // a 16 seed beats the 1 seed
        locks = toggleLock(model, locks, 1, 1, 'e8');
        locks = toggleLock(model, locks, 2, 0, 'e16');
        expect(locks).toHaveLength(4);
        // the First Four winner changes, so the first-round game and the second-round game that followed it no longer fit
        const changed = toggleLock(model, locks, 0, 1, 'e16b');
        expect(changed.map((l) => `${l.round}-${l.game}`).sort()).toEqual(['0-1', '1-1']);
        // the first-round winner changes to the other team: the later game keeps its winner only if that team is still in it
        const flipped = toggleLock(model, locks, 1, 0, 'e1');
        expect(flipped.map((l) => `${l.round}-${l.game}`).sort()).toEqual(['0-1', '1-0', '1-1']);
    });
});

describe('replaying a played tournament', () => {
    it('turns every played game into a lock that fits the bracket', () => {
        const locks = locksFromResults(bracket.results);
        expect(locks).toHaveLength(bracket.results.length);
        const r = resolveLocks(model, locks);
        expect(r.dropped).toEqual([]);
        expect(r.results).toHaveLength(bracket.results.length);
    });
});

describe('scoring picks against what happened', () => {
    it('counts only played games and gives each correct pick the points of its round', () => {
        const picks = bracket.picks.model_favorite;
        const s = scorePicks(picks, bracket.results, [1, 2, 4, 8, 16, 32]);
        const played = bracket.results.filter((r) => r.round >= 1);
        expect(s.games).toBe(played.length);
        const right = played.filter((r) => picks.find((p) => p.round === r.round && p.game === r.game)?.pick === r.winner);
        expect(s.correct).toBe(right.length);
        expect(s.points).toBe(right.length); // both played games are in round 1, worth 1 point each
        expect(s.possible).toBe(played.length);
    });

    it('scores nothing for a season that has not been played', () => {
        expect(scorePicks(bracket.picks.model_favorite, [], [1, 2, 3, 4, 5, 6])).toEqual({ games: 0, correct: 0, points: 0, possible: 0 });
    });
});
