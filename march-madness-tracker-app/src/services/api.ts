export interface Team {
    id: string;
    name: string;
    seed: number;
    conference: string;
    record: string;
}

export interface TeamStats {
    id: string;
    name: string;
    seed: number;
    conference: string;
    record: string;
    season: number;
    stats: Record<string, number>;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

async function request<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) {
        throw new Error(`Request to ${path} failed with status ${response.status}`);
    }
    return response.json() as Promise<T>;
}

export function getTeams(): Promise<Team[]> {
    return request<Team[]>('/teams');
}

export function getTeamStats(teamId: string, season?: number): Promise<TeamStats> {
    const query = season ? `?season=${season}` : '';
    return request<TeamStats>(`/teams/${teamId}/stats${query}`);
}
