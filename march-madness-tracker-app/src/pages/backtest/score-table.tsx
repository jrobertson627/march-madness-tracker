import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import type { Season } from '../../services/v1/types';
import { score } from '../../utils/format';

export type Metric = 'log_loss' | 'brier';

interface Row {
    season: Season;
    method: string;
    log_loss: number | null;
    brier: number | null;
}

interface ScoreTableProps {
    caption: string;
    rows: Row[];
    /** Columns, in order. */
    seasons: Season[];
    metric: Metric;
    /** The value a full-width bar stands for; the same for every table of the same kind, so bars compare across tables. */
    scale: number;
}

const ORDER = ['coin flip', 'seed', 'elo', 'efficiency gap', 'model'];

/** Methods down the side, seasons across. The last column also draws a bar to a fixed scale; the number is always written. */
export default function ScoreTable({ caption, rows, seasons, metric, scale }: ScoreTableProps) {
    const methods = ORDER.filter((m) => rows.some((r) => r.method === m));
    const cell = (method: string, season: Season) => rows.find((r) => r.method === method && r.season === season)?.[metric] ?? null;
    const last = seasons[seasons.length - 1];
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label={caption}>
                <caption className="visually-hidden">{caption}</caption>
                <TableHead>
                    <TableRow>
                        <TableCell>Method</TableCell>
                        {seasons.map((s) => (
                            <TableCell key={s} align="right">
                                {s === 'all' ? 'All seasons' : s}
                            </TableCell>
                        ))}
                        <TableCell className="backtest__bar-head">
                            <span className="visually-hidden">Bar for {last === 'all' ? 'all seasons' : last}</span>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {methods.map((m) => {
                        const v = cell(m, last);
                        return (
                            <TableRow key={m} className={m === 'model' ? 'backtest__model-row' : undefined}>
                                <TableCell component="th" scope="row">
                                    {m === 'model' ? 'Model' : m[0].toUpperCase() + m.slice(1)}
                                </TableCell>
                                {seasons.map((s) => (
                                    <TableCell key={s} align="right" className="backtest__num">
                                        {score(cell(m, s))}
                                    </TableCell>
                                ))}
                                <TableCell className="backtest__bar-cell" aria-hidden="true">
                                    <span className="backtest__bar" style={{ width: `${Math.min(100, ((v ?? 0) / scale) * 100)}%` }} />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
