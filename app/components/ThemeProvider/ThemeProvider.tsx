import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useColorScheme } from 'react-native';

import type { ThemeProviderProps } from './ThemeProvider.d';
import { useAppDispatch } from '../../hooks';
import { selectWalletState, updateThemeName } from '../../store/slices/wallet';
import { defaultTheme, ThemeContext, ThemeContextValue, themes } from '../../styles';
import { findThemeBy } from '../../styles/theme/themeName';

export default function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const dispatch = useAppDispatch();
  const { themeName } = useSelector(selectWalletState);
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (themeName === null && colorScheme !== null) {
      const osThemeName = colorScheme === 'dark' ? themes.darkTheme.name : themes.lightTheme.name;
      dispatch(updateThemeName(osThemeName));
    }
  }, [themeName, colorScheme, dispatch]);

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
