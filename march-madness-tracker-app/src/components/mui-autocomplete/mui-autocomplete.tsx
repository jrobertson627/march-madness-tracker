import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

import type { Team } from '../../services/api';

interface TeamAutocompleteProps {
  label: string;
  options: Team[];
  value: Team | null;
  onChange: (team: Team | null) => void;
}

export default function TeamAutocomplete({ label, options, value, onChange }: TeamAutocompleteProps) {
  return (
    <Autocomplete
      disablePortal
      options={options}
      value={value}
      onChange={(_event, newValue) => onChange(newValue)}
      getOptionLabel={(team) => `${team.name} (${team.seed})`}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      sx={{ width: 300 }}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}
