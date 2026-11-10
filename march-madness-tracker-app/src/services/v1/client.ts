import type {
    ApiErrorBody,
    BacktestResponse,
    BracketResponse,
    GameResult,
    HealthResponse,
    MatchupResponse,
    SeasonsResponse,
    TeamsResponse,
} from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000').replace(/\/+$/, '');

/** Statuses a free host returns while it is starting or restarting. */
const RETRY_STATUSES = new Set([502, 503, 504]);

/** Wait per attempt. Render's free plan can take about a minute to start a sleeping service. */
export const DEFAULT_TIMEOUT_MS = 65_000;
export const DEFAULT_RETRIES = 2;
const BACKOFF_MS = [1_000, 2_000, 4_000];

/** One error type for everything that goes wrong talking to the API. */
export class ApiError extends Error {
    readonly code: string;
    readonly status: number;
    readonly details: Record<string, unknown>;

    constructor(code: string, message: string, status = 0, details: Record<string, unknown> = {}) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        this.details = details;
    }

    /** True when asking again later can work: the server was starting, busy or unreachable. */
    get retryable(): boolean {
        return this.status === 0 || RETRY_STATUSES.has(this.status) || this.code === 'timeout';
    }
}

export function isAbort(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

export interface RequestOptions {
    method?: 'GET' | 'POST';
    body?: unknown;
    /** Cancels the request. A canceled request throws an AbortError and is never retried. */
    signal?: AbortSignal;
    timeoutMs?: number;
    retries?: number;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

async function attempt(url: string, options: RequestOptions): Promise<Response> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);
    const onCallerAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onCallerAbort, { once: true });
    if (options.signal?.aborted) controller.abort();
    try {
        return await fetch(url, {
            method: options.method ?? 'GET',
            headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: controller.signal,
        });
    } catch (error) {
        if (timedOut) throw new ApiError('timeout', 'The server did not answer in time.', 0);
        if (isAbort(error)) throw error;
        throw new ApiError('network', 'Could not reach the server.', 0);
    } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onCallerAbort);
    }
}

async function toApiError(response: Response): Promise<ApiError> {
    try {
        const body = (await response.json()) as Partial<ApiErrorBody>;
        if (body.error && typeof body.error.code === 'string') {
            return new ApiError(body.error.code, body.error.message, response.status, body.error.details ?? {});
        }
    } catch {
        // not JSON: fall through
    }
    return new ApiError('http_error', `The server answered with status ${response.status}.`, response.status);
}

/** Fetch JSON from the API. Retries a network failure, a timeout and 502/503/504 with a growing pause; never a 4xx. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const retries = options.retries ?? DEFAULT_RETRIES;
    let last: ApiError | null = null;
    for (let n = 0; n <= retries; n++) {
        if (n > 0) await sleep(BACKOFF_MS[Math.min(n - 1, BACKOFF_MS.length - 1)], options.signal);
        try {
            const response = await attempt(`${BASE_URL}${path}`, options);
            if (response.ok) return (await response.json()) as T;
            last = await toApiError(response);
        } catch (error) {
            if (!(error instanceof ApiError)) throw error;
            last = error;
        }
        if (!last.retryable) break;
    }
    throw last as ApiError;
}

function query(params: Record<string, string | number | undefined>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
    const text = q.toString();
    return text ? `?${text}` : '';
}

export interface CallOptions {
    signal?: AbortSignal;
}

const LIST_CACHE_MS = 5 * 60_000;
const lists = new Map<string, { at: number; value: Promise<unknown> }>();

/** The season and team lists change only when something is published, so one copy is kept for a few minutes. A failure is not kept. */
function remembered<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = lists.get(key);
    if (hit && Date.now() - hit.at < LIST_CACHE_MS) return hit.value as Promise<T>;
    const value = load();
    lists.set(key, { at: Date.now(), value });
    value.catch(() => lists.delete(key));
    return value;
}

export function clearListCache(): void {
    lists.clear();
}

export const getHealth = (o: CallOptions = {}) => request<HealthResponse>('/health', { ...o, retries: 0 });
export const getSeasons = () => remembered('seasons', () => request<SeasonsResponse>('/v1/seasons'));
export const getTeams = (season: number) => remembered(`teams:${season}`, () => request<TeamsResponse>(`/v1/teams${query({ season })}`));
export const getMatchup = (teamA: string, teamB: string, season: number, o: CallOptions = {}) =>
    request<MatchupResponse>(`/v1/predict/matchup${query({ team_a: teamA, team_b: teamB, season })}`, o);
export const getBracket = (season: number, scoring?: number[], o: CallOptions = {}) =>
    request<BracketResponse>(`/v1/bracket/${season}${query({ scoring: scoring?.join(',') })}`, o);
export const postOdds = (season: number, results: GameResult[], scoring: number[] | undefined, o: CallOptions = {}) =>
    request<BracketResponse>(`/v1/bracket/${season}/odds`, { ...o, method: 'POST', body: { results, scoring } });
export const getBacktest = (o: CallOptions = {}) => request<BacktestResponse>('/v1/backtest', o);

/** Wake the API. The answer is ignored; a failure is not an error because nothing depends on it. */
export function warmUp(): Promise<void> {
    return getHealth().then(
        () => undefined,
        () => undefined,
    );
}

/** A message for a person, not a status code. */
export function describeError(error: ApiError): string {
    switch (error.code) {
        case 'timeout':
            return 'The server took too long to answer. It may still be starting up.';
        case 'network':
            return 'Could not reach the server. Check your connection and try again.';
        case 'store_unavailable':
            return 'The prediction data is temporarily unavailable. Try again in a moment.';
        case 'snapshot_not_found':
            return 'There are no predictions for that season yet.';
        case 'backtest_not_found':
            return 'The backtest report has not been published yet.';
        case 'unknown_team':
            return 'That team has no predictions for this season.';
        default:
            return error.message || 'Something went wrong.';
    }
}
