import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, describeError, getSeasons, getTeams, isAbort, postOdds, request, warmUp } from './client';

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const errorBody = (code: string, message: string) => ({ error: { code, message, details: {} } });

afterEach(() => vi.useRealTimers());

describe('request', () => {
    it('returns the parsed body of a successful answer', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ok: 1 })));
        await expect(request('/x')).resolves.toEqual({ ok: 1 });
    });

    it('turns the API error shape into an ApiError and does not retry a 4xx', async () => {
        const fetchMock = vi.fn().mockResolvedValue(json(errorBody('unknown_team', 'No team'), 404));
        vi.stubGlobal('fetch', fetchMock);
        const err = await request('/x').catch((e: unknown) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err).toMatchObject({ code: 'unknown_team', status: 404, message: 'No team' });
        expect((err as ApiError).retryable).toBe(false);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retries 503 with a pause and succeeds when the server is back', async () => {
        vi.useFakeTimers();
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json(errorBody('store_unavailable', 'down'), 503))
            .mockResolvedValueOnce(json({ ok: 2 }));
        vi.stubGlobal('fetch', fetchMock);
        const pending = request('/x');
        await vi.advanceTimersByTimeAsync(1_000);
        await expect(pending).resolves.toEqual({ ok: 2 });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('gives up after the retries and reports the last error', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json(errorBody('store_unavailable', 'down'), 503)));
        vi.stubGlobal('fetch', fetchMock);
        const pending = request('/x').catch((e: unknown) => e);
        await vi.advanceTimersByTimeAsync(10_000);
        const err = (await pending) as ApiError;
        expect(err.code).toBe('store_unavailable');
        expect(err.retryable).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(3); // the first try and two retries
    });

    it('treats a network failure as retryable and names it', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        const pending = request('/x', { retries: 1 }).catch((e: unknown) => e);
        await vi.advanceTimersByTimeAsync(1_000);
        expect(await pending).toMatchObject({ code: 'network', status: 0 });
    });

    it('times out a request that never answers', async () => {
        vi.useFakeTimers();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))))),
        );
        const pending = request('/x', { timeoutMs: 5_000, retries: 0 }).catch((e: unknown) => e);
        await vi.advanceTimersByTimeAsync(5_000);
        expect(await pending).toMatchObject({ code: 'timeout' });
    });

    it('stops without retrying when the caller cancels', async () => {
        const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')))));
        vi.stubGlobal('fetch', fetchMock);
        const controller = new AbortController();
        const pending = request('/x', { signal: controller.signal }).catch((e: unknown) => e);
        controller.abort();
        const err = await pending;
        expect(isAbort(err)).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('sends a POST body as JSON', async () => {
        const fetchMock = vi.fn().mockResolvedValue(json({ ok: 1 }));
        vi.stubGlobal('fetch', fetchMock);
        await postOdds(2026, [{ team_a: 'a', team_b: 'b', winner: 'a' }], [1, 2, 3, 4, 5, 6]);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toMatch(/\/v1\/bracket\/2026\/odds$/);
        expect(init.method).toBe('POST');
        expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
        expect(JSON.parse(init.body as string)).toEqual({ results: [{ team_a: 'a', team_b: 'b', winner: 'a' }], scoring: [1, 2, 3, 4, 5, 6] });
    });

    it('falls back to a plain error when the body is not the API shape', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>nope</html>', { status: 404 })));
        await expect(request('/x')).rejects.toMatchObject({ code: 'http_error', status: 404 });
    });
});

describe('lists', () => {
    it('keeps the season list for a while and asks again after a failure', async () => {
        vi.useFakeTimers();
        const fetchMock = vi
            .fn()
            .mockImplementationOnce(() => Promise.resolve(json(errorBody('bad', 'bad'), 400)))
            .mockImplementation(() => Promise.resolve(json({ seasons: [] })));
        vi.stubGlobal('fetch', fetchMock);
        await expect(getSeasons()).rejects.toBeInstanceOf(ApiError);
        await getSeasons();
        await getSeasons();
        expect(fetchMock).toHaveBeenCalledTimes(2); // the failure was not kept, the success was
        await getTeams(2026);
        await getTeams(2026);
        await getTeams(2025);
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });
});

describe('warmUp', () => {
    it('never throws, even when the server is down', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('down')));
        await expect(warmUp()).resolves.toBeUndefined();
    });
});

describe('describeError', () => {
    it('speaks in plain words', () => {
        expect(describeError(new ApiError('store_unavailable', 'x', 503))).toMatch(/temporarily unavailable/);
        expect(describeError(new ApiError('network', 'x'))).toMatch(/Could not reach/);
        expect(describeError(new ApiError('something_else', 'The server said so', 400))).toBe('The server said so');
    });
});
