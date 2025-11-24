import { useContext } from 'react'
import { ThemeContext, ThemeContextValue } from '../styles'

export function useThemeContext(): ThemeContextValue {
  const themeContext = useContext(ThemeContext)

  if (themeContext === null) {
    throw new Error('ThemeProvider not found')
  }

  return themeContext
}
