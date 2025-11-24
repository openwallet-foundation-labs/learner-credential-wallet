import { createContext } from 'react'
import { ThemeType } from '.'

export type ThemeContextValue = {
  theme: ThemeType
  isDarkTheme: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
