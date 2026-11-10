import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import BracketGame from '../../components/bracket-game/bracket-game';
import ModelBadge from '../../components/model-badge/model-badge';
import { FinalFour, RegionBracket } from '../../components/region-bracket/region-bracket';
import SeasonSelect from '../../components/season-select/season-select';
import StatusBanner from '../../components/status-banner/status-banner';
import TitleOdds from '../../components/title-odds/title-odds';
import { useApi } from '../../hooks/useApi';
import { useDebounced } from '../../hooks/useDebounced';
import { useSeasons } from '../../hooks/useSeasons';
import { describeError, getBracket, postOdds } from '../../services/v1/client';
import type { PickSet } from '../../services/v1/types';
import {
    PICK_SETS,
    SCORING_PRESETS,
    buildModel,
    gameKey,
    locksFromResults,
    participants,
    pickIndex,
    playedIndex,
    resolveLocks,
    scorePicks,
    toggleLock,
    winnersOf,
} from '../../utils/bracketModel';
import type { BracketModel, Lock } from '../../utils/bracketModel';
import { teamLabel } from '../../utils/format';
import { decodeLocks, encodeLocks } from '../../utils/lockState';
import './bracket.scss';

const WIDE = '(min-width: 1700px)';
const WHAT_IF_PAUSE_MS = 300;

function safeModel(build: () => BracketModel): BracketModel | null {
    try {
        return build();
    } catch {
        return null;
    }
}

function BracketPage() {
    const { season: seasonParam } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const seasons = useSeasons();
    const wide = useMediaQuery(WIDE);
    const [tab, setTab] = useState(0);
    const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');

    const season = seasonParam && Number.isInteger(Number(seasonParam)) ? Number(seasonParam) : null;
    const pickSet: PickSet = PICK_SETS.some((p) => p.key === params.get('picks')) ? (params.get('picks') as PickSet) : 'best_expected_points';
    const scoring = SCORING_PRESETS.find((s) => s.key === params.get('scoring')) ?? SCORING_PRESETS[0];
    const locks = useMemo(() => decodeLocks(params.get('lock')), [params]);
    const whatIf = params.get('whatif') === '1' || locks.length > 0;

    const update = (patch: Record<string, string | null>) =>
        setParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                for (const [k, v] of Object.entries(patch)) {
                    if (v === null || v === '') next.delete(k);
                    else next.set(k, v);
                }
                return next;
            },
            { replace: true },
        );

    const base = useApi(season === null ? null : `bracket:${season}:${scoring.key}`, (signal) => getBracket(season as number, scoring.values, { signal }));
    const model = useMemo(() => (base.data ? safeModel(() => buildModel(base.data!)) : null), [base.data]);
    const resolved = useMemo(() => (model ? resolveLocks(model, locks) : { valid: [] as Lock[], results: [], dropped: [] as Lock[] }), [model, locks]);

    // one request after a run of clicks: the locks are sent 300 ms after the last change
    const lockText = encodeLocks(resolved.valid);
    const settledText = useDebounced(lockText, WHAT_IF_PAUSE_MS);
    const odds = useApi(model && settledText !== '' ? `odds:${season}:${scoring.key}:${settledText}` : null, (signal) =>
        postOdds(season as number, model ? resolveLocks(model, decodeLocks(settledText)).results : [], scoring.values, { signal }),
    );

    const showingOdds = lockText !== '' && odds.data !== null;
    const display = showingOdds ? odds.data : base.data;
    const waiting = lockText !== '' && (lockText !== settledText || odds.status === 'loading' || odds.status === 'waking' || odds.data === null) && odds.status !== 'error';
    const updating = base.updating || odds.updating || waiting;

    if (seasonParam === undefined) {
        return seasons.latest !== null ? (
            <Navigate to={`/bracket/${seasons.latest}`} replace />
        ) : (
            <div className="bracket">
                <StatusBanner status={seasons.status} error={seasons.error} onRetry={seasons.retry} />
                <Typography>Looking for the newest season…</Typography>
            </div>
        );
    }

    const name = (id: string) => teamLabel(id, model?.byId[id]?.name);
    const seed = (id: string) => model?.byId[id]?.seed;
    const rows = pickIndex(display?.picks[pickSet]);
    const played = playedIndex(base.data?.results);
    const winners = winnersOf(resolved.valid);
    // locks belong to one season's bracket, so they are not carried to another season
    const changeSeason = (s: number) => {
        const next = new URLSearchParams(params);
        next.delete('lock');
        next.delete('whatif');
        const q = next.toString();
        navigate(`/bracket/${s}${q ? `?${q}` : ''}`);
    };
    const setLocks = (next: Lock[]) => update({ lock: encodeLocks(next), whatif: '1' });

    const renderGame = (round: number, game: number): ReactNode => {
        const key = gameKey(round, game);
        const row = rows.get(key);
        if (!row) return null;
        const [a, b] = model ? participants(model, winners, round, game) : [null, null];
        const lockable = a !== null && b !== null && new Set([a, b]).size === 2 && new Set([a, b]).has(row.team_a) && new Set([a, b]).has(row.team_b);
        return (
            <BracketGame
                pick={row}
                season={season ?? 0}
                name={name}
                seed={seed}
                actual={whatIf ? undefined : played.get(key)}
                whatIf={whatIf ? { active: true, lockable, lockedWinner: winners.get(key), onChoose: (id) => model && setLocks(toggleLock(model, resolved.valid, round, game, id)) } : undefined}
            />
        );
    };

    const firstFour = (model?.slots ?? []).map((teams, slot) => ({ teams, slot })).filter((s) => s.teams.length === 2);
    const pickRows = display?.picks[pickSet] ?? [];
    const score = base.data && base.data.results.length > 0 && !whatIf ? scorePicks(pickRows, base.data.results, scoring.values) : null;
    const upsetCount = (base.data?.first_round ?? []).filter((g) => g.model_picks_upset).length;
    const canReplay = (base.data?.results.length ?? 0) > 0;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopy('copied');
        } catch {
            setCopy('failed');
        }
    };

    const regionNode = (i: number) => (model ? <RegionBracket key={i} title={model.regions[i]} regionIndex={i} renderGame={renderGame} /> : null);

    return (
        <div className="bracket">
            <Typography variant="h4" component="h1">
                {season} bracket
            </Typography>

            <div className="bracket__controls">
                <SeasonSelect value={season} seasons={seasons.list} onChange={changeSeason} />
                <div>
                    <Typography variant="caption" component="div" id="picks-label">
                        Picks
                    </Typography>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={pickSet}
                        aria-labelledby="picks-label"
                        onChange={(_e, v: PickSet | null) => v && update({ picks: v === 'best_expected_points' ? null : v })}
                    >
                        {PICK_SETS.map((p) => (
                            <ToggleButton key={p.key} value={p.key}>
                                {p.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </div>
                <div>
                    <Typography variant="caption" component="div" id="scoring-label">
                        Points per round
                    </Typography>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={scoring.key}
                        aria-labelledby="scoring-label"
                        onChange={(_e, v: string | null) => v && update({ scoring: v === SCORING_PRESETS[0].key ? null : v })}
                    >
                        {SCORING_PRESETS.map((s) => (
                            <ToggleButton key={s.key} value={s.key}>
                                {s.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </div>
            </div>
            <Typography variant="body2" color="text.secondary" className="bracket__blurb">
                {PICK_SETS.find((p) => p.key === pickSet)?.blurb}
            </Typography>

            <StatusBanner status={base.status} error={base.error} onRetry={base.retry} />
            {odds.status === 'waking' && <StatusBanner status="waking" error={null} />}
            {odds.error && (
                <Alert
                    severity="warning"
                    action={
                        <>
                            {odds.error.retryable && (
                                <Button color="inherit" size="small" onClick={odds.retry}>
                                    Retry
                                </Button>
                            )}
                            <Button color="inherit" size="small" onClick={() => update({ lock: null, whatif: '1' })}>
                                Clear locked games
                            </Button>
                        </>
                    }
                >
                    {describeError(odds.error)} The bracket below does not include your last change.
                </Alert>
            )}

            {display && (
                <div className={`bracket__body${updating ? ' bracket__body--updating' : ''}`} aria-busy={updating}>
                    <ModelBadge snapshot={display.snapshot} notes={display.notes} />
                    {updating && <p className="bracket__updating">Updating…</p>}

                    <div className="bracket__summary">
                        <Typography>
                            Expected points for these picks: <strong>{display.expected_points[pickSet] ?? '–'}</strong>
                        </Typography>
                        {score && (
                            <Typography>
                                What happened: these picks got <strong>{score.correct}</strong> of {score.games} games right and scored <strong>{score.points}</strong> of {score.possible} points.
                            </Typography>
                        )}
                        {upsetCount > 0 && !whatIf && (
                            <Typography variant="body2" color="text.secondary">
                                The model gives the underdog the better chance in {upsetCount} first-round games. That was the one upset signal that held up in the backtest;{' '}
                                <Link to="/backtest">see the evidence</Link>.
                            </Typography>
                        )}
                    </div>

                    <div className="bracket__what-if">
                        <FormControlLabel
                            control={<Switch checked={whatIf} onChange={(_e, on) => update(on ? { whatif: '1' } : { whatif: null, lock: null })} />}
                            label="What if: choose winners and update the odds"
                        />
                        {whatIf && (
                            <>
                                <Typography variant="body2" color="text.secondary">
                                    Press a team to make it the winner. Press it again to undo. A game opens once both of its teams are known.
                                </Typography>
                                <div className="bracket__what-if-buttons">
                                    <Button size="small" variant="outlined" disabled={resolved.valid.length === 0} onClick={() => update({ lock: null, whatif: '1' })}>
                                        Reset ({resolved.valid.length} locked)
                                    </Button>
                                    {canReplay && (
                                        <Button size="small" variant="outlined" onClick={() => setLocks(locksFromResults(base.data!.results))}>
                                            Lock all real results
                                        </Button>
                                    )}
                                    <Button size="small" variant="outlined" disabled={resolved.valid.length === 0} onClick={copyLink}>
                                        Copy link to this scenario
                                    </Button>
                                </div>
                                {copy === 'copied' && <Typography variant="body2">Link copied.</Typography>}
                                {copy === 'failed' && (
                                    <Typography variant="body2">
                                        Could not copy. The address in your browser's address bar is the link.
                                    </Typography>
                                )}
                                {resolved.dropped.length > 0 && (
                                    <Alert severity="info">
                                        {resolved.dropped.length} locked {resolved.dropped.length === 1 ? 'game' : 'games'} in this link did not fit the bracket and {resolved.dropped.length === 1 ? 'was' : 'were'} ignored.
                                    </Alert>
                                )}
                            </>
                        )}
                    </div>

                    <p className="bracket__legend">
                        Each team shows its seed, projected score and the chance it wins if the two teams meet (neutral court). The pick is in bold and labeled.
                    </p>

                    {model && wide && (
                        <div className="bracket__grid">
                            {model.regions.map((_r, i) => regionNode(i))}
                            <div className="bracket__final-four">
                                <FinalFour renderGame={renderGame} regions={model.regions} />
                            </div>
                        </div>
                    )}

                    {model && !wide && (
                        <>
                            <Tabs value={tab} onChange={(_e, v: number) => setTab(v)} variant="scrollable" scrollButtons="auto" aria-label="Regions">
                                {model.regions.map((r, i) => (
                                    <Tab key={r} label={r} id={`region-tab-${i}`} aria-controls="region-panel" />
                                ))}
                                <Tab label="Final Four" id="region-tab-4" aria-controls="region-panel" />
                            </Tabs>
                            <div role="tabpanel" id="region-panel" aria-labelledby={`region-tab-${tab}`}>
                                {tab < 4 ? regionNode(tab) : <FinalFour renderGame={renderGame} regions={model.regions} />}
                            </div>
                        </>
                    )}

                    {model && firstFour.length > 0 && (
                        <section aria-labelledby="first-four-heading" className="bracket__first-four">
                            <Typography variant="h6" component="h2" id="first-four-heading">
                                First Four
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                These four winners play the 16 and 11 seeds. The bracket above uses the likelier winner unless you choose one.
                            </Typography>
                            <ul className="bracket__first-four-list">
                                {firstFour.map(({ teams, slot }) => {
                                    const key = gameKey(0, slot);
                                    const actual = played.get(key);
                                    const chosen = winners.get(key);
                                    return (
                                        <li key={slot}>
                                            <span className="bracket__first-four-title">
                                                {teams[0].region}, {teams[0].seed} seed
                                            </span>
                                            {teams.map((t) =>
                                                whatIf ? (
                                                    <Button
                                                        key={t.team}
                                                        size="small"
                                                        variant={chosen === t.team ? 'contained' : 'outlined'}
                                                        aria-pressed={chosen === t.team}
                                                        onClick={() => setLocks(toggleLock(model, resolved.valid, 0, slot, t.team))}
                                                    >
                                                        {teamLabel(t.team, t.name)}
                                                    </Button>
                                                ) : (
                                                    <span key={t.team} className={actual?.winner === t.team ? 'bracket__first-four-won' : undefined}>
                                                        {teamLabel(t.team, t.name)}
                                                        {actual?.winner === t.team ? ' (won)' : ''}
                                                    </span>
                                                ),
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}

                    <section aria-labelledby="title-odds-heading" className="bracket__odds">
                        <Typography variant="h6" component="h2" id="title-odds-heading">
                            Chance of reaching each round
                        </Typography>
                        {showingOdds && (
                            <Typography variant="body2" color="text.secondary">
                                Arrows show the change from the odds with nothing locked.
                            </Typography>
                        )}
                        <TitleOdds field={display.field} base={showingOdds ? base.data?.field : undefined} />
                    </section>
                </div>
            )}
        </div>
    );
}

export default BracketPage;
