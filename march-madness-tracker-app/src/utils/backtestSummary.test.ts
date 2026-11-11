import { describe, expect, it } from 'vitest';

import { backtest } from '../fixtures/fixtures';
import type { BacktestResponse } from '../services/v1/types';
import { summarize } from './backtestSummary';

const clone = (): BacktestResponse => JSON.parse(JSON.stringify(backtest)) as BacktestResponse;

describe('summarize', () => {
    it('writes the numbers from the report, season range and sample sizes included', () => {
        const text = summarize(backtest).join('\n');
        expect(text).toMatch(/In 2022 to 2023 \(134 games\)/);
        expect(text).toMatch(/scored once after the design was chosen/);
        expect(text).toMatch(/0\.560/); // the model's pooled log loss in the fixture
    });

    it('says the difference could be noise when the interval includes zero', () => {
        const text = summarize(backtest).join('\n');
        expect(text).toMatch(/could be noise/);
        expect(text).not.toMatch(/does not include zero/);
    });

    it('says so when the interval excludes zero, and never says the model is better', () => {
        const r = clone();
        r.selection.paired = r.selection.paired.map((p) => ({ ...p, diff: -0.05, low: -0.08, high: -0.01, interval_excludes_zero: true }));
        const text = summarize(r).join('\n');
        expect(text).toMatch(/does not include zero/);
        expect(text).toMatch(/lower for the model/);
        expect(text.toLowerCase()).not.toMatch(/better than|beats|outperform/);
    });

    it('describes a higher score as higher for the model', () => {
        const r = clone();
        r.selection.paired = r.selection.paired.map((p) => ({ ...p, diff: 0.02, low: -0.01, high: 0.05, interval_excludes_zero: false }));
        expect(summarize(r).join('\n')).toMatch(/higher for the model/);
    });

    it('leaves out the scored-once sentence when the report has none', () => {
        const r = clone();
        r.locked = null;
        expect(summarize(r).join('\n')).not.toMatch(/scored once/);
    });
});
