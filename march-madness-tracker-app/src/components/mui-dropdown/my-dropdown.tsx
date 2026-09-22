import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles'
import Box from '@mui/material/Box';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Chip from '@mui/material/Chip';

import { METRICS } from '../../utils/metrics';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function getStyles(key: string, activeKeys: readonly string[], theme: Theme) {
  return {
    fontWeight: activeKeys.includes(key)
      ? theme.typography.fontWeightMedium
      : theme.typography.fontWeightRegular,
  };
}

interface MetricPickerProps {
  activeKeys: string[];
  onChange: (activeKeys: string[]) => void;
}

export default function MetricPicker({ activeKeys, onChange }: MetricPickerProps) {
  const theme = useTheme();

  const handleChange = (event: SelectChangeEvent<typeof activeKeys>) => {
    const {
      target: { value },
    } = event;
    onChange(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value,
    );
  };

  const labelFor = (key: string) => METRICS.find((m) => m.key === key)?.label ?? key;

  return (
    <div>
      <FormControl sx={{ m: 1, width: 300 }}>
        <InputLabel id="metric-picker-label">Metrics</InputLabel>
        <Select
          labelId="metric-picker-label"
          id="metric-picker"
          multiple
          value={activeKeys}
          onChange={handleChange}
          input={<OutlinedInput id="select-multiple-chip" label="Metrics" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((key) => (
                <Chip key={key} label={labelFor(key)} />
              ))}
            </Box>
          )}
          MenuProps={MenuProps}
        >
          {METRICS.map((metric) => (
            <MenuItem
              key={metric.key}
              value={metric.key}
              style={getStyles(metric.key, activeKeys, theme)}
            >
              {metric.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
