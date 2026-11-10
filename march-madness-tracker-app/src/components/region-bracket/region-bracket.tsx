import type { ReactNode } from 'react';

import { regionGames, ROUND_LABELS } from '../../utils/bracketModel';
import './region-bracket.scss';

interface RegionBracketProps {
    title: string;
    regionIndex: number;
    /** Draws one game. Called with the round (1 to 4) and the game number. */
    renderGame: (round: number, game: number) => ReactNode;
}

/** Four rounds of one region. On a narrow screen the rounds stack, one under the other. */
export function RegionBracket({ title, regionIndex, renderGame }: RegionBracketProps) {
    return (
        <section className="region" aria-label={`${title} region`}>
            <h3 className="region__title">{title}</h3>
            <div className="region__rounds">
                {regionGames(regionIndex).map(({ round, games }) => (
                    <div className="region__round" key={round}>
                        <h4 className="region__round-title">{ROUND_LABELS[round]}</h4>
                        <div className="region__games">
                            {games.map((g) => (
                                <div className="region__game" key={g}>
                                    {renderGame(round, g)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

interface FinalFourProps {
    renderGame: (round: number, game: number) => ReactNode;
    regions: string[];
}

/** The two semifinals and the championship game. */
export function FinalFour({ renderGame, regions }: FinalFourProps) {
    return (
        <section className="final-four" aria-label="Final Four">
            <h3 className="region__title">Final Four</h3>
            <div className="final-four__games">
                <div>
                    <h4 className="region__round-title">
                        {ROUND_LABELS[5]}: {regions[0]} and {regions[1]}
                    </h4>
                    {renderGame(5, 0)}
                </div>
                <div>
                    <h4 className="region__round-title">
                        {ROUND_LABELS[5]}: {regions[2]} and {regions[3]}
                    </h4>
                    {renderGame(5, 1)}
                </div>
                <div>
                    <h4 className="region__round-title">{ROUND_LABELS[6]}</h4>
                    {renderGame(6, 0)}
                </div>
            </div>
        </section>
    );
}
