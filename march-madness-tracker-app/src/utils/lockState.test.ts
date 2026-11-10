import { describe, expect, it } from 'vitest';

import { MAX_LOCKS } from './bracketModel';
import { decodeLocks, encodeLocks } from './lockState';

describe('lock links', () => {
    it('round-trips a list of locks', () => {
        const locks = [
            { round: 0, game: 1, winner: 'e16b' },
            { round: 1, game: 0, winner: 'duke' },
            { round: 6, game: 0, winner: 'michigan-state' },
        ];
        expect(encodeLocks(locks)).toBe('0-1:e16b,1-0:duke,6-0:michigan-state');
        expect(decodeLocks(encodeLocks(locks))).toEqual(locks);
    });

    it('reads nothing from an empty or missing value', () => {
        expect(decodeLocks(null)).toEqual([]);
        expect(decodeLocks(undefined)).toEqual([]);
        expect(decodeLocks('')).toEqual([]);
        expect(encodeLocks([])).toBe('');
    });

    it('ignores anything that does not parse, and keeps the rest', () => {
        const text = ['garbage', '1-0', '1-0:', '1-0:Duke', '1-0:du ke', 'x-1:duke', '7-0:duke', '1-99:duke', '3-8:duke', '6-1:duke', '1-2:ok-team'].join(',');
        expect(decodeLocks(text)).toEqual([{ round: 1, game: 2, winner: 'ok-team' }]);
    });

    it('accepts the largest game number of each round and refuses one past it', () => {
        const last = [
            [0, 63],
            [1, 31],
            [2, 15],
            [3, 7],
            [4, 3],
            [5, 1],
            [6, 0],
        ];
        for (const [round, game] of last) expect(decodeLocks(`${round}-${game}:team`)).toHaveLength(1);
        for (const [round, game] of last.slice(1)) expect(decodeLocks(`${round}-${game + 1}:team`)).toHaveLength(0);
    });

    it('keeps the first entry when a game appears twice', () => {
        expect(decodeLocks('1-0:duke,1-0:houston')).toEqual([{ round: 1, game: 0, winner: 'duke' }]);
    });

    it('is capped at one tournament', () => {
        const many = Array.from({ length: 200 }, (_, i) => `0-${i % 64}:t${i}`);
        const slots = Array.from({ length: 64 }, (_, g) => `0-${g}:a${g}`).concat(Array.from({ length: 32 }, (_, g) => `1-${g}:b${g}`)).concat(many);
        expect(decodeLocks(slots.join(',')).length).toBeLessThanOrEqual(MAX_LOCKS);
    });
});
