import { createTheme } from '@mui/material/styles';
import colors from './colors';

const borderRadius = 8;

export function createBerryTheme() {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        light: colors.primaryLight,
        main: colors.primaryMain,
        dark: colors.primaryDark,
        200: colors.primary200,
        800: colors.primary800,
      },
      secondary: {
        light: colors.secondaryLight,
        main: colors.secondaryMain,
        dark: colors.secondaryDark,
        200: colors.secondary200,
        800: colors.secondary800,
      },
      success: {
        light: colors.successLight,
        main: colors.successMain,
        dark: colors.successDark,
        200: colors.success200,
      },
      error: {
        light: colors.errorLight,
        main: colors.errorMain,
        dark: colors.errorDark,
      },
      warning: {
        light: colors.warningLight,
        main: colors.warningMain,
        dark: colors.warningDark,
        contrastText: colors.grey700,
      },
      grey: {
        50: colors.grey50,
        100: colors.grey100,
        200: colors.grey200,
        300: colors.grey300,
        500: colors.grey500,
        600: colors.grey600,
        700: colors.grey700,
        900: colors.grey900,
      },
      text: {
        primary: colors.grey700,
        secondary: colors.grey500,
      },
      background: {
        paper: colors.paper,
        default: colors.grey50,
      },
      divider: colors.grey200,
    },
    typography: {
      fontFamily: `'Roboto', sans-serif`,
      h1: { fontSize: '2.125rem', fontWeight: 700, color: colors.grey900 },
      h2: { fontSize: '1.5rem', fontWeight: 700, color: colors.grey900 },
      h3: { fontSize: '1.25rem', fontWeight: 600, color: colors.grey900 },
      h4: { fontSize: '1rem', fontWeight: 600, color: colors.grey900 },
      h5: { fontSize: '0.875rem', fontWeight: 500 },
      h6: { fontSize: '0.75rem', fontWeight: 500 },
      subtitle1: { fontSize: '0.875rem', fontWeight: 500 },
      subtitle2: { fontSize: '0.75rem', fontWeight: 400 },
      body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: '1.334em' },
      body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: '1.5em' },
      button: { textTransform: 'capitalize' },
    },
    shape: { borderRadius },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: `${borderRadius}px`,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: `${borderRadius}px`,
            boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: { root: { padding: '24px' } },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: `${borderRadius}px` } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: `${borderRadius}px`,
            marginBottom: '4px',
            paddingTop: '10px',
            paddingBottom: '10px',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: colors.grey50,
            fontWeight: 600,
            color: colors.grey700,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 },
        },
      },
    },
  });
}

export default createBerryTheme;
