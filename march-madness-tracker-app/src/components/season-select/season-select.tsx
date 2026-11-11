import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

interface SeasonSelectProps {
    value: number | null;
    seasons: number[];
    onChange: (season: number) => void;
    id?: string;
}

export default function SeasonSelect({ value, seasons, onChange, id = 'season-select' }: SeasonSelectProps) {
    return (
        <FormControl size="small" sx={{ minWidth: 120 }} disabled={seasons.length === 0}>
            <InputLabel id={`${id}-label`}>Season</InputLabel>
            <Select
                labelId={`${id}-label`}
                id={id}
                label="Season"
                value={value !== null && seasons.includes(value) ? value : ''}
                onChange={(e) => onChange(Number(e.target.value))}
            >
                {seasons.map((s) => (
                    <MenuItem key={s} value={s}>
                        {s}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
