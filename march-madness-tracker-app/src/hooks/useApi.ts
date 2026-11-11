import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, isAbort } from '../services/v1/client';

export type ApiStatus = 'idle' | 'loading' | 'waking' | 'success' | 'error';

/** A request still pending after this long is probably waiting for a sleeping free server. */
export const WAKING_AFTER_MS = 4_000;

export interface ApiState<T> {
    status: ApiStatus;
    /** The last answer. It stays while a new request runs, so a page can dim it instead of blanking it. */
    data: T | null;
    error: ApiError | null;
    /** A new request is running and `data` is from an earlier one. */
    updating: boolean;
    retry: () => void;
}

interface Inner<T> {
    status: ApiStatus;
    data: T | null;
    error: ApiError | null;
}

/**
 * Run one request per `key`. When the key changes the previous request is canceled and a late answer from it is
 * ignored. `null` means there is nothing to ask for yet. After `wakingAfterMs` without an answer the status becomes
 * `waking`, which pages show as "the server is starting".
 */
export function useApi<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>, wakingAfterMs = WAKING_AFTER_MS): ApiState<T> {
    const [state, setState] = useState<Inner<T>>({ status: 'idle', data: null, error: null });
    const [attempt, setAttempt] = useState(0);
    const latest = useRef(fetcher);
    latest.current = fetcher;

    useEffect(() => {
        if (key === null) {
            setState({ status: 'idle', data: null, error: null });
            return;
        }
        const controller = new AbortController();
        setState((s) => ({ status: 'loading', data: s.data, error: null }));
        const timer = setTimeout(() => {
            if (!controller.signal.aborted) setState((s) => (s.status === 'loading' ? { ...s, status: 'waking' } : s));
        }, wakingAfterMs);
        latest.current(controller.signal).then(
            (data) => {
                if (controller.signal.aborted) return;
                clearTimeout(timer);
                setState({ status: 'success', data, error: null });
            },
            (error: unknown) => {
                clearTimeout(timer);
                if (controller.signal.aborted || isAbort(error)) return;
                const apiError = error instanceof ApiError ? error : new ApiError('unknown', error instanceof Error ? error.message : 'Something went wrong.');
                setState((s) => ({ status: 'error', data: s.data, error: apiError }));
            },
        );
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [key, attempt, wakingAfterMs]);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);
    const pending = state.status === 'loading' || state.status === 'waking';
    return { ...state, updating: pending && state.data !== null, retry };
}
