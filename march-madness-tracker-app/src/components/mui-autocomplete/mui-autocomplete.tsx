import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

export interface TeamOption {
  id: string;
  /** What to show; the API's name, or one made from the id. */
  label: string;
  seed: number | null;
}

interface TeamAutocompleteProps {
  label: string;
  options: TeamOption[];
  value: TeamOption | null;
  onChange: (team: TeamOption | null) => void;
  loading?: boolean;
}

export default function TeamAutocomplete({ label, options, value, onChange, loading = false }: TeamAutocompleteProps) {
  return (
    <Autocomplete
      disablePortal
      options={options}
      value={value}
      loading={loading}
      onChange={(_event, newValue) => onChange(newValue)}
      getOptionLabel={(team) => (team.seed === null ? team.label : `${team.label} (${team.seed})`)}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      sx={{ width: { xs: '100%', sm: 300 } }}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}
