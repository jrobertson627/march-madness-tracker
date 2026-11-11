import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../services/v1/client';
import { useApi, WAKING_AFTER_MS } from './useApi';

function deferred<T>() {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe('useApi', () => {
    it('is idle without a key', () => {
        const fetcher = vi.fn();
        const { result } = renderHook(() => useApi(null, fetcher));
        expect(result.current.status).toBe('idle');
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('goes from loading to success', async () => {
        const d = deferred<string>();
        const { result } = renderHook(() => useApi('a', () => d.promise));
        expect(result.current.status).toBe('loading');
        await act(async () => d.resolve('hello'));
        expect(result.current).toMatchObject({ status: 'success', data: 'hello', updating: false });
    });

    it('says the server is waking up when the answer takes longer than the limit, then recovers', async () => {
        vi.useFakeTimers();
        const d = deferred<string>();
        const { result } = renderHook(() => useApi('a', () => d.promise));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(WAKING_AFTER_MS - 1);
        });
        expect(result.current.status).toBe('loading');
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2);
        });
        expect(result.current.status).toBe('waking');
        await act(async () => d.resolve('done'));
        expect(result.current).toMatchObject({ status: 'success', data: 'done' });
    });

    it('reports an error as an ApiError and keeps the last good data', async () => {
        const first = deferred<string>();
        const second = deferred<string>();
        const fetchers = [first, second];
        let n = 0;
        const { result, rerender } = renderHook(({ k }) => useApi(k, () => fetchers[n++].promise), { initialProps: { k: 'a' } });
        await act(async () => first.resolve('kept'));
        rerender({ k: 'b' });
        expect(result.current).toMatchObject({ status: 'loading', data: 'kept', updating: true });
        await act(async () => second.reject(new ApiError('store_unavailable', 'down', 503)));
        expect(result.current.status).toBe('error');
        expect(result.current.error).toMatchObject({ code: 'store_unavailable' });
        expect(result.current.data).toBe('kept');
    });

    it('ignores a late answer from a request that was replaced', async () => {
        const slow = deferred<string>();
        const fast = deferred<string>();
        const fetchers: Record<string, ReturnType<typeof deferred<string>>> = { a: slow, b: fast };
        const { result, rerender } = renderHook(({ k }) => useApi(k, () => fetchers[k].promise), { initialProps: { k: 'a' } });
        rerender({ k: 'b' });
        await act(async () => fast.resolve('B'));
        await act(async () => slow.resolve('A, too late'));
        expect(result.current.data).toBe('B');
        expect(result.current.status).toBe('success');
    });

    it('cancels the request when the key changes', async () => {
        const signals: AbortSignal[] = [];
        const { rerender } = renderHook(
            ({ k }) =>
                useApi(k, (signal) => {
                    signals.push(signal);
                    return new Promise<string>(() => {});
                }),
            { initialProps: { k: 'a' } },
        );
        rerender({ k: 'b' });
        expect(signals[0].aborted).toBe(true);
        expect(signals[1].aborted).toBe(false);
    });

    it('asks again when retry is called', async () => {
        const fetcher = vi.fn().mockRejectedValueOnce(new ApiError('network', 'x')).mockResolvedValueOnce('ok');
        const { result } = renderHook(() => useApi('a', fetcher));
        await waitFor(() => expect(result.current.status).toBe('error'));
        act(() => result.current.retry());
        await waitFor(() => expect(result.current).toMatchObject({ status: 'success', data: 'ok' }));
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('clears everything when the key goes back to null', async () => {
        const { result, rerender } = renderHook(({ k }) => useApi<string>(k, () => Promise.resolve('x')), { initialProps: { k: 'a' as string | null } });
        await waitFor(() => expect(result.current.data).toBe('x'));
        rerender({ k: null });
        expect(result.current).toMatchObject({ status: 'idle', data: null });
    });
});
