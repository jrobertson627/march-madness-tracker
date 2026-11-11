/**
 * The shape of the bracket and the rules for what-if locks. Pure functions, no React, so they are easy to test.
 *
 * Numbering follows the API. A region holds 16 slots in this seed order, and slot k of the whole bracket belongs to
 * region k >> 4. Round 0 is the First Four (a slot with two teams); in round r >= 1 game g is played between the winners
 * of games 2g and 2g + 1 of round r - 1 (round 1: between slot 2g and slot 2g + 1). Round 5 is the Final Four and
 * round 6 the championship.
 */

import type { BracketResponse, FieldTeam, GameResult, Pick as PickRow, PickSet, PlayedGame } from '../services/v1/types';

export const SLOT_SEEDS = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];
export const MAX_LOCKS = 67; // 63 games and the 4 First Four games

export const ROUND_LABELS: Record<number, string> = {
    0: 'First Four',
    1: 'Round of 64',
    2: 'Round of 32',
    3: 'Sweet 16',
    4: 'Elite 8',
    5: 'Final Four',
    6: 'Championship',
};

export interface BracketModel {
    regions: string[];
    /** 64 slots in bracket order, each with one team or two (a First Four game). */
    slots: FieldTeam[][];
    byId: Record<string, FieldTeam>;
}

/** A game the person has decided: the winner of game `game` in round `round`. */
export interface Lock {
    round: number;
    game: number;
    winner: string;
}

export const gameKey = (round: number, game: number) => `${round}-${game}`;

export function buildModel(b: Pick<BracketResponse, 'field' | 'picks'>): BracketModel {
    const byId: Record<string, FieldTeam> = {};
    for (const t of b.field) byId[t.team] = t;
    const rows = b.picks.model_favorite.length ? b.picks.model_favorite : b.picks.best_expected_points;
    // the region of game 8k in round 1 is region k, because each region has 8 first-round games
    const regions: string[] = [];
    for (let k = 0; k < 4; k++) {
        const row = rows.find((r) => r.round === 1 && r.game === k * 8);
        const team = row ? byId[row.team_a] : undefined;
        if (!team) throw new Error('The bracket response does not describe four regions.');
        regions.push(team.region);
    }
    const slots: FieldTeam[][] = [];
    for (let k = 0; k < 64; k++) {
        const region = regions[k >> 4];
        const seed = SLOT_SEEDS[k & 15];
        slots.push(b.field.filter((t) => t.region === region && t.seed === seed));
    }
    return { regions, slots, byId };
}

/** The two teams in a game, given the games already decided. A null means that team is not known yet. */
export function participants(model: BracketModel, winners: ReadonlyMap<string, string>, round: number, game: number): [string | null, string | null] {
    if (round === 0) {
        const teams = model.slots[game] ?? [];
        return teams.length === 2 ? [teams[0].team, teams[1].team] : [null, null];
    }
    if (round === 1) {
        const side = (slot: number) => {
            const teams = model.slots[slot] ?? [];
            if (teams.length === 1) return teams[0].team;
            return teams.length === 2 ? (winners.get(gameKey(0, slot)) ?? null) : null;
        };
        return [side(2 * game), side(2 * game + 1)];
    }
    return [winners.get(gameKey(round - 1, 2 * game)) ?? null, winners.get(gameKey(round - 1, 2 * game + 1)) ?? null];
}

export interface Resolved {
    /** Locks that fit the bracket, earliest round first. */
    valid: Lock[];
    /** What to send to the what-if route. */
    results: GameResult[];
    /** Locks that were left out: a team that is not known yet, or a winner who is not in the game. */
    dropped: Lock[];
}

/** Check locks against the bracket, round by round, and work out who played in each. Order does not matter. */
export function resolveLocks(model: BracketModel, locks: readonly Lock[]): Resolved {
    const sorted = [...locks].sort((a, b) => a.round - b.round || a.game - b.game);
    const winners = new Map<string, string>();
    const valid: Lock[] = [];
    const results: GameResult[] = [];
    const dropped: Lock[] = [];
    for (const lock of sorted) {
        const key = gameKey(lock.round, lock.game);
        const [a, b] = participants(model, winners, lock.round, lock.game);
        if (winners.has(key) || a === null || b === null || (lock.winner !== a && lock.winner !== b) || valid.length >= MAX_LOCKS) {
            dropped.push(lock);
            continue;
        }
        winners.set(key, lock.winner);
        valid.push(lock);
        results.push({ team_a: a, team_b: b, winner: lock.winner });
    }
    return { valid, results, dropped };
}

export function winnersOf(locks: readonly Lock[]): Map<string, string> {
    return new Map(locks.map((l) => [gameKey(l.round, l.game), l.winner]));
}

/** Choose a winner for a game. Choosing the same winner again unlocks it. Games that depended on the old choice are dropped. */
export function toggleLock(model: BracketModel, locks: readonly Lock[], round: number, game: number, winner: string): Lock[] {
    const existing = locks.find((l) => l.round === round && l.game === game);
    const rest = locks.filter((l) => !(l.round === round && l.game === game));
    const next = existing && existing.winner === winner ? rest : [...rest, { round, game, winner }];
    return resolveLocks(model, next).valid;
}

/** Locks for every game already played, so a past tournament can be replayed. */
export function locksFromResults(results: readonly PlayedGame[]): Lock[] {
    return results.map((r) => ({ round: r.round, game: r.game, winner: r.winner }));
}

// ------------------------------------------------------------------ layout

/** The games of one region by round: round 1 has 8, round 2 has 4, round 3 has 2 and round 4 has 1. */
export function regionGames(regionIndex: number): { round: number; games: number[] }[] {
    const out = [];
    for (let round = 1; round <= 4; round++) {
        const n = 8 >> (round - 1);
        out.push({ round, games: Array.from({ length: n }, (_, i) => regionIndex * n + i) });
    }
    return out;
}

export function pickIndex(rows: readonly PickRow[] | undefined): Map<string, PickRow> {
    return new Map((rows ?? []).map((r) => [gameKey(r.round, r.game), r]));
}

export function playedIndex(results: readonly PlayedGame[] | undefined): Map<string, PlayedGame> {
    return new Map((results ?? []).map((r) => [gameKey(r.round, r.game), r]));
}

export interface PickScore {
    /** Games with a known result that the picks covered. */
    games: number;
    correct: number;
    points: number;
    /** Points if every game had been picked right. */
    possible: number;
}

/** How a set of picks did against the games already played. Round 0 is not part of a bracket's score. */
export function scorePicks(rows: readonly PickRow[], results: readonly PlayedGame[], scoring: readonly number[]): PickScore {
    const played = playedIndex(results);
    const out: PickScore = { games: 0, correct: 0, points: 0, possible: 0 };
    for (const row of rows) {
        const result = played.get(gameKey(row.round, row.game));
        if (!result || row.round < 1) continue;
        const value = scoring[row.round - 1] ?? 0;
        out.games += 1;
        out.possible += value;
        if (row.pick === result.winner) {
            out.correct += 1;
            out.points += value;
        }
    }
    return out;
}

export const PICK_SETS: { key: PickSet; label: string; blurb: string }[] = [
    { key: 'best_expected_points', label: 'Best expected points', blurb: 'The consistent bracket with the most expected points under the scoring chosen.' },
    { key: 'model_favorite', label: 'Model favorite', blurb: 'In every game, the team the model gives the better chance.' },
    { key: 'seed_chalk', label: 'Seed chalk', blurb: 'In every game, the better seed.' },
];

export const SCORING_PRESETS: { key: string; label: string; values: number[] }[] = [
    { key: 'espn', label: '10, 20, 40, 80, 160, 320', values: [10, 20, 40, 80, 160, 320] },
    { key: 'doubling', label: '1, 2, 4, 8, 16, 32', values: [1, 2, 4, 8, 16, 32] },
];
