import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import TeamAutocomplete from '../../components/mui-autocomplete/mui-autocomplete';
import { getTeams } from '../../services/api';
import type { Team } from '../../services/api';
import './initial-search.scss';

function InitialSearch() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamA, setTeamA] = useState<Team | null>(null);
    const [teamB, setTeamB] = useState<Team | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        getTeams()
            .then(setTeams)
            .catch(() => setError('Unable to load teams. Is the API running?'));
    }, []);

    const handleCompare = () => {
        if (!teamA || !teamB) return;
        navigate(`/compare?teamA=${teamA.id}&teamB=${teamB.id}`);
    };

    return (
        <div className="initial-search">
            <Typography variant="h4" component="h1">March Madness Tracker</Typography>
            {error && <Typography color="error">{error}</Typography>}
            <div className="initial-search__pickers">
                <TeamAutocomplete label="Team 1" options={teams} value={teamA} onChange={setTeamA} />
                <TeamAutocomplete label="Team 2" options={teams} value={teamB} onChange={setTeamB} />
            </div>
            <Button
                variant="contained"
                disabled={!teamA || !teamB || teamA.id === teamB.id}
                onClick={handleCompare}
            >
                Compare
            </Button>
        </div>
    )
}

export default InitialSearch;
