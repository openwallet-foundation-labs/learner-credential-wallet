import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { ThemeProviderProps } from './ThemeProvider.d';
import { useAppDispatch } from '../../hooks';
import { selectWalletState, updateThemeName } from '../../store/slices/wallet';
import { defaultTheme, ThemeContext, ThemeContextValue, themes } from '../../styles';
import { findThemeBy } from '../../styles/theme/themeName';
import { useSystemTheme } from './useSystemTheme';

export default function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const dispatch = useAppDispatch();
  const { themeName } = useSelector(selectWalletState);

  // Use custom hook instead of broken useColorScheme
  const colorScheme = useSystemTheme();

  console.log('colorScheme from OS:', colorScheme);
  console.log('themeName from storage:', themeName);

  // ALWAYS sync with OS theme - remove the themeName === null check
  useEffect(() => {
    if (colorScheme !== null) {
      const osThemeName = colorScheme === 'dark' ? themes.darkTheme.name : themes.lightTheme.name;

      // Only update if different to avoid unnecessary dispatches
      if (themeName !== osThemeName) {
        console.log('Syncing theme to match OS:', osThemeName);
        dispatch(updateThemeName(osThemeName));
      }
    }
  }, [colorScheme, themeName, dispatch]);

  const theme = useMemo(() => findThemeBy(themeName) || defaultTheme, [themeName]);
  const isDarkTheme = useMemo(() => theme === themes.darkTheme, [theme]);

  async function toggleTheme() {
    const nextThemeName = isDarkTheme ? themes.lightTheme.name : themes.darkTheme.name;
    await dispatch(updateThemeName(nextThemeName));
  }

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    isDarkTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
