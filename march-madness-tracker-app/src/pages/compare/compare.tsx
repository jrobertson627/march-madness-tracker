import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import FactorBars from '../../components/factor-bars/factor-bars';
import ModelBadge from '../../components/model-badge/model-badge';
import SeasonSelect from '../../components/season-select/season-select';
import StatusBanner from '../../components/status-banner/status-banner';
import WinBar from '../../components/win-bar/win-bar';
import { useApi } from '../../hooks/useApi';
import { useSeasons } from '../../hooks/useSeasons';
import { getMatchup } from '../../services/v1/client';
import { points, teamLabel } from '../../utils/format';
import { pickSeason } from '../../utils/season';
import WeightsPlayground from './weights-playground';
import './compare.scss';

function Compare() {
    const [params, setParams] = useSearchParams();
    const teamA = params.get('teamA');
    const teamB = params.get('teamB');
    const seasons = useSeasons();
    const season = pickSeason(params.get('season'), seasons.list, seasons.latest);
    const [tab, setTab] = useState<'model' | 'weights'>('model');

    const matchup = useApi(teamA && teamB && season !== null ? `matchup:${teamA}:${teamB}:${season}` : null, (signal) =>
        getMatchup(teamA as string, teamB as string, season as number, { signal }),
    );

    if (!teamA || !teamB) {
        return (
            <div className="compare">
                <Typography>Pick two teams first.</Typography>
                <Link to="/welcome">Back to team select</Link>
            </div>
        );
    }

    const m = matchup.data;
    const nameA = m ? teamLabel(m.team_a.id, m.team_a.name) : teamLabel(teamA);
    const nameB = m ? teamLabel(m.team_b.id, m.team_b.name) : teamLabel(teamB);
    const setParam = (patch: Record<string, string>) => setParams({ teamA, teamB, season: String(season ?? ''), ...patch }, { replace: true });
    const margin = m?.projected.margin_a ?? null;

    return (
        <div className="compare">
            <Typography variant="h4" component="h1">
                {nameA} vs {nameB}
            </Typography>

            <div className="compare__controls">
                <SeasonSelect value={season} seasons={seasons.list} onChange={(s) => setParam({ season: String(s) })} />
                <Button variant="outlined" size="small" onClick={() => setParam({ teamA: teamB, teamB: teamA })}>
                    Swap teams
                </Button>
            </div>

            <Tabs value={tab} onChange={(_e, v) => setTab(v)} aria-label="Prediction source">
                <Tab value="model" label="Model prediction" id="tab-model" aria-controls="panel-model" />
                <Tab value="weights" label="Try your own weights" id="tab-weights" aria-controls="panel-weights" />
            </Tabs>

            {tab === 'model' && (
                <div role="tabpanel" id="panel-model" aria-labelledby="tab-model" className="compare__panel">
                    <StatusBanner status={matchup.status} error={matchup.error} onRetry={matchup.retry} />
                    {m && (
                        <div className={`compare__content${matchup.updating ? ' compare__content--updating' : ''}`} aria-busy={matchup.updating}>
                            <ModelBadge snapshot={m.snapshot} notes={m.notes} />
                            {matchup.updating && <p className="compare__updating">Updating…</p>}
                            <WinBar nameA={nameA} nameB={nameB} pA={m.p_a_win} />

                            <section aria-labelledby="projected-heading">
                                <Typography variant="h6" component="h2" id="projected-heading">
                                    Projected score
                                </Typography>
                                <p className="compare__score">
                                    {nameA} <strong>{points(m.projected.score_a)}</strong> – <strong>{points(m.projected.score_b)}</strong> {nameB}
                                </p>
                                <Typography color="text.secondary" variant="body2">
                                    {margin === null
                                        ? ''
                                        : `${margin >= 0 ? nameA : nameB} by ${points(Math.abs(margin))}. `}
                                    Total {points(m.projected.total)} points over {m.projected.basis}, neutral court.
                                </Typography>
                            </section>

                            <section aria-labelledby="factors-heading" className="compare__factors">
                                <Typography variant="h6" component="h2" id="factors-heading">
                                    What drives it
                                </Typography>
                                <Typography color="text.secondary" variant="body2" className="compare__reading">
                                    Each bar shows how far the chance moves when one group of inputs is set to even. It describes what the model does with each group. It does not show a cause.
                                </Typography>
                                <FactorBars factors={m.factors} interaction={m.interaction} nameA={nameA} nameB={nameB} />
                            </section>
                        </div>
                    )}
                </div>
            )}

            {tab === 'weights' && (
                <div role="tabpanel" id="panel-weights" aria-labelledby="tab-weights" className="compare__panel">
                    <WeightsPlayground teamAId={teamA} teamBId={teamB} />
                </div>
            )}

            <Link to="/welcome">Back to team select</Link>
        </div>
    );
}

export default Compare;
