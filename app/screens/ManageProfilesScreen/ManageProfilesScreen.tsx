import React, { useMemo, useState } from 'react';
import { View, FlatList, Text } from 'react-native';
import { Button } from 'react-native-elements';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppDispatch, useDynamicStyles } from '../../hooks';
import { TextInput } from 'react-native-paper';

import { ConfirmModal, NavHeader, ProfileItem } from '../../components';
import { useSelectorFactory } from '../../hooks/useSelectorFactory';
import { makeSelectProfilesWithCredentials } from '../../store/selectorFactories';
import { createProfile } from '../../store/slices/profile';

import { ManageProfilesScreenProps } from './ManageProfilesScreen.d';
import dynamicStyleSheet from './ManageProfilesScreen.styles';

export default function ManageProfilesScreen({ navigation }: ManageProfilesScreenProps): React.ReactElement {
  const { styles, theme, mixins } = useDynamicStyles(dynamicStyleSheet);
  const [profileName, setProfileName] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const dispatch = useAppDispatch();

  const rawProfileRecords = useSelectorFactory(makeSelectProfilesWithCredentials);
  const flatListData = useMemo(() => [...rawProfileRecords], [rawProfileRecords]);

  async function onPressCreate() {
    if (profileName !== '') {
      try {
        await dispatch(createProfile({ profileName })).unwrap();
        setModalIsOpen(false);
        setProfileName('');
        setErrorMessage('');
      } catch (error: any) {
        setErrorMessage(error.message || 'Failed to create profile');
      }
    }
  }

  async function onPressAddExisting() {
    navigation.navigate('AddExistingProfileScreen');
  }

  const ListHeader = (
    <View>
      <Button
        title="Create New Profile"
        buttonStyle={mixins.buttonIcon}
        containerStyle={mixins.buttonContainerVertical}
        titleStyle={mixins.buttonIconTitle}
        iconRight
        onPress={() => setModalIsOpen(true)}
        icon={
          <MaterialIcons
            name="add-circle"
            size={theme.iconSize}
            color={theme.color.iconInactive}
          />
        }
      />
      <Button
        title="Add Existing Profile"
        buttonStyle={mixins.buttonIcon}
        containerStyle={mixins.buttonContainerVertical}
        titleStyle={mixins.buttonIconTitle}
        iconRight
        onPress={onPressAddExisting}
        icon={
          <MaterialIcons
            name="add-circle"
            size={theme.iconSize}
            color={theme.color.iconInactive}
          />
        }
      />
    </View>
  );

  return (
    <>
      <NavHeader title="Manage Profiles" goBack={navigation.goBack} />
      <ConfirmModal
        open={modalIsOpen}
        onRequestClose={() => {
          setProfileName('');
          setErrorMessage('');
        }}
        onCancel={() => {
          setModalIsOpen(false);
          setErrorMessage('');
        }}
        onConfirm={onPressCreate}
        cancelOnBackgroundPress
        title="New Profile"
        cancelText="Cancel"
        confirmText="Create Profile"
      >
        <TextInput
          value={profileName}
          onChangeText={(text) => {
            setProfileName(text);
            setErrorMessage('');
          }}
          style={styles.input}
          outlineColor={theme.color.textPrimary}
          selectionColor={theme.color.textPrimary}
          theme={{
            colors: {
              placeholder: profileName ? theme.color.textPrimary : theme.color.inputInactive,
              text: theme.color.textPrimary,
              primary: theme.color.brightAccent,
            },
          }}
          label="Profile Name"
          mode="outlined"
          keyboardAppearance={theme.keyboardAppearance}
          tvParallaxProperties={undefined}
          onTextInput={() => {}}
        />
        {errorMessage ? (
          <Text style={[styles.errorText, { color: theme.color.error }]}>
            {errorMessage}
          </Text>
        ) : null}
      </ConfirmModal>
      <FlatList
        style={styles.list}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.contentContainer}
        data={flatListData}
        renderItem={({ item }) => (
          <ProfileItem rawProfileRecord={item} />
        )}
        keyExtractor={(item) => item._id.toHexString?.() ?? String(item._id)}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}
