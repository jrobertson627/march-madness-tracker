/**
 * Real responses from the API, made from its invented sample data (the API repository's scripts/gen_api_docs.py writes
 * them to docs/examples). To refresh them, copy that folder here.
 *
 * Each one is checked against the response types when the app is built: `matches<Widened<T>>(json)` fails to compile if
 * the JSON is missing a field the type requires or has the wrong kind of value. (Widened turns the literal unions in
 * the types, such as 'live' | 'backtest', into plain strings, because a JSON import cannot be narrower than string.)
 */
import type {
    BacktestResponse,
    BracketResponse,
    HealthResponse,
    MatchupResponse,
    ModelsResponse,
    RoundMatchupsResponse,
    SeasonsResponse,
    TeamsResponse,
} from '../services/v1/types';
import backtestJson from './backtest.json';
import bracketJson from './bracket.json';
import oddsJson from './bracket_odds.json';
import healthJson from './health.json';
import matchupJson from './matchup.json';
import modelsJson from './models.json';
import roundMatchupsJson from './round_matchups.json';
import seasonsJson from './seasons.json';
import teamsJson from './teams.json';

type Widened<T> = T extends string ? string : T extends (infer U)[] ? Widened<U>[] : T extends object ? { [K in keyof T]: Widened<T[K]> } : T;

function matches<T>(value: T): void {
    void value;
}

matches<Widened<MatchupResponse>>(matchupJson);
matches<Widened<BracketResponse>>(bracketJson);
matches<Widened<BracketResponse>>(oddsJson);
matches<Widened<TeamsResponse>>(teamsJson);
matches<Widened<BacktestResponse>>(backtestJson);
matches<Widened<SeasonsResponse>>(seasonsJson);
matches<Widened<ModelsResponse>>(modelsJson);
matches<Widened<HealthResponse>>(healthJson);
matches<Widened<RoundMatchupsResponse>>(roundMatchupsJson);

const as = <T>(json: unknown) => json as T;

export const matchup = as<MatchupResponse>(matchupJson);
export const bracket = as<BracketResponse>(bracketJson);
export const bracketOdds = as<BracketResponse>(oddsJson);
export const teams = as<TeamsResponse>(teamsJson);
export const backtest = as<BacktestResponse>(backtestJson);
export const seasons = as<SeasonsResponse>(seasonsJson);
export const models = as<ModelsResponse>(modelsJson);
export const health = as<HealthResponse>(healthJson);
export const roundMatchups = as<RoundMatchupsResponse>(roundMatchupsJson);
