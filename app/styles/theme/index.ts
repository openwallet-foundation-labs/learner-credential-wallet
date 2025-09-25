import { darkTheme } from './themes/darkTheme';
import { lightTheme } from './themes/lightTheme';

export const defaultTheme = darkTheme;

export const themes = {
  darkTheme, 
  lightTheme,
};

export type { ThemeType } from './index.d';

export * from './themeContext';

/* Temporary static definition */
export default defaultTheme;
