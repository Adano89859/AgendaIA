// utils/ThemeContext.tsx

import { createContext, useContext, useEffect, useState } from 'react';
import { FONT_SCALES, FontScaleKey, THEMES, ThemeColors, ThemeKey } from '../constants/colors';
import { getPreference, setPreference } from '../database/db';

export const THEME_PREF_KEY = 'app_theme';
export const FONT_SCALE_PREF_KEY = 'font_scale_key';

type ThemeContextType = {
  theme: ThemeKey;
  fontScaleKey: FontScaleKey;
  fontScale: number;
  colors: ThemeColors;
  setTheme: (t: ThemeKey) => void;
  setFontScaleKey: (k: FontScaleKey) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  fontScaleKey: 'normal',
  fontScale: 1.0,
  colors: THEMES.dark,
  setTheme: () => {},
  setFontScaleKey: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>('dark');
  const [fontScaleKey, setFontScaleKeyState] = useState<FontScaleKey>('normal');

  useEffect(() => {
    const savedTheme = getPreference(THEME_PREF_KEY, 'dark') as ThemeKey;
    const savedScale = getPreference(FONT_SCALE_PREF_KEY, 'normal') as FontScaleKey;
    if (THEMES[savedTheme]) setThemeState(savedTheme);
    if (FONT_SCALES[savedScale]) setFontScaleKeyState(savedScale);
  }, []);

  const setTheme = (t: ThemeKey) => {
    setPreference(THEME_PREF_KEY, t);
    setThemeState(t);
  };

  const setFontScaleKey = (k: FontScaleKey) => {
    setPreference(FONT_SCALE_PREF_KEY, k);
    setFontScaleKeyState(k);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        fontScaleKey,
        fontScale: FONT_SCALES[fontScaleKey],
        colors: THEMES[theme],
        setTheme,
        setFontScaleKey,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);