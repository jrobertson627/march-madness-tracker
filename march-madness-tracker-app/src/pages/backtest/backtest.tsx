import { useState } from 'react';
import { Link } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import StatusBanner from '../../components/status-banner/status-banner';
import { useApi } from '../../hooks/useApi';
import { getBacktest } from '../../services/v1/client';
import type { BacktestResponse, PairedRow, PickPointsRow, Season } from '../../services/v1/types';
import { summarize } from '../../utils/backtestSummary';
import { pct, score, teamLabel } from '../../utils/format';
import ScoreTable from './score-table';
import type { Metric } from './score-table';
import './backtest.scss';

// A coin flip scores 0.693 per game and about 0.33 per advancement event; the bars use those as full width
const GAME_SCALE = 0.7;
const ADVANCEMENT_SCALE = 0.35;
const BRIER_GAME_SCALE = 0.26;
const BRIER_ADVANCEMENT_SCALE = 0.11;

function PairedTable({ rows }: { rows: PairedRow[] }) {
    if (rows.length === 0) return null;
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Model against each baseline, game by game">
                <TableHead>
                    <TableRow>
                        <TableCell>Model against</TableCell>
                        <TableCell align="right">Games</TableCell>
                        <TableCell align="right">Difference in log loss</TableCell>
                        <TableCell align="right">95% interval</TableCell>
                        <TableCell>Is zero outside the interval?</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((p) => (
                        <TableRow key={`${p.candidate}-${p.baseline}`}>
                            <TableCell component="th" scope="row">
                                {p.baseline}
                            </TableCell>
                            <TableCell align="right" className="backtest__num">
                                {p.games}
                            </TableCell>
                            <TableCell align="right" className="backtest__num">
                                {score(p.diff)}
                            </TableCell>
                            <TableCell align="right" className="backtest__num">
                                {score(p.low)} to {score(p.high)}
                            </TableCell>
                            <TableCell>{p.interval_excludes_zero ? 'Yes' : 'No: could be noise'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function PicksTable({ rows }: { rows: PickPointsRow[] }) {
    if (rows.length === 0) return null;
    const seasons = [...new Set(rows.map((r) => r.season))].sort();
    const strategies = [...new Set(rows.map((r) => r.strategy))];
    const cell = (strategy: string, season: number) => rows.find((r) => r.strategy === strategy && r.season === season);
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Points scored by each way of filling in a bracket">
                <TableHead>
                    <TableRow>
                        <TableCell>Picks</TableCell>
                        {seasons.map((s) => (
                            <TableCell key={s} align="right">
                                {s}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {strategies.map((st) => (
                        <TableRow key={st}>
                            <TableCell component="th" scope="row">
                                {st[0].toUpperCase() + st.slice(1)}
                            </TableCell>
                            {seasons.map((s) => {
                                const c = cell(st, s);
                                return (
                                    <TableCell key={s} align="right" className="backtest__num">
                                        {c?.realized ?? '–'} <span className="backtest__expected">({c?.expected ?? '–'} expected)</span>
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function Panel({ report, which, metric }: { report: BacktestResponse; which: 'selection' | 'locked'; metric: Metric }) {
    const sel = report.selection;
    const lk = report.locked;
    const isLocked = which === 'locked' && lk;
    const seasons: Season[] = isLocked ? [lk.season] : [...sel.seasons, 'all'];
    const games = isLocked ? lk.games_scored : sel.games_scored;
    const adv = isLocked ? lk.advancement : sel.advancement;
    const gameScale = metric === 'log_loss' ? GAME_SCALE : BRIER_GAME_SCALE;
    const advScale = metric === 'log_loss' ? ADVANCEMENT_SCALE : BRIER_ADVANCEMENT_SCALE;
    const label = metric === 'log_loss' ? 'log loss' : 'Brier score';
    const prefix = isLocked ? `${lk.season}, scored once` : `${sel.seasons[0]} to ${sel.seasons[sel.seasons.length - 1]}`;
    return (
        <div className="backtest__panel-body">
            <h3 className="backtest__h3">Single games</h3>
            <p className="backtest__note">The chance each method gave the winner of every tournament game, scored as {label}. Lower is better.</p>
            <ScoreTable caption={`${prefix}: single games, ${label}`} rows={games} seasons={seasons} metric={metric} scale={gameScale} />

            <h3 className="backtest__h3">Reaching each round</h3>
            <p className="backtest__note">
                The chance each method gave every team of reaching every round of the whole bracket, scored as {label}. Lower is better.
            </p>
            <ScoreTable caption={`${prefix}: reaching each round, ${label}`} rows={adv} seasons={seasons} metric={metric} scale={advScale} />

            <h3 className="backtest__h3">Is the model's lead real?</h3>
            <p className="backtest__note">Each row compares the model with a baseline on the same games. A negative difference means the model scored lower.</p>
            <PairedTable rows={isLocked ? lk.paired : sel.paired} />

            <h3 className="backtest__h3">Bracket points</h3>
            <p className="backtest__note">Points scored by each way of filling in a bracket under the 10, 20, 40, 80, 160, 320 scoring, and the points expected beforehand.</p>
            <PicksTable rows={isLocked ? lk.picks : sel.picks} />
        </div>
    );
}

function BacktestPage() {
    const report = useApi('backtest', (signal) => getBacktest({ signal }));
    const [metric, setMetric] = useState<Metric>('log_loss');
    const r = report.data;
    const summary = r ? summarize(r) : [];
    const flagged = r?.selection.upset_flags.filter((f) => f.model_picks_upset) ?? [];
    const s = r?.selection.upset_summary;

    return (
        <div className="backtest">
            <Typography variant="h4" component="h1">
                How the model did on past tournaments
            </Typography>
            <StatusBanner status={report.status} error={report.error} onRetry={report.retry} />

            {r && (
                <>
                    <section className="backtest__summary" aria-labelledby="summary-heading">
                        <Typography variant="h6" component="h2" id="summary-heading">
                            In short
                        </Typography>
                        <ul>
                            {summary.map((line) => (
                                <li key={line}>{line}</li>
                            ))}
                        </ul>
                        <Typography variant="body2" color="text.secondary">
                            Model <code>{r.model_id}</code>, report made {r.created_at.slice(0, 10)}.
                        </Typography>
                    </section>

                    <div className="backtest__metric">
                        <Typography variant="caption" component="div" id="metric-label">
                            Score
                        </Typography>
                        <ToggleButtonGroup size="small" exclusive value={metric} aria-labelledby="metric-label" onChange={(_e, v: Metric | null) => v && setMetric(v)}>
                            <ToggleButton value="log_loss">Log loss</ToggleButton>
                            <ToggleButton value="brier">Brier score</ToggleButton>
                        </ToggleButtonGroup>
                    </div>

                    <section aria-labelledby="selection-heading" className="backtest__panel">
                        <Typography variant="h5" component="h2" id="selection-heading">
                            {r.selection.seasons[0]} to {r.selection.seasons[r.selection.seasons.length - 1]}: the seasons used to choose the design
                        </Typography>
                        <p className="backtest__note">
                            Every setting of the model was picked by looking at these seasons, so they flatter it a little. Each season was scored with a model that had not
                            trained on it.
                        </p>
                        <Panel report={r} which="selection" metric={metric} />
                    </section>

                    {r.locked && (
                        <section aria-labelledby="locked-heading" className="backtest__panel backtest__panel--locked">
                            <Typography variant="h5" component="h2" id="locked-heading">
                                {r.locked.season}: scored once, after the design was chosen
                            </Typography>
                            <p className="backtest__note">
                                Nothing was adjusted after seeing these games, so this is the only comparison the choice of design did not influence. It is also a small sample.
                            </p>
                            <Panel report={r} which="locked" metric={metric} />
                        </section>
                    )}

                    {s && (
                        <section aria-labelledby="upsets-heading" className="backtest__panel">
                            <Typography variant="h5" component="h2" id="upsets-heading">
                                First-round upsets
                            </Typography>
                            <p className="backtest__note">
                                In {r.selection.seasons[0]} to {r.selection.seasons[r.selection.seasons.length - 1]}, {s.all_games.games} first-round games were checked: {s.all_games.upsets} were upsets ({pct(s.all_games.upsets / s.all_games.games)}).
                            </p>
                            <ul className="backtest__upsets">
                                <li>
                                    The model gave the underdog the better chance in {s.model_picks_upset.games} games, and {s.model_picks_upset.upsets} were upsets (
                                    {pct(s.model_picks_upset.games ? s.model_picks_upset.upsets / s.model_picks_upset.games : null)}).
                                </li>
                                <li>
                                    No signal at all: {s.no_flag.games} games, {s.no_flag.upsets} upsets ({pct(s.no_flag.games ? s.no_flag.upsets / s.no_flag.games : null)}).
                                </li>
                                <li>
                                    The underdog was 15 points above its seed's usual rate: {s.model_above_history.games} games, {s.model_above_history.upsets} upsets (
                                    {pct(s.model_above_history.games ? s.model_above_history.upsets / s.model_above_history.games : null)}). This one did not beat the base rate.
                                </li>
                            </ul>
                            {flagged.length > 0 && (
                                <details>
                                    <summary>Games where the model picked the upset ({flagged.length})</summary>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small" aria-label="Games where the model picked the upset">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Season</TableCell>
                                                    <TableCell>Game</TableCell>
                                                    <TableCell align="right">Underdog's chance</TableCell>
                                                    <TableCell>What happened</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {flagged.map((f) => (
                                                    <TableRow key={`${f.season}-${f.favorite}-${f.underdog}`}>
                                                        <TableCell>{f.season}</TableCell>
                                                        <TableCell>
                                                            ({f.favorite_seed}) {teamLabel(f.favorite, f.favorite_name)} against ({f.underdog_seed}) {teamLabel(f.underdog, f.underdog_name)}
                                                        </TableCell>
                                                        <TableCell align="right" className="backtest__num">
                                                            {pct(f.p_underdog_model)}
                                                        </TableCell>
                                                        <TableCell>{f.upset ? 'Upset' : 'Favorite won'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </details>
                            )}
                        </section>
                    )}

                    <section aria-labelledby="limits-heading" className="backtest__panel">
                        <Typography variant="h5" component="h2" id="limits-heading">
                            What to keep in mind
                        </Typography>
                        <ul>
                            {r.limits.map((l) => (
                                <li key={l}>{l}</li>
                            ))}
                        </ul>
                    </section>

                    <nav aria-label="Brackets by season" className="backtest__seasons">
                        <Typography variant="body2">See a past bracket with what actually happened:</Typography>
                        {[...r.selection.seasons, ...(r.locked ? [r.locked.season] : [])].map((s2) => (
                            <Link key={s2} to={`/bracket/${s2}`}>
                                {s2}
                            </Link>
                        ))}
                    </nav>
                </>
            )}
        </div>
    );
}

export default BacktestPage;
