import { useEffect, useState } from 'react'
import { Platform, Appearance } from 'react-native'
import * as SystemUI from 'expo-system-ui'

type ColorScheme = 'light' | 'dark' | null

export function useSystemTheme(): ColorScheme {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(null)

  useEffect(() => {
    let subscription: { remove: () => void } | undefined
    async function getSystemTheme() {
      if (Platform.OS === 'android') {
        try {
          const rootBackgroundColor = await SystemUI.getBackgroundColorAsync()

          if (
            typeof rootBackgroundColor === 'string' &&
            rootBackgroundColor.length > 0
          ) {
            const isDark = isDarkColor(rootBackgroundColor)
            setColorScheme(isDark ? 'dark' : 'light')
          } else {
            const scheme = Appearance.getColorScheme() as
              | 'light'
              | 'dark'
              | null
            setColorScheme(scheme)
            console.log('fallback scheme:', scheme)
          }
        } catch (error) {
          console.log('expo-system-ui failed:', error)
          const scheme = Appearance.getColorScheme() as 'light' | 'dark' | null
          setColorScheme(scheme)
          console.log('fallback scheme after error:', scheme)
        }

        subscription = Appearance.addChangeListener(({ colorScheme }) => {
          setColorScheme((colorScheme ?? null) as 'light' | 'dark' | null)
        })
      } else {
        const scheme = Appearance.getColorScheme() as 'light' | 'dark' | null
        setColorScheme(scheme)

        subscription = Appearance.addChangeListener(({ colorScheme }) => {
          setColorScheme((colorScheme ?? null) as 'light' | 'dark' | null)
        })
      }
    }

    getSystemTheme()

    return () => {
      if (subscription) subscription.remove()
    }
  }, [])

  return colorScheme
}

// Helper to detect if a color is dark
function isDarkColor(color: string): boolean {
  // Remove # if present
  const hex = color.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // If luminance is low, it's a dark color
  return luminance < 0.5
}
