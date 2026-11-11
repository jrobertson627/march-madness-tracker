import { useMemo } from 'react';

import { getSeasons } from '../services/v1/client';
import { useApi } from './useApi';

/**
 * The seasons that have published predictions, newest first. A season in progress has predictions for the compare
 * page but no bracket until Selection Sunday, so the bracket page uses `withBracket` and `latestBracket`.
 */
export function useSeasons() {
    const api = useApi('seasons', () => getSeasons());
    const list = useMemo(() => (api.data?.seasons.map((s) => s.season) ?? []).sort((a, b) => b - a), [api.data]);
    const withBracket = useMemo(() => (api.data?.seasons.filter((s) => s.has_bracket).map((s) => s.season) ?? []).sort((a, b) => b - a), [api.data]);
    return { ...api, list, latest: list[0] ?? null, withBracket, latestBracket: withBracket[0] ?? null };
}
