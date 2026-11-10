/** "michigan-state" -> "Michigan State". Used only when the API has no display name for a team. */
export function titleCase(slug: string): string {
    return slug
        .split('-')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');
}

export function teamLabel(id: string, name?: string | null): string {
    return name ? name : titleCase(id);
}

/** 0.583 -> "58%". */
export function pct(p: number | null | undefined, digits = 0): string {
    return p === null || p === undefined || Number.isNaN(p) ? '–' : `${(p * 100).toFixed(digits)}%`;
}

/** A projected score or margin to one decimal. */
export function points(x: number | null | undefined, digits = 1): string {
    return x === null || x === undefined || Number.isNaN(x) ? '–' : x.toFixed(digits);
}

/** A move in win probability as percentage points: 0.061 -> "+6.1", -0.018 -> "−1.8". */
export function signedPoints(effect: number | null | undefined, digits = 1): string {
    if (effect === null || effect === undefined || Number.isNaN(effect)) return '–';
    const v = effect * 100;
    const text = Math.abs(v).toFixed(digits);
    return v > 0 ? `+${text}` : v < 0 ? `−${text}` : text;
}

/** A log loss or Brier score to three decimals. */
export function score(x: number | null | undefined): string {
    return x === null || x === undefined || Number.isNaN(x) ? '–' : x.toFixed(3);
}

export function seedTag(seed: number | null | undefined): string {
    return seed === null || seed === undefined ? '' : `(${seed})`;
}
