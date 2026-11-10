import { pct } from '../../utils/format';
import './win-bar.scss';

interface WinBarProps {
    nameA: string;
    nameB: string;
    pA: number | null;
}

/** Two teams' chances as one bar. The numbers are written out, so the bar adds to the text and never replaces it. */
export default function WinBar({ nameA, nameB, pA }: WinBarProps) {
    const a = pA ?? 0.5;
    const pB = pA === null ? null : 1 - a;
    return (
        <figure className="win-bar" aria-label={`Chance to win: ${nameA} ${pct(pA)}, ${nameB} ${pct(pB)}`}>
            <div className="win-bar__labels" aria-hidden="true">
                <span>
                    {nameA} <strong>{pct(pA)}</strong>
                </span>
                <span>
                    <strong>{pct(pB)}</strong> {nameB}
                </span>
            </div>
            <div className="win-bar__track" aria-hidden="true">
                <div className="win-bar__a" style={{ width: `${a * 100}%` }} />
                <div className="win-bar__mid" />
            </div>
        </figure>
    );
}
