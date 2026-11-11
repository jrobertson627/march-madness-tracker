import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

import type { Snapshot } from '../../services/v1/types';
import './model-badge.scss';

interface ModelBadgeProps {
    snapshot: Snapshot;
    /** The API's notes, shown as returned. */
    notes?: string[];
}

/** Which model and data produced a number, and whether the model had seen that season. Shown on every page that has predictions. */
export default function ModelBadge({ snapshot, notes = [] }: ModelBadgeProps) {
    const tip = snapshot.in_sample
        ? `This model was trained on ${snapshot.season}, so these probabilities are not a fair test of it.`
        : `This model was trained without ${snapshot.season}, so it had not seen these games.`;
    const shown = notes.filter((n) => !n.startsWith('in-sample'));
    return (
        <div className="model-badge">
            <div className="model-badge__line">
                <Tooltip title={tip}>
                    <Chip
                        size="small"
                        variant={snapshot.in_sample ? 'filled' : 'outlined'}
                        color={snapshot.in_sample ? 'warning' : 'default'}
                        label={snapshot.in_sample ? 'In-sample' : 'Out-of-sample'}
                    />
                </Tooltip>
                <span className="model-badge__text">
                    Model <code>{snapshot.model_id}</code> · season {snapshot.season} · ratings as of {snapshot.as_of}
                </span>
            </div>
            {snapshot.in_sample && <p className="model-badge__warning">{tip}</p>}
            {shown.length > 0 && (
                <ul className="model-badge__notes">
                    {shown.map((n) => (
                        <li key={n}>{n}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
