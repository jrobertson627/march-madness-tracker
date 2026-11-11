import { titleCase } from './format';

/** Plain labels for the API's factor groups, with one line on what each one holds. */
const GROUPS: Record<string, { label: string; blurb: string }> = {
    efficiency: { label: 'Efficiency', blurb: 'Points scored and allowed per 100 possessions, adjusted for opponents.' },
    tempo: { label: 'Pace', blurb: 'How many possessions each team plays per game.' },
    four_factors: { label: 'Four factors', blurb: 'Shooting, turnovers, rebounding and free throws, on offense and defense.' },
    form: { label: 'Recent form', blurb: 'Results in the last 5 and 10 games, and the trend.' },
    schedule: { label: 'Schedule strength', blurb: 'How good the opponents were.' },
    elo: { label: 'Elo rating', blurb: 'A rating built from every result this season.' },
    roster: { label: 'Roster', blurb: 'Returning minutes, last year’s player ratings, transfers and depth.' },
    coach: { label: 'Coach', blurb: 'Seasons at the school and past tournament trips.' },
    seed: { label: 'Seed', blurb: 'The committee’s seed line.' },
};

export const INTERACTION = {
    label: 'Combined effects',
    blurb: 'What is left after the groups above: the groups work together, so their effects do not add up exactly.',
};

/** The number each group shows for both teams, by the API's headline key. */
const HEADLINES: Record<string, string> = {
    adj_em: 'Adjusted efficiency margin',
    adj_tempo: 'Adjusted tempo',
    efg: 'Effective field goal %',
    last10_margin: 'Average margin, last 10',
    sos_elo: 'Schedule strength (Elo)',
    elo: 'Elo rating',
    returning_min_pct: 'Returning minutes %',
    coach_seasons_at_school: 'Coach seasons at school',
    seed: 'Seed',
};

export function groupInfo(group: string): { label: string; blurb: string } {
    return GROUPS[group] ?? { label: titleCase(group.replace(/_/g, '-')), blurb: '' };
}

export function headlineLabel(key: string | null | undefined): string {
    if (!key) return '';
    return HEADLINES[key] ?? titleCase(key.replace(/_/g, '-'));
}
