/**
 * MUI Theme Configuration – Enhanced high-tech SLA monitoring & telemetry aesthetics.
 * Curated color palette, modern glassmorphism tokens, and responsive typography.
 */
import { createTheme } from '@mui/material/styles'

export const tokens = {
  primary: { main: '#38bdf8', light: '#7dd3fc', dark: '#0284c7' },
  secondary: { main: '#a855f7', light: '#c084fc', dark: '#7e22ce' },
  accent: { main: '#10b981', light: '#34d399', dark: '#059669' },
  cyber: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
  error: { main: '#f43f5e', light: '#fb7185', dark: '#e11d48' },
  warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
  success: { main: '#10b981', light: '#34d399', dark: '#059669' },
  info: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
}

const sharedTypography = {
  fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  h1: { fontWeight: 800, letterSpacing: '-0.03em' },
  h2: { fontWeight: 800, letterSpacing: '-0.025em' },
  h3: { fontWeight: 700, letterSpacing: '-0.02em' },
  h4: { fontWeight: 700, letterSpacing: '-0.015em' },
  h5: { fontWeight: 600, letterSpacing: '-0.01em' },
  h6: { fontWeight: 600, letterSpacing: '-0.005em' },
  body1: { letterSpacing: '-0.01em', lineHeight: 1.6 },
  body2: { letterSpacing: '-0.005em', lineHeight: 1.5 },
  button: { textTransform: 'none' as const, fontWeight: 600, letterSpacing: '0.01em' },
}

const sharedShape = { borderRadius: 12 }

// ── Dark Theme ────────────────────────────────────────────────────
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: tokens.primary,
    secondary: tokens.secondary,
    error: tokens.error,
    warning: tokens.warning,
    success: tokens.success,
    info: tokens.info,
    background: {
      default: '#050b14',
      paper: '#0b1322',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    divider: 'rgba(56, 189, 248, 0.1)',
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          padding: '8px 18px',
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(56, 189, 248, 0.25)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
          color: '#030d1a',
          fontWeight: 700,
          '&:hover': {
            background: 'linear-gradient(135deg, #0369a1 0%, #7dd3fc 100%)',
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(56, 189, 248, 0.35)',
          '&:hover': {
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(11, 19, 34, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(56, 189, 248, 0.12)',
          borderRadius: 16,
          boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.36)',
          transition: 'all 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            borderColor: 'rgba(56, 189, 248, 0.25)',
            boxShadow: '0 12px 40px -4px rgba(0, 0, 0, 0.48), 0 0 16px -2px rgba(56, 189, 248, 0.1)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(56, 189, 248, 0.08)',
          padding: '12px 16px',
        },
        head: {
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          color: '#94a3b8',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(11, 19, 34, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 18,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        },
        bar: {
          borderRadius: 6,
        },
      },
    },
  },
})

// ── Light Theme ───────────────────────────────────────────────────
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: tokens.primary,
    secondary: tokens.secondary,
    error: tokens.error,
    warning: tokens.warning,
    success: tokens.success,
    info: tokens.info,
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    divider: 'rgba(15, 23, 42, 0.08)',
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          borderRadius: 16,
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
})

export const theme = darkTheme
