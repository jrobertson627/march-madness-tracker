import { useMemo } from 'react';

import { getSeasons } from '../services/v1/client';
import { useApi } from './useApi';

/** The seasons that have published predictions, newest first. */
export function useSeasons() {
    const api = useApi('seasons', () => getSeasons());
    const list = useMemo(() => (api.data?.seasons.map((s) => s.season) ?? []).sort((a, b) => b - a), [api.data]);
    return { ...api, list, latest: list[0] ?? null };
}
