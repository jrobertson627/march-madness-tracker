import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import SeasonSelect from '../../components/season-select/season-select';
import StatusBanner from '../../components/status-banner/status-banner';
import TeamAutocomplete from '../../components/mui-autocomplete/mui-autocomplete';
import type { TeamOption } from '../../components/mui-autocomplete/mui-autocomplete';
import { useApi } from '../../hooks/useApi';
import { useSeasons } from '../../hooks/useSeasons';
import { getTeams } from '../../services/v1/client';
import { teamLabel } from '../../utils/format';
import { pickSeason } from '../../utils/season';
import './initial-search.scss';

function InitialSearch() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const seasons = useSeasons();
    const season = pickSeason(params.get('season'), seasons.list, seasons.latest);
    // a season in progress has no bracket yet, so the link goes to the newest season that has one
    const bracketSeason = season !== null && seasons.withBracket.includes(season) ? season : seasons.latestBracket;
    const teams = useApi(season === null ? null : `teams:${season}`, () => getTeams(season as number));
    const [teamA, setTeamA] = useState<TeamOption | null>(null);
    const [teamB, setTeamB] = useState<TeamOption | null>(null);

    const options = useMemo<TeamOption[]>(
        () => (teams.data?.teams ?? []).map((t) => ({ id: t.id, label: teamLabel(t.id, t.name), seed: t.seed })),
        [teams.data],
    );

    // keep a chosen team when the season changes and the team has predictions in both seasons
    useEffect(() => {
        setTeamA((a) => (a && options.find((o) => o.id === a.id)) || null);
        setTeamB((b) => (b && options.find((o) => o.id === b.id)) || null);
    }, [options]);

    const failed = seasons.status === 'error' ? seasons : teams;
    const handleCompare = () => {
        if (!teamA || !teamB || season === null) return;
        navigate(`/compare?teamA=${teamA.id}&teamB=${teamB.id}&season=${season}`);
    };

    return (
        <div className="initial-search">
            <Typography variant="h4" component="h1">
                Compare two teams
            </Typography>
            <Typography color="text.secondary" className="initial-search__lede">
                Pick a season and two teams to see the model's chance for each, a projected score, and what drives the difference.
            </Typography>
            <StatusBanner status={failed.status} error={failed.error} onRetry={failed.retry} />
            <SeasonSelect
                value={season}
                seasons={seasons.list}
                onChange={(s) => setParams({ season: String(s) }, { replace: true })}
            />
            <div className="initial-search__pickers">
                <TeamAutocomplete label="Team 1" options={options} value={teamA} onChange={setTeamA} loading={teams.status === 'loading'} />
                <TeamAutocomplete label="Team 2" options={options} value={teamB} onChange={setTeamB} loading={teams.status === 'loading'} />
            </div>
            <Button variant="contained" disabled={!teamA || !teamB || teamA.id === teamB.id || season === null} onClick={handleCompare}>
                Compare
            </Button>
            <nav className="initial-search__links" aria-label="Other pages">
                <Link to={bracketSeason === null ? '/bracket' : `/bracket/${bracketSeason}`}>See the {bracketSeason ?? ''} bracket, with odds for every team</Link>
                <Link to="/backtest">See how the model did on past tournaments</Link>
            </nav>
        </div>
    );
}

export default InitialSearch;
