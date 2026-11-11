/**
 * Response types for the prediction API (/v1). They follow docs/api.md in the API repository, which is generated from
 * the API's JSON Schemas. The fixtures in src/fixtures are real responses made from the API's sample data, and the
 * tests assign them to these types, so a change in the API's response shape fails the build here.
 */

export type SnapshotKind = 'selection_sunday' | 'latest';

export interface Snapshot {
    model_id: string;
    season: number;
    as_of: string;
    kind: SnapshotKind;
    in_sample: boolean;
    n_teams: number;
}

export interface ModelInfo {
    id: string;
    name: string;
    kind: 'live' | 'backtest';
    trained_seasons: number[];
    data_hash?: string;
    created_at?: string;
    metrics?: Record<string, unknown>;
    active: boolean;
}

export interface HealthResponse {
    status: 'ok' | 'degraded';
    store: boolean;
    active_model?: ModelInfo | null;
    latest_snapshot?: Snapshot | null;
}

export interface SeasonsResponse {
    /** `has_bracket` is false for a season in progress: it has predictions but no field until Selection Sunday. */
    seasons: { season: number; has_bracket: boolean; snapshots: Snapshot[] }[];
}

export interface ModelsResponse {
    models: ModelInfo[];
}

export interface TeamRow {
    id: string;
    name: string | null;
    seed: number | null;
    region: string | null;
}

export interface TeamsResponse {
    season: number;
    snapshot: Snapshot;
    teams: TeamRow[];
    notes: string[];
}

export interface TeamRef {
    id: string;
    name: string | null;
}

export interface Factor {
    group: string;
    effect: number | null;
    headline?: string | null;
    a?: number | null;
    b?: number | null;
}

export interface MatchupResponse {
    team_a: TeamRef;
    team_b: TeamRef;
    p_a_win: number | null;
    p_b_win: number | null;
    projected: {
        score_a: number | null;
        score_b: number | null;
        margin_a: number | null;
        total: number | null;
        basis: string;
    };
    factors: Factor[];
    interaction?: number | null;
    model: ModelInfo;
    snapshot: Snapshot;
    notes: string[];
}

export type PickSet = 'best_expected_points' | 'model_favorite' | 'seed_chalk';

export interface Pick {
    round: number;
    round_name: string;
    game: number;
    team_a: string;
    team_b: string;
    pick: string;
    /** Chance the pick wins this game, including the chance of reaching it. */
    p_pick_wins_game: number | null;
    /** Head-to-head chance that team_a beats team_b if they meet. */
    p_a_beats_b: number | null;
    score_a: number | null;
    score_b: number | null;
    margin_a: number | null;
}

export interface PlayedGame {
    /** 0 is the First Four. */
    round: number;
    round_name: string;
    game: number;
    team_a: string;
    team_b: string;
    winner: string;
}

export interface FieldTeam {
    team: string;
    name: string | null;
    seed: number;
    region: string;
    p_round_of_64?: number | null;
    p_round_of_32?: number | null;
    p_sweet_16?: number | null;
    p_elite_8?: number | null;
    p_final_four?: number | null;
    p_championship_game?: number | null;
    p_champion: number | null;
}

export interface FirstRoundGame {
    region: string;
    favorite: string;
    underdog: string;
    favorite_seed?: number;
    underdog_seed?: number;
    p_underdog_model: number | null;
    p_underdog_history?: number | null;
    model_picks_upset: boolean;
    model_above_history?: boolean;
    flagged: boolean;
}

export interface BracketResponse {
    season: number;
    snapshot: Snapshot;
    scoring: number[];
    locked_results: number;
    field: FieldTeam[];
    results: PlayedGame[];
    picks: Record<PickSet, Pick[]>;
    expected_points: Record<string, number | null>;
    first_round: FirstRoundGame[];
    notes: string[];
}

export interface RoundMatchupsResponse {
    season: number;
    round: number;
    snapshot: Snapshot;
    games: FirstRoundGame[];
    notes: unknown[];
}

/** A game already played, as the what-if route takes it. */
export interface GameResult {
    team_a: string;
    team_b: string;
    winner: string;
}

// ---------------------------------------------------------------- backtest

export type Season = number | 'all';

export interface AdvancementRow {
    season: Season;
    method: string;
    log_loss: number | null;
    brier: number | null;
    events: number;
}

export interface GameScoreRow {
    season: Season;
    method: string;
    n: number;
    log_loss: number | null;
    brier: number | null;
    accuracy: number | null;
}

export interface PickPointsRow {
    season: number;
    strategy: string;
    realized: number | null;
    expected: number | null;
}

export interface PairedRow {
    candidate: string;
    baseline: string;
    games: number;
    /** Negative means the candidate had the lower log loss. */
    diff: number | null;
    low: number | null;
    high: number | null;
    seasons_ahead: number;
    seasons: number;
    interval_excludes_zero: boolean;
}

export interface UpsetFlagRow {
    season: number;
    region: string;
    favorite: string;
    favorite_name?: string | null;
    underdog: string;
    underdog_name?: string | null;
    favorite_seed: number;
    underdog_seed: number;
    p_underdog_model: number | null;
    model_picks_upset: boolean;
    model_above_history: boolean;
    upset: boolean;
}

export interface Share {
    games: number;
    upsets: number;
}

export interface BacktestSelection {
    seasons: number[];
    advancement: AdvancementRow[];
    games_scored: GameScoreRow[];
    picks: PickPointsRow[];
    upset_flags: UpsetFlagRow[];
    upset_summary: { all_games: Share; model_picks_upset: Share; model_above_history: Share; no_flag: Share };
    paired: PairedRow[];
}

export interface BacktestLocked {
    season: number;
    advancement: AdvancementRow[];
    games_scored: GameScoreRow[];
    picks: PickPointsRow[];
    paired: PairedRow[];
}

export interface BacktestResponse {
    model_id: string;
    data_hash: string;
    created_at: string;
    selection: BacktestSelection;
    locked: BacktestLocked | null;
    limits: string[];
    notes?: string[];
}

export interface ApiErrorBody {
    error: { code: string; message: string; details: Record<string, unknown> };
}
