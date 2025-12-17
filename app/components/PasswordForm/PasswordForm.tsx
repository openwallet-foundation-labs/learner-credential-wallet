import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, TextInput, StyleProp, ViewStyle, Text } from 'react-native'
import { useDynamicStyles } from '../../hooks'
import { Color } from '../../styles'
import ErrorDialog from '../ErrorDialog/ErrorDialog'

import PasswordInput from '../PasswordInput/PasswordInput'
import dynamicStyleSheet from './PasswordForm.styles'

type PasswordFormProps = {
  onChangePassword: (password: string | undefined) => void
  focusOnMount?: boolean
  style?: StyleProp<ViewStyle>
  textInputBackgroundColor?: Color
}

const PASSWORD_LENGTH_REQUIREMENT = 6

export default function PasswordForm({
  focusOnMount,
  onChangePassword,
  style,
  textInputBackgroundColor
}: PasswordFormProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errorText, setErrorText] = useState('')
  const passwordRef = useRef<TextInput>(null)

  const isPasswordValid = useMemo(
    () =>
      password.length >= PASSWORD_LENGTH_REQUIREMENT &&
      password === passwordConfirm,
    [password, passwordConfirm]
  )

  const textInputStyle = textInputBackgroundColor
    ? {
        ...mixins.input,
        backgroundColor: textInputBackgroundColor
      }
    : mixins.input

  useEffect(() => {
    if (focusOnMount) {
      passwordRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    if (isPasswordValid) {
      setErrorText('')
      onChangePassword(password)
    } else {
      onChangePassword(undefined)
    }
  }, [isPasswordValid])

  function _onInputBlur() {
    if (password && passwordConfirm) {
      if (password.length < PASSWORD_LENGTH_REQUIREMENT)
        setErrorText(
          `Password must contain at least ${PASSWORD_LENGTH_REQUIREMENT} characters`
        )
      else if (password !== passwordConfirm)
        setErrorText(
          `Passwords must match and be at least ${PASSWORD_LENGTH_REQUIREMENT} characters`
        )
      else setErrorText('')
    }
  }

  return (
    <View style={style}>
      <PasswordInput
        style={textInputStyle}
        label="Password"
        value={password}
        onChangeText={setPassword}
        onBlur={_onInputBlur}
        inputRef={passwordRef as any}
        tvParallaxProperties={undefined}
        onTextInput={() => {}}
        testID="password-input"
      />
      <PasswordInput
        style={textInputStyle}
        label="Confirm Password"
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        onBlur={_onInputBlur}
        tvParallaxProperties={undefined}
        onTextInput={() => {}}
        testID="confirm-password-input"
      />
      <Text style={styles.helperText}>
        You will need to store this password somewhere safe - the LCW does not
        store personal information, collect data, or track usage.
      </Text>
      {errorText ? (
        <>
          <View style={styles.inputSeparator} />
          <ErrorDialog message={errorText} />
        </>
      ) : null}
    </View>
  )
}
