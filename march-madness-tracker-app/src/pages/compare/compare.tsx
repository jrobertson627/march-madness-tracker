import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';

import MetricPicker from '../../components/mui-dropdown/my-dropdown';
import { getTeamStats } from '../../services/api';
import type { TeamStats } from '../../services/api';
import { METRICS, defaultWeights, predict } from '../../utils/metrics';
import './compare.scss';

function Compare() {
    const [searchParams] = useSearchParams();
    const teamAId = searchParams.get('teamA');
    const teamBId = searchParams.get('teamB');

    const [teamA, setTeamA] = useState<TeamStats | null>(null);
    const [teamB, setTeamB] = useState<TeamStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeKeys, setActiveKeys] = useState<string[]>(METRICS.map((m) => m.key));
    const [weights, setWeights] = useState(defaultWeights());

    useEffect(() => {
        if (!teamAId || !teamBId) return;
        Promise.all([getTeamStats(teamAId), getTeamStats(teamBId)])
            .then(([a, b]) => {
                setTeamA(a);
                setTeamB(b);
            })
            .catch(() => setError('Unable to load team stats. Is the API running?'));
    }, [teamAId, teamBId]);

    const activeMetrics = useMemo(
        () => METRICS.filter((m) => activeKeys.includes(m.key)),
        [activeKeys],
    );

    const result = useMemo(() => {
        if (!teamA || !teamB) return null;
        return predict(teamA.stats, teamB.stats, weights, activeMetrics);
    }, [teamA, teamB, weights, activeMetrics]);

    if (!teamAId || !teamBId) {
        return (
            <div className="compare">
                <Typography>Pick two teams first.</Typography>
                <Link to="/welcome">Back to team select</Link>
            </div>
        );
    }

    if (error) {
        return <div className="compare"><Typography color="error">{error}</Typography></div>;
    }

    if (!teamA || !teamB || !result) {
        return <div className="compare"><Typography>Loading…</Typography></div>;
    }

    const handleWeightChange = (key: string, value: number) => {
        setWeights((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="compare">
            <Typography variant="h4" component="h1">{teamA.name} vs {teamB.name}</Typography>

            <Box className="compare__probability">
                <Typography variant="h6">
                    {teamA.name} {Math.round(result.teamAWinProbability * 100)}% &mdash; {Math.round(result.teamBWinProbability * 100)}% {teamB.name}
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={result.teamAWinProbability * 100}
                    className="compare__probability-bar"
                />
            </Box>

            <TableContainer component={Paper} className="compare__table">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Metric</TableCell>
                            <TableCell align="right">{teamA.name} (#{teamA.seed})</TableCell>
                            <TableCell align="right">{teamB.name} (#{teamB.seed})</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>Record</TableCell>
                            <TableCell align="right">{teamA.record}</TableCell>
                            <TableCell align="right">{teamB.record}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Conference</TableCell>
                            <TableCell align="right">{teamA.conference}</TableCell>
                            <TableCell align="right">{teamB.conference}</TableCell>
                        </TableRow>
                        {METRICS.map((metric) => (
                            <TableRow key={metric.key}>
                                <TableCell>{metric.label}</TableCell>
                                <TableCell align="right">{teamA.stats[metric.key]}</TableCell>
                                <TableCell align="right">{teamB.stats[metric.key]}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <div className="compare__weights">
                <Typography variant="h6">Weight the metrics that matter to you</Typography>
                <MetricPicker activeKeys={activeKeys} onChange={setActiveKeys} />
                {activeMetrics.map((metric) => (
                    <div className="compare__weight-row" key={metric.key}>
                        <Typography className="compare__weight-label">{metric.label}</Typography>
                        <Slider
                            value={weights[metric.key] ?? metric.defaultWeight}
                            onChange={(_event, value) => handleWeightChange(metric.key, value as number)}
                            min={0}
                            max={2}
                            step={0.1}
                            valueLabelDisplay="auto"
                        />
                    </div>
                ))}
            </div>

            <div className="compare__breakdown">
                <Typography variant="h6">Why?</Typography>
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Metric</TableCell>
                                <TableCell align="right">Favors</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {result.breakdown.map((row) => (
                                <TableRow key={row.key}>
                                    <TableCell>{row.label}</TableCell>
                                    <TableCell align="right">
                                        {row.contribution === 0
                                            ? 'Even'
                                            : row.contribution > 0
                                                ? `${teamA.name} (+${row.contribution.toFixed(2)})`
                                                : `${teamB.name} (+${Math.abs(row.contribution).toFixed(2)})`}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>

            <Link to="/welcome">Back to team select</Link>
        </div>
    );
}

export default Compare;
