import { createTheme } from '@mui/material/styles';

/** Light and dark follow the system setting. CSS variables (--mui-palette-*) let the SCSS files use the same colors. */
export const theme = createTheme({
    cssVariables: true,
    colorSchemes: { light: true, dark: true },
    typography: { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
});
