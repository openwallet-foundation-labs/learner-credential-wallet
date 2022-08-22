import React, { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Button } from 'react-native-elements';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { TextInput } from 'react-native-paper';

import { theme, mixins } from '../../styles';
import { ConfirmModal, NavHeader, ProfileItem } from '../../components';
import { useSelectorFactory } from '../../hooks/useSelectorFactory';
import { makeSelectProfilesWithCredentials } from '../../store/selectorFactories';
import { createProfile } from '../../store/slices/profile';

import { ManageProfilesScreenProps } from './ManageProfilesScreen.d';
import styles from './ManageProfilesScreen.styles';

export default function ManageProfilesScreen({ navigation }: ManageProfilesScreenProps): JSX.Element {
  const [profileName, setProfileName] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false); 
  const dispatch = useDispatch();

  const rawProfileRecords = useSelectorFactory(makeSelectProfilesWithCredentials);
  const flatListData = useMemo(() => [...rawProfileRecords].reverse(), [rawProfileRecords]);

  async function onPressCreate() {
    if (profileName !== '' ) {
      await dispatch(createProfile({ profileName }));
      setModalIsOpen(false);
      setProfileName('');
    }
  }

  async function onPressAddExisting() {}

  const ListHeader = (
    <View>
      <Button
        title="Add New Profile"
        buttonStyle={mixins.buttonIconCompact}
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
        buttonStyle={mixins.buttonIconCompact}
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
        onRequestClose={() => setProfileName('')}
        onCancel={() => setModalIsOpen(false)}
        onConfirm={onPressCreate}
        cancelOnBackgroundPress
        title="New Profile"
        cancelText="Cancel"
        confirmText="Create Profile"
      >
        <TextInput
          value={profileName}
          onChangeText={setProfileName}
          style={styles.input}
          outlineColor={theme.color.textPrimary}
          selectionColor={theme.color.foregroundPrimary}
          theme={{
            colors: {
              placeholder: theme.color.textPrimary,
              text: theme.color.textPrimary,
              primary: theme.color.brightAccent,
            },
          }}
          label="Profile Name"
          mode="outlined"
          keyboardAppearance="dark"
        />
      </ConfirmModal>
      <FlatList
        inverted
        ListFooterComponent={ListHeader}
        style={styles.container}
        data={flatListData}
        renderItem={({ item }) => 
          <ProfileItem rawProfileRecord={item} />
        }
      />
    </>
  );
}
