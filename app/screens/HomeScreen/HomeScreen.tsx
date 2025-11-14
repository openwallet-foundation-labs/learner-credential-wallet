import React, { useState } from 'react';
import { Text, View, FlatList, AccessibilityInfo, Linking } from 'react-native';
import { Button } from 'react-native-elements';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Swipeable, TouchableOpacity } from 'react-native-gesture-handler';

import { CredentialItem, NavHeader, ConfirmModal } from '../../components';
import { navigationRef } from '../../navigation/navigationRef';
import { LinkConfig } from '../../../app.config';

import dynamicStyleSheet from './HomeScreen.styles';
import { HomeScreenProps, RenderItemProps } from './HomeScreen.d';
import { CredentialRecordRaw } from '../../model';
import { useAppDispatch, useDynamicStyles } from '../../hooks';
import { useShareCredentials } from '../../hooks/useShareCredentials';
import { deleteCredential, selectRawCredentialRecords } from '../../store/slices/credential';
import { getCredentialName } from '../../lib/credentialName';


export default function HomeScreen({ navigation }: HomeScreenProps): React.ReactElement {
  const { styles, theme, mixins } = useDynamicStyles(dynamicStyleSheet);

  const rawCredentialRecords = useSelector(selectRawCredentialRecords);
  const [itemToDelete, setItemToDelete] = useState<CredentialRecordRaw|null>(null);
  const dispatch = useAppDispatch();
  const share = useShareCredentials();

  const itemToDeleteName = itemToDelete ? getCredentialName(itemToDelete.credential) : '';

  function renderItem({ item }: RenderItemProps) {
    const { credential } = item;
    const onSelect = () => navigation.navigate('CredentialScreen', { rawCredentialRecord: item });

    return (
      <View style={styles.swipeItemOuter}>

        <View>
          <Swipeable
            renderLeftActions={() => (
              <TouchableOpacity onPress={() => share([item])} style={[mixins.buttonIconContainer, styles.noShadow]}>
                <View style={[styles.swipeButton, mixins.buttonPrimary]}>
                  <MaterialIcons
                    name="share"
                    size={theme.iconSize}
                    color={theme.color.backgroundPrimary}
                  />
                </View>
              </TouchableOpacity>

            )}
            renderRightActions={() => (
              <TouchableOpacity onPress={() => setItemToDelete(item)} style={[mixins.buttonIconContainer, styles.noShadow]}>
                <View style={[styles.swipeButton, mixins.buttonError]}>
                  <MaterialIcons
                    name="delete"
                    size={theme.iconSize}
                    color={theme.color.backgroundPrimary}
                  />
                </View>
              </TouchableOpacity>
            )}
          >
            <CredentialItem
              rawCredentialRecord={item}
              showStatusBadges
              credential={credential}
              onSelect={onSelect}
              chevron
            />
          </Swipeable>
        </View>
      </View>
    );
  }

  function goToCredentialAdd() {
    if (navigationRef.isReady()) {
      navigationRef.navigate('HomeNavigation', {
        screen: 'AddNavigation',
        params: {
          screen: 'AddScreen',
        },
      });
    }
  }

  function AddCredentialButton(): React.ReactElement {
    return (
      <Button
        title="Add Credential"
        buttonStyle={mixins.buttonIcon}
        containerStyle={[mixins.buttonIconContainer, mixins.noFlex]}
        titleStyle={mixins.buttonIconTitle}
        onPress={goToCredentialAdd}
        iconRight
        icon={
          <MaterialIcons
            name="add-circle"
            size={theme.iconSize}
            color={theme.color.iconInactive}
          />
        }
      />
    );
  }

  async function deleteItem() {
    if (itemToDelete === null) return;
    dispatch(deleteCredential(itemToDelete));
    setItemToDelete(null);
    AccessibilityInfo.announceForAccessibility('Credential Deleted');
  }

  function LearnMoreLink(): React.ReactElement {
    return (
      <View style={styles.learnMoreContainer}>
         <Text style={styles.learnMoreText}>
          <Text
            style={styles.learnMoreLink}
            onPress={() => Linking.openURL(LinkConfig.appWebsite.home)}
            accessibilityRole="link"
            accessibilityLabel="Learn more about the LCW at lcw.app"
          >
           Learn more
          </Text>
          {' '}about LCW
          </Text>
      </View>
    );
  }

  return (
    <>
      <NavHeader title="Home" />
      {rawCredentialRecords.length === 0 ? (
        <View style={styles.container}>
          <Text style={styles.header}>Looks like your wallet is empty.</Text>
          <AddCredentialButton />
          <LearnMoreLink />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={mixins.credentialListContainer}
          data={rawCredentialRecords}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${index}-${item._id}`}
          ListHeaderComponent={<AddCredentialButton />}
          ListFooterComponent={<LearnMoreLink />}
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
        <Text style={styles.modalBodyText}>
          Are you sure you want to remove {itemToDeleteName} from your wallet?
        </Text>
      </ConfirmModal>
    </>
  );
}
