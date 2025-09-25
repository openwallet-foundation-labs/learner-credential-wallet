import AsyncStorage from '@react-native-async-storage/async-storage';

import { themes } from './index';
import type { ThemeType } from './index.d';
import { AsyncStorageKey } from '../../lib/asyncStorage';

export async function loadThemeName(): Promise<string | null> {
  return AsyncStorage.getItem(AsyncStorageKey.ThemeName);
}

export async function saveThemeName(themeName: string): Promise<void> {
  return AsyncStorage.setItem(AsyncStorageKey.ThemeName, themeName);
}

export function findThemeBy(themeName: string | null): ThemeType | null {
  if (themeName === null) {
    return null;
  }

  return Object.values(themes).find(({ name }) => name === themeName) || null;
}
