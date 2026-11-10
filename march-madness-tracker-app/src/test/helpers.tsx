import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

export interface Call {
    method: string;
    url: URL;
    body: unknown;
}

type Handler = unknown | ((url: URL, body: unknown) => unknown);

/**
 * Replace fetch with canned answers, keyed "GET /path" or "POST /path". A handler can be a value, a function, or a Response
 * (to return an error). Anything not listed answers 404 in the API's error shape. Every call is recorded.
 */
export function stubApi(handlers: Record<string, Handler>) {
    const calls: Call[] = [];
    const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? 'GET';
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
        calls.push({ method, url, body });
        const h = handlers[`${method} ${url.pathname}`];
        if (h === undefined) {
            return new Response(JSON.stringify({ error: { code: 'not_found', message: 'not stubbed', details: {} } }), { status: 404 });
        }
        const out = typeof h === 'function' ? (h as (u: URL, b: unknown) => unknown)(url, body) : h;
        return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
    });
    vi.stubGlobal('fetch', fn);
    return { calls, fn, to: (method: string, path: string) => calls.filter((c) => c.method === method && c.url.pathname === path) };
}

/** Render a page at a URL, with the route pattern it would have in the app. */
export function renderPage(element: ReactElement, { path, route }: { path: string; route: string }) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path={route} element={element} />
            </Routes>
        </MemoryRouter>,
    );
}
