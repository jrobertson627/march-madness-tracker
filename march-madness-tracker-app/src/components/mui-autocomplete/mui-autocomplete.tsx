import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

import * as Constants from '../../utils/constants';

export default function ComboBox() {
  return (
    <Autocomplete
      disablePortal
      options={Constants.TEAMS}
      sx={{ width: 300 }}
      renderInput={(params) => <TextField {...params} label="Team 1" />}
    />
  );
}