import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const colors = {
  primary: '#FF6B35',
  secondary: '#2196F3',
  tertiary: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#00BCD4',
  success: '#4CAF50',
  
  // Custom colors
  dark: '#1a1a1a',
  darker: '#0f0f0f',
  light: '#f5f5f5',
  lighter: '#ffffff',
  
  // Grays
  gray100: '#f8f9fa',
  gray200: '#e9ecef',
  gray300: '#dee2e6',
  gray400: '#ced4da',
  gray500: '#adb5bd',
  gray600: '#6c757d',
  gray700: '#495057',
  gray800: '#343a40',
  gray900: '#212529',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    error: colors.error,
    background: colors.gray100,
    surface: colors.lighter,
    surfaceVariant: colors.gray200,
    onSurface: colors.dark,
    onSurfaceVariant: colors.gray700,
  },
  custom: colors,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    error: colors.error,
    background: colors.darker,
    surface: colors.dark,
    surfaceVariant: colors.gray800,
    onSurface: colors.lighter,
    onSurfaceVariant: colors.gray300,
  },
  custom: colors,
};

export const theme = darkTheme; // Default to dark theme

export type AppTheme = typeof lightTheme;

// Extend the react-native-paper theme type
declare global {
  namespace ReactNativePaper {
    interface Theme extends AppTheme {}
  }
}