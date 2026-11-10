import { Link } from 'react-router-dom';

import type { Pick as PickRow, PlayedGame } from '../../services/v1/types';
import { pct, points } from '../../utils/format';
import './bracket-game.scss';

export interface WhatIfControl {
    /** What-if mode is on. */
    active: boolean;
    /** Both teams are known, so a winner can be chosen. */
    lockable: boolean;
    lockedWinner?: string;
    onChoose: (teamId: string) => void;
}

interface BracketGameProps {
    pick: PickRow;
    season: number;
    name: (id: string) => string;
    seed: (id: string) => number | undefined;
    /** What happened, for a season that has been played. */
    actual?: PlayedGame;
    whatIf?: WhatIfControl;
}

interface Side {
    id: string;
    p: number | null;
    score: number | null;
}

/**
 * One game: both teams with seed, projected score and the head-to-head chance that team wins if the two meet. The pick
 * is marked in words (and bold), so nothing depends on color. In what-if mode each team is a button that locks it as the winner.
 */
export default function BracketGame({ pick, season, name, seed, actual, whatIf }: BracketGameProps) {
    const pA = pick.p_a_beats_b;
    const sides: [Side, Side] = [
        { id: pick.team_a, p: pA, score: pick.score_a },
        { id: pick.team_b, p: pA === null ? null : 1 - pA, score: pick.score_b },
    ];
    const isUpsetPick = (id: string) => {
        const mine = seed(id);
        const other = seed(id === pick.team_a ? pick.team_b : pick.team_a);
        return mine !== undefined && other !== undefined && mine > other;
    };
    const locked = whatIf?.lockedWinner;
    const interactive = Boolean(whatIf?.active && whatIf.lockable);
    const result = actual ? (actual.winner === pick.pick ? 'Pick was right' : 'Pick was wrong') : null;

    return (
        <article className={`bracket-game${locked ? ' bracket-game--locked' : ''}`} aria-label={`${name(pick.team_a)} against ${name(pick.team_b)}, ${pick.round_name}`}>
            <ul className="bracket-game__teams">
                {sides.map((s) => {
                    const isPick = pick.pick === s.id;
                    const tags: string[] = [];
                    if (locked === s.id) tags.push('Locked');
                    else if (isPick && !locked) tags.push('Pick');
                    if (isPick && isUpsetPick(s.id)) tags.push('Upset pick');
                    if (actual?.winner === s.id) tags.push('Won');
                    const body = (
                        <>
                            <span className="bracket-game__seed">{seed(s.id) ?? ''}</span>
                            <span className="bracket-game__name">{name(s.id)}</span>
                            {tags.length > 0 && <span className="bracket-game__tags">{tags.join(' · ')}</span>}
                            <span className="bracket-game__score">
                                <span className="visually-hidden">Projected score </span>
                                {points(s.score)}
                            </span>
                            <span className="bracket-game__p">
                                <span className="visually-hidden">Chance to win </span>
                                {pct(s.p)}
                            </span>
                        </>
                    );
                    const cls = `bracket-game__team${isPick ? ' bracket-game__team--pick' : ''}${locked === s.id ? ' bracket-game__team--locked' : ''}${actual?.winner === s.id ? ' bracket-game__team--won' : ''}`;
                    return (
                        <li key={s.id} className={cls}>
                            {interactive ? (
                                <button type="button" className="bracket-game__button" aria-pressed={locked === s.id} onClick={() => whatIf?.onChoose(s.id)}>
                                    {body}
                                </button>
                            ) : (
                                <div className="bracket-game__static">{body}</div>
                            )}
                        </li>
                    );
                })}
            </ul>
            <div className="bracket-game__foot">
                {whatIf?.active && !whatIf.lockable && !locked ? <span className="bracket-game__hint">Decide the earlier games first</span> : null}
                {result ? <span className={`bracket-game__result${actual?.winner === pick.pick ? ' bracket-game__result--right' : ''}`}>{result}</span> : null}
                <Link className="bracket-game__link" to={`/compare?teamA=${pick.team_a}&teamB=${pick.team_b}&season=${season}`} aria-label={`Details: ${name(pick.team_a)} against ${name(pick.team_b)}`}>
                    Details
                </Link>
            </div>
        </article>
    );
}
