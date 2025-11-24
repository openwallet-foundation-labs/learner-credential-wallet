import { Color } from '../colors'
import { FontFamily } from '../fonts'
import { ColorScheme } from '../colorScheme'

export type ThemeType = {
  name: string
  color: {
    linkColor: Color
    backgroundPrimary: Color
    backgroundSecondary: Color
    foregroundPrimary: Color
    textHeader: Color
    textPrimary: Color
    brightAccent: Color
    textSecondary: Color
    textPrimaryDark: Color
    iconActive: Color
    iconInactive: Color
    inputInactive: Color
    buttonPrimary: Color
    buttonSecondary: Color
    buttonDisabled: Color
    shadow: Color
    success: Color
    error: Color
    warning: Color
    errorLight: Color
    transparent: Color
    switchActive: Color
    modalBackground: Color
    highlightAndroid: Color
  }
  fontFamily: {
    regular: FontFamily
    medium: FontFamily
    bold: FontFamily
    mono: FontFamily
  }
  fontSize: {
    title: number
    header: number
    medium: number
    regular: number
    small: number
  }
  borderRadius: number
  iconSize: number
  issuerIconSize: number
  statusBarStyle: ColorScheme
  keyboardAppearance: ColorScheme
  shadowOpacity: number
}
