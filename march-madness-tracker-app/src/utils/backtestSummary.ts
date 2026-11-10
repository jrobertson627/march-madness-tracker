import type { BacktestResponse, GameScoreRow, PairedRow, Season } from '../services/v1/types';
import { score } from './format';

function logLoss(rows: GameScoreRow[], method: string, season: Season): number | null {
    return rows.find((r) => r.method === method && r.season === season)?.log_loss ?? null;
}

/** "Model" is written out in each report as the method named "model". */
function describePair(p: PairedRow): string {
    const diff = p.diff === null ? '–' : score(p.diff);
    const interval = p.low === null || p.high === null ? '' : ` (95% interval ${score(p.low)} to ${score(p.high)})`;
    const noise = p.interval_excludes_zero ? 'The interval does not include zero.' : 'The interval includes zero, so the difference could be noise.';
    const direction = p.diff === null || p.diff === 0 ? '' : p.diff < 0 ? ', lower for the model' : ', higher for the model';
    return `Against the ${p.baseline} baseline, the difference in log loss per game (model minus baseline) is ${diff}${interval}${direction}. ${noise}`;
}

/**
 * A few plain sentences about the report, built from its numbers and worded so they stay true if the numbers change.
 * They say who scored lower and whether the gap is inside the noise. They never say the model is better than a baseline.
 */
export function summarize(report: BacktestResponse): string[] {
    const out: string[] = [];
    const sel = report.selection;
    const n = sel.games_scored.find((r) => r.season === 'all' && r.method === 'model')?.n;
    const years = `${sel.seasons[0]} to ${sel.seasons[sel.seasons.length - 1]}`;
    const model = logLoss(sel.games_scored, 'model', 'all');
    const eff = logLoss(sel.games_scored, 'efficiency gap', 'all');
    const seed = logLoss(sel.games_scored, 'seed', 'all');
    const coin = logLoss(sel.games_scored, 'coin flip', 'all');
    if (model !== null) {
        const others = [
            eff !== null ? `efficiency gap ${score(eff)}` : null,
            seed !== null ? `seed ${score(seed)}` : null,
            coin !== null ? `coin flip ${score(coin)}` : null,
        ].filter(Boolean);
        out.push(`In ${years}${n ? ` (${n} games)` : ''}, the model's log loss per game was ${score(model)}${others.length ? `, against ${others.join(', ')}` : ''}. Lower is better.`);
    }
    for (const p of sel.paired.filter((x) => x.baseline === 'efficiency gap')) out.push(describePair(p));
    const lk = report.locked;
    if (lk) {
        const m26 = logLoss(lk.games_scored, 'model', lk.season);
        const e26 = logLoss(lk.games_scored, 'efficiency gap', lk.season);
        const s26 = logLoss(lk.games_scored, 'seed', lk.season);
        const n26 = lk.games_scored.find((r) => r.method === 'model')?.n;
        if (m26 !== null) {
            const others = [e26 !== null ? `efficiency gap ${score(e26)}` : null, s26 !== null ? `seed ${score(s26)}` : null].filter(Boolean);
            out.push(`In ${lk.season}, scored once after the design was chosen${n26 ? ` (${n26} games)` : ''}, the model scored ${score(m26)}${others.length ? `, against ${others.join(', ')}` : ''}.`);
        }
        for (const p of lk.paired.filter((x) => x.baseline === 'efficiency gap')) out.push(describePair(p));
    }
    return out;
}
