import { describe, expect, it } from 'vitest';

import { groupInfo, headlineLabel } from './factors';
import { pct, points, score, seedTag, signedPoints, teamLabel, titleCase } from './format';
import { pickSeason } from './season';

describe('format', () => {
    it('names a team from its id when the API has no name', () => {
        expect(titleCase('michigan-state')).toBe('Michigan State');
        expect(teamLabel('duke', 'Duke Blue Devils')).toBe('Duke Blue Devils');
        expect(teamLabel('n-c-state', null)).toBe('N C State');
    });

    it('writes percentages, scores and moves in probability', () => {
        expect(pct(0.583)).toBe('58%');
        expect(pct(0.1473, 1)).toBe('14.7%');
        expect(pct(null)).toBe('–');
        expect(points(71.44)).toBe('71.4');
        expect(points(undefined)).toBe('–');
        expect(signedPoints(0.061)).toBe('+6.1');
        expect(signedPoints(-0.018)).toBe('−1.8');
        expect(signedPoints(0)).toBe('0.0');
        expect(score(0.55618)).toBe('0.556');
        expect(seedTag(4)).toBe('(4)');
        expect(seedTag(null)).toBe('');
    });
});

describe('factor labels', () => {
    it('has a plain label for each group the API sends, and a fallback for a new one', () => {
        for (const g of ['efficiency', 'tempo', 'four_factors', 'form', 'schedule', 'elo', 'roster', 'coach', 'seed']) {
            const info = groupInfo(g);
            expect(info.label.length).toBeGreaterThan(0);
            expect(info.blurb.length).toBeGreaterThan(0);
        }
        expect(groupInfo('brand_new_group').label).toBe('Brand New Group');
        expect(headlineLabel('adj_em')).toBe('Adjusted efficiency margin');
        expect(headlineLabel(null)).toBe('');
    });
});

describe('pickSeason', () => {
    it('uses the season in the link when it has predictions, and the newest otherwise', () => {
        expect(pickSeason('2024', [2026, 2025, 2024], 2026)).toBe(2024);
        expect(pickSeason('1999', [2026, 2025], 2026)).toBe(2026);
        expect(pickSeason('abc', [2026], 2026)).toBe(2026);
        expect(pickSeason(null, [2026], 2026)).toBe(2026);
    });

    it('waits until the list of seasons is known', () => {
        expect(pickSeason('2024', [], null)).toBeNull();
    });
});
