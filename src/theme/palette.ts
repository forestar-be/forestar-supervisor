import { PaletteMode } from '@mui/material';

export const light = {
  mode: 'light' as PaletteMode,
  primary: {
    main: '#0EA5E9', // Sky blue moderne et vibrant
    light: '#38BDF8',
    dark: '#0284C7',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#8B5CF6', // Purple moderne
    light: '#A78BFA',
    dark: '#7C3AED',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#10B981', // Emerald green moderne
    light: '#34D399',
    dark: '#059669',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#EF4444', // Rouge moderne
    light: '#F87171',
    dark: '#DC2626',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#F59E0B', // Amber moderne
    light: '#FBBF24',
    dark: '#D97706',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#3B82F6', // Blue moderne
    light: '#60A5FA',
    dark: '#2563EB',
    contrastText: '#FFFFFF',
  },
  text: {
    primary: '#1F2937', // Gris très foncé pour meilleur contraste
    secondary: '#6B7280',
    disabled: '#9CA3AF',
  },
  background: {
    default: '#F9FAFB', // Gris très clair
    paper: '#FFFFFF',
  },
  divider: 'rgba(0, 0, 0, 0.08)',
  action: {
    active: '#0EA5E9',
    hover: 'rgba(14, 165, 233, 0.08)',
    selected: 'rgba(14, 165, 233, 0.12)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
  },
};

export const dark = {
  mode: 'dark' as PaletteMode,
  primary: {
    main: '#06B6D4', // Cyan vibrant pour mode sombre
    light: '#22D3EE',
    dark: '#0891B2',
    contrastText: '#0F172A',
  },
  secondary: {
    main: '#A78BFA', // Purple clair pour mode sombre
    light: '#C4B5FD',
    dark: '#8B5CF6',
    contrastText: '#0F172A',
  },
  success: {
    main: '#34D399', // Emerald clair
    light: '#6EE7B7',
    dark: '#10B981',
    contrastText: '#0F172A',
  },
  error: {
    main: '#F87171', // Rouge clair pour mode sombre
    light: '#FCA5A5',
    dark: '#EF4444',
    contrastText: '#0F172A',
  },
  warning: {
    main: '#FBBF24', // Amber clair
    light: '#FCD34D',
    dark: '#F59E0B',
    contrastText: '#0F172A',
  },
  info: {
    main: '#60A5FA', // Blue clair
    light: '#93C5FD',
    dark: '#3B82F6',
    contrastText: '#0F172A',
  },
  text: {
    primary: '#F9FAFB', // Presque blanc
    secondary: '#D1D5DB',
    disabled: '#6B7280',
  },
  background: {
    default: '#0F172A', // Slate très foncé
    paper: '#1E293B', // Slate foncé
    paperSeeThrough: 'rgba(30, 41, 59, 0.7)',
  },
  divider: 'rgba(255, 255, 255, 0.12)',
  action: {
    active: '#06B6D4',
    hover: 'rgba(6, 182, 212, 0.12)',
    selected: 'rgba(6, 182, 212, 0.16)',
    disabled: 'rgba(255, 255, 255, 0.26)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
  },
};
