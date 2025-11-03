import React, { useState, useCallback } from 'react';
import { Text, View, FlatList, AccessibilityInfo } from 'react-native';
import { NavHeader, ConfirmModal, CredentialListItem } from '../../components';
import { ProfileCredentialsScreenProps } from './ProfileCredentialsScreen.d';
import { CredentialRecordRaw } from '../../model';
import { useAppDispatch, useDynamicStyles, useProfileCredentials } from '../../hooks';
import { useShareCredentials } from '../../hooks/useShareCredentials';
import { deleteCredential } from '../../store/slices/credential';
import { getCredentialName } from '../../lib/credentialName';
import dynamicStyleSheet from '../HomeScreen/HomeScreen.styles';

export default function ProfileCredentialsScreen({ navigation, route }: ProfileCredentialsScreenProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet);
  const { rawProfileRecord } = route.params;
  const profileCredentials = useProfileCredentials(rawProfileRecord._id.toHexString());
  const [itemToDelete, setItemToDelete] = useState<CredentialRecordRaw|null>(null);
  const dispatch = useAppDispatch();
  const share = useShareCredentials();

  const deleteItem = useCallback(async () => {
    if (!itemToDelete) return;
    dispatch(deleteCredential(itemToDelete));
    setItemToDelete(null);
    AccessibilityInfo.announceForAccessibility('Credential Deleted');
  }, [itemToDelete, dispatch]);

  const renderItem = useCallback(({ item }: { item: CredentialRecordRaw }) => (
    <CredentialListItem 
      item={item} 
      onShare={() => share([item])}
      onDelete={() => setItemToDelete(item)}
    />
  ), [share]);

  return (
    <>
      <NavHeader title={rawProfileRecord.profileName} goBack={navigation.goBack} />
      {profileCredentials.length === 0 ? (
        <View style={styles.container}>
          <Text style={styles.header}>This profile has no credentials.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={mixins.credentialListContainer}
          data={profileCredentials}
          renderItem={renderItem}
          keyExtractor={(item) => item._id.toHexString()}
          showsVerticalScrollIndicator={false}
        />
      )}
      <ConfirmModal
        open={itemToDelete !== null}
        onRequestClose={() => setItemToDelete(null)}
        onConfirm={deleteItem}
        title="Delete Credential"
        confirmText="Delete"
        accessibilityFocusContent
      >
        <Text style={mixins.modalBodyText}>
          Are you sure you want to remove {itemToDelete ? getCredentialName(itemToDelete.credential) : ''} from your wallet?
        </Text>
      </ConfirmModal>
    </>
  );
}