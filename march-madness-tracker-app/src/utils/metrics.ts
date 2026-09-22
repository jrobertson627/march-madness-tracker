export interface MetricConfig {
    key: string;
    label: string;
    defaultWeight: number;
    /** false when a lower raw value is the better outcome (e.g. turnover rate). */
    higherIsBetter: boolean;
}

export const METRICS: MetricConfig[] = [
    { key: 'efficiency_margin', label: 'Efficiency Margin', defaultWeight: 1, higherIsBetter: true },
    { key: 'sos', label: 'Strength of Schedule', defaultWeight: 0.5, higherIsBetter: true },
    { key: 'turnover_rate', label: 'Turnover Rate', defaultWeight: 0.5, higherIsBetter: false },
    { key: 'rebound_rate', label: 'Rebound Rate', defaultWeight: 0.5, higherIsBetter: true },
    { key: 'efg_pct', label: 'Effective FG%', defaultWeight: 0.75, higherIsBetter: true },
    { key: 'recent_form', label: 'Recent Form (L5)', defaultWeight: 0.75, higherIsBetter: true },
];

export type WeightMap = Record<string, number>;

export function defaultWeights(): WeightMap {
    return Object.fromEntries(METRICS.map((m) => [m.key, m.defaultWeight]));
}

export interface MetricContribution {
    key: string;
    label: string;
    teamAValue: number;
    teamBValue: number;
    /** Positive favors team A, negative favors team B, scaled by weight. */
    contribution: number;
}

export interface PredictionResult {
    teamAScore: number;
    teamBScore: number;
    teamAWinProbability: number;
    teamBWinProbability: number;
    breakdown: MetricContribution[];
}

/**
 * Normalizes each metric to a [-1, 1] scale relative to the two teams being
 * compared, applies the active weights, and turns the resulting composite
 * score differential into a win probability via a logistic curve.
 */
export function predict(
    teamAStats: Record<string, number>,
    teamBStats: Record<string, number>,
    weights: WeightMap,
    metrics: MetricConfig[] = METRICS,
): PredictionResult {
    let teamAScore = 0;
    let teamBScore = 0;
    const breakdown: MetricContribution[] = [];

    for (const metric of metrics) {
        const weight = weights[metric.key] ?? 0;
        if (weight === 0) continue;

        const a = teamAStats[metric.key] ?? 0;
        const b = teamBStats[metric.key] ?? 0;
        const spread = Math.abs(a) + Math.abs(b) || 1;
        let normalizedDiff = (a - b) / spread;
        if (!metric.higherIsBetter) normalizedDiff = -normalizedDiff;

        const contribution = normalizedDiff * weight;
        teamAScore += contribution;
        teamBScore -= contribution;
        breakdown.push({ key: metric.key, label: metric.label, teamAValue: a, teamBValue: b, contribution });
    }

    const teamAWinProbability = 1 / (1 + Math.exp(-(teamAScore - teamBScore)));
    return {
        teamAScore,
        teamBScore,
        teamAWinProbability,
        teamBWinProbability: 1 - teamAWinProbability,
        breakdown,
    };
}
