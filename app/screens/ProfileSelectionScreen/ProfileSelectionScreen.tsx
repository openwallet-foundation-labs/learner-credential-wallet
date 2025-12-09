import React, { useEffect, useMemo, useRef, useCallback } from 'react'
import { FlatList, Text, View } from 'react-native'
import { Button, ListItem } from 'react-native-elements'

import dynamicStyleSheet from './ProfileSelectionScreen.styles'
import {
  ProfileSelectionScreenProps,
  ProfileButtonProps
} from './ProfileSelectionScreen.d'
import { NavHeader } from '../../components'
import { useSelector } from 'react-redux'
import { selectRawProfileRecords } from '../../store/slices/profile'
import { useDynamicStyles, useSelectorFactory } from '../../hooks'
import { ProfileRecordRaw } from '../../model'

import { makeSelectProfileForPendingCredentials } from '../../store/selectorFactories/makeSelectProfileForPendingCredentials'

export default function ProfileSelectionScreen({
  navigation,
  route
}: ProfileSelectionScreenProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet)
  const rawProfileRecords = useSelector(selectRawProfileRecords)
  const associatedProfile = useSelectorFactory(
    makeSelectProfileForPendingCredentials
  )

  const {
    onSelectProfile,
    instructionText = 'Please select a profile.',
    goBack = navigation.goBack
  } = route.params || {}

  const flatListData = useMemo(
    () => [...rawProfileRecords],
    [rawProfileRecords]
  )

  const hasAutoSelected = useRef(false)

  const handleSelectProfile = useCallback(
    (profile: ProfileRecordRaw) => {
      hasAutoSelected.current = true
      onSelectProfile(profile)
    },
    [onSelectProfile]
  )

  useEffect(() => {
    if (hasAutoSelected.current) return

    if (associatedProfile) {
      handleSelectProfile(associatedProfile)
    } else if (rawProfileRecords.length === 1) {
      handleSelectProfile(rawProfileRecords[0])
    }
  }, [associatedProfile, rawProfileRecords, handleSelectProfile])

  const ListHeader = (
    <View style={styles.listHeader}>
      <Text style={mixins.paragraphText}>{instructionText}</Text>
    </View>
  )

  return (
    <>
      <NavHeader title="Choose Profile" goBack={goBack} />
      <FlatList
        ListHeaderComponent={ListHeader}
        style={styles.container}
        data={flatListData}
        renderItem={({ item }) => (
          <ProfileButton
            rawProfileRecord={item}
            onPress={() => handleSelectProfile(item)}
          />
        )}
      />
    </>
  )
}

function ProfileButton({ rawProfileRecord, onPress }: ProfileButtonProps) {
  const { mixins, theme } = useDynamicStyles()

  return (
    <Button
      title={rawProfileRecord.profileName}
      buttonStyle={mixins.buttonIcon}
      containerStyle={mixins.buttonContainerVertical}
      titleStyle={mixins.buttonIconTitle}
      iconRight
      onPress={onPress}
      icon={
        <ListItem.Chevron
          hasTVPreferredFocus={undefined}
          color={theme.color.textSecondary}
        />
      }
    />
  )
}
