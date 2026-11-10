import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import MetricPicker from '../../components/mui-dropdown/my-dropdown';
import { getTeamStats } from '../../services/api';
import type { TeamStats } from '../../services/api';
import { METRICS, defaultWeights, predict } from '../../utils/metrics';
import './compare.scss';

interface WeightsPlaygroundProps {
    teamAId: string;
    teamBId: string;
}

/**
 * The original compare page: a simple formula whose weights you set. It is separate from the model on the other tab,
 * uses the older /teams data, and is not a prediction from the model.
 */
export default function WeightsPlayground({ teamAId, teamBId }: WeightsPlaygroundProps) {
    const [teamA, setTeamA] = useState<TeamStats | null>(null);
    const [teamB, setTeamB] = useState<TeamStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeKeys, setActiveKeys] = useState<string[]>(METRICS.map((m) => m.key));
    const [weights, setWeights] = useState(defaultWeights());

    useEffect(() => {
        let current = true;
        Promise.all([getTeamStats(teamAId), getTeamStats(teamBId)])
            .then(([a, b]) => {
                if (!current) return;
                setTeamA(a);
                setTeamB(b);
            })
            .catch(() => current && setError('Could not load the stats for these teams.'));
        return () => {
            current = false;
        };
    }, [teamAId, teamBId]);

    const activeMetrics = useMemo(() => METRICS.filter((m) => activeKeys.includes(m.key)), [activeKeys]);
    const result = useMemo(() => {
        if (!teamA || !teamB) return null;
        return predict(teamA.stats, teamB.stats, weights, activeMetrics);
    }, [teamA, teamB, weights, activeMetrics]);

    const intro = (
        <Alert severity="info" icon={false}>
            This is a simple formula you control. It does not use the model and is not its prediction. Move the sliders to see how much each stat matters to you.
        </Alert>
    );
    if (error) return <div className="compare__playground">{intro}<Typography color="error">{error}</Typography></div>;
    if (!teamA || !teamB || !result) return <div className="compare__playground">{intro}<Typography>Loading…</Typography></div>;

    return (
        <div className="compare__playground">
            {intro}
            <Box className="compare__probability">
                <Typography variant="h6">
                    {teamA.name} {Math.round(result.teamAWinProbability * 100)}% &mdash; {Math.round(result.teamBWinProbability * 100)}% {teamB.name}
                </Typography>
                <LinearProgress variant="determinate" value={result.teamAWinProbability * 100} className="compare__probability-bar" />
            </Box>

            <TableContainer component={Paper} variant="outlined">
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
                        <Typography className="compare__weight-label" id={`weight-${metric.key}`}>
                            {metric.label}
                        </Typography>
                        <Slider
                            aria-labelledby={`weight-${metric.key}`}
                            value={weights[metric.key] ?? metric.defaultWeight}
                            onChange={(_event, value) => setWeights((prev) => ({ ...prev, [metric.key]: value }))}
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
                <TableContainer component={Paper} variant="outlined">
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
        </div>
    );
}
