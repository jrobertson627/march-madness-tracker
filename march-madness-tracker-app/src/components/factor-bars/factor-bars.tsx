import type { Factor } from '../../services/v1/types';
import { groupInfo, headlineLabel, INTERACTION } from '../../utils/factors';
import { points, signedPoints } from '../../utils/format';
import './factor-bars.scss';

interface FactorBarsProps {
    factors: Factor[];
    interaction?: number | null;
    nameA: string;
    nameB: string;
}

interface Row {
    id: string;
    label: string;
    blurb: string;
    effect: number;
    headline?: string;
    a?: number | null;
    b?: number | null;
}

/**
 * How far each group of inputs moves the win probability, as bars from a center line. Team A is on the left, as in the
 * win bar, so a bar to the left favors A. Every bar is also written out in words.
 */
export default function FactorBars({ factors, interaction, nameA, nameB }: FactorBarsProps) {
    const rows: Row[] = factors.map((f) => {
        const info = groupInfo(f.group);
        return { id: f.group, label: info.label, blurb: info.blurb, effect: f.effect ?? 0, headline: f.headline ?? undefined, a: f.a, b: f.b };
    });
    if (interaction !== null && interaction !== undefined) {
        rows.push({ id: 'interaction', label: INTERACTION.label, blurb: INTERACTION.blurb, effect: interaction });
    }
    const scale = Math.max(0.05, ...rows.map((r) => Math.abs(r.effect)));
    return (
        <ul className="factor-bars">
            {rows.map((r) => {
                const toward = r.effect > 0 ? nameA : r.effect < 0 ? nameB : null;
                const width = `${(Math.abs(r.effect) / scale) * 50}%`;
                return (
                    <li key={r.id} className="factor-bars__row">
                        <div className="factor-bars__head">
                            <span className="factor-bars__label">{r.label}</span>
                            <span className="factor-bars__effect">
                                {toward ? `${signedPoints(Math.abs(r.effect))} points toward ${toward}` : 'No effect'}
                            </span>
                        </div>
                        <div className="factor-bars__track" aria-hidden="true">
                            <span className="factor-bars__mid" />
                            {r.effect !== 0 && <span className={`factor-bars__fill factor-bars__fill--${r.effect > 0 ? 'a' : 'b'}`} style={{ width }} />}
                        </div>
                        {r.headline && (
                            <p className="factor-bars__numbers">
                                {headlineLabel(r.headline)}: {nameA} {points(r.a)}, {nameB} {points(r.b)}
                            </p>
                        )}
                        {r.blurb && <p className="factor-bars__blurb">{r.blurb}</p>}
                    </li>
                );
            })}
        </ul>
    );
}
