// constants/colors.ts

export type ThemeColors = {
  background: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
};

export type ThemeKey = 'dark' | 'light' | 'sepia' | 'highContrast';
export type FontScaleKey = 'small' | 'normal' | 'large';

export const FONT_SCALES: Record<FontScaleKey, number> = {
  small: 0.85,
  normal: 1.0,
  large: 1.2,
};

export const THEMES: Record<ThemeKey, ThemeColors> = {
  dark: {
    background: '#0f0f0f',
    surface: '#1a1a1a',
    card: '#222222',
    border: '#2a2a2a',
    primary: '#6C63FF',
    text: '#f0f0f0',
    textSecondary: '#888888',
    textMuted: '#444444',
  },
  light: {
    background: '#f5f5f5',
    surface: '#ffffff',
    card: '#ffffff',
    border: '#e0e0e0',
    primary: '#6C63FF',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#bbbbbb',
  },
  sepia: {
    background: '#f4efe6',
    surface: '#ede8df',
    card: '#e8e3da',
    border: '#d4cec5',
    primary: '#8B6914',
    text: '#2c1a00',
    textSecondary: '#6b5a3e',
    textMuted: '#a89880',
  },
  highContrast: {
    background: '#000000',
    surface: '#111111',
    card: '#1a1a1a',
    border: '#ffffff',
    primary: '#FFE600',
    text: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#888888',
  },
};

// Compatibilidad con imports existentes — apunta al tema oscuro por defecto
export const Colors = THEMES.dark;