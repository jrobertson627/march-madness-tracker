import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';

import type { FieldTeam } from '../../services/v1/types';
import { pct, signedPoints, teamLabel } from '../../utils/format';
import './title-odds.scss';

type Column = 'p_round_of_32' | 'p_sweet_16' | 'p_elite_8' | 'p_final_four' | 'p_championship_game' | 'p_champion';

const COLUMNS: { key: Column; label: string; digits: number }[] = [
    { key: 'p_round_of_32', label: 'Round of 32', digits: 0 },
    { key: 'p_sweet_16', label: 'Sweet 16', digits: 0 },
    { key: 'p_elite_8', label: 'Elite 8', digits: 0 },
    { key: 'p_final_four', label: 'Final Four', digits: 0 },
    { key: 'p_championship_game', label: 'Final', digits: 0 },
    { key: 'p_champion', label: 'Champion', digits: 1 },
];

interface TitleOddsProps {
    field: FieldTeam[];
    /** The odds without any what-if locks, to show how much each team moved. */
    base?: FieldTeam[];
    rowsShown?: number;
}

/** Each team's chance of reaching each round, sortable. With `base`, the Champion and Final Four columns show the change. */
export default function TitleOdds({ field, base, rowsShown = 16 }: TitleOddsProps) {
    const [sort, setSort] = useState<Column>('p_champion');
    const [all, setAll] = useState(false);
    const before = useMemo(() => new Map((base ?? []).map((t) => [t.team, t])), [base]);
    const rows = useMemo(() => [...field].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0) || a.seed - b.seed), [field, sort]);
    const shown = all ? rows : rows.slice(0, rowsShown);

    const delta = (t: FieldTeam, key: Column) => {
        const b = before.get(t.team);
        if (!base || !b) return null;
        const d = (t[key] ?? 0) - (b[key] ?? 0);
        if (Math.abs(d) < 0.0005) return null;
        return (
            <span className={`title-odds__delta title-odds__delta--${d > 0 ? 'up' : 'down'}`}>
                {d > 0 ? '▲' : '▼'} {signedPoints(d)}
            </span>
        );
    };

    return (
        <div className="title-odds">
            <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="Chance of reaching each round">
                    <TableHead>
                        <TableRow>
                            <TableCell>Team</TableCell>
                            {COLUMNS.map((c) => (
                                <TableCell key={c.key} align="right" sortDirection={sort === c.key ? 'desc' : false}>
                                    <TableSortLabel active={sort === c.key} direction="desc" onClick={() => setSort(c.key)}>
                                        {c.label}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {shown.map((t) => (
                            <TableRow key={t.team}>
                                <TableCell component="th" scope="row">
                                    <span className="title-odds__seed">{t.seed}</span> {teamLabel(t.team, t.name)}
                                    <span className="title-odds__region"> · {t.region}</span>
                                </TableCell>
                                {COLUMNS.map((c) => (
                                    <TableCell key={c.key} align="right" className="title-odds__num">
                                        {pct(t[c.key], c.digits)}
                                        {c.key === 'p_champion' || c.key === 'p_final_four' ? delta(t, c.key) : null}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {rows.length > rowsShown && (
                <Button size="small" onClick={() => setAll((v) => !v)}>
                    {all ? `Show the top ${rowsShown}` : `Show all ${rows.length} teams`}
                </Button>
            )}
        </div>
    );
}
