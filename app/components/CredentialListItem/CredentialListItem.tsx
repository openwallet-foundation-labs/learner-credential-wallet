import React from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Swipeable, TouchableOpacity } from 'react-native-gesture-handler';
import CredentialItem from '../CredentialItem/CredentialItem';
import { navigationRef } from '../../navigation/navigationRef';
import { CredentialRecordRaw } from '../../model';
import { useDynamicStyles } from '../../hooks';
import dynamicStyleSheet from '../../screens/HomeScreen/HomeScreen.styles';

type Props = {
  item: CredentialRecordRaw;
  onShare: () => void;
  onDelete: () => void;
};

export default function CredentialListItem({ item, onShare, onDelete }: Props) {
  const { styles, theme, mixins } = useDynamicStyles(dynamicStyleSheet);

  const onSelect = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('HomeNavigation', {
        screen: 'CredentialNavigation',
        params: {
          screen: 'CredentialScreen',
          params: { rawCredentialRecord: item }
        }
      });
    }
  };

  return (
    <View style={styles.swipeItemOuter}>
      <Swipeable
        renderLeftActions={() => (
          <TouchableOpacity onPress={onShare} style={[mixins.buttonIconContainer, styles.noShadow]}>
            <View style={[styles.swipeButton, mixins.buttonPrimary]}>
              <MaterialIcons name="share" size={theme.iconSize} color={theme.color.backgroundPrimary} />
            </View>
          </TouchableOpacity>
        )}
        renderRightActions={() => (
          <TouchableOpacity onPress={onDelete} style={[mixins.buttonIconContainer, styles.noShadow]}>
            <View style={[styles.swipeButton, mixins.buttonError]}>
              <MaterialIcons name="delete" size={theme.iconSize} color={theme.color.backgroundPrimary} />
            </View>
          </TouchableOpacity>
        )}
      >
        <CredentialItem
          rawCredentialRecord={item}
          showStatusBadges
          credential={item.credential}
          onSelect={onSelect}
          chevron
        />
      </Swipeable>
    </View>
  );
}