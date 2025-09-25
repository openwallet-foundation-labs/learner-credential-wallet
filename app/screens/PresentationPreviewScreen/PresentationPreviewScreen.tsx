import React from 'react';
import { View, FlatList } from 'react-native';
import { Button } from 'react-native-elements';

import { CredentialItem, NavHeader } from '../../components';
import dynamicStyleSheet from './PresentationPreviewScreen.styles';
import type { PresentationPreviewScreenProps } from '../../navigation';
import type { RenderItemProps } from './PresentationPreviewScreen.d';
import { useDynamicStyles } from '../../hooks';
import { useShareCredentials } from '../../hooks/useShareCredentials';

export default function PresentationPreviewScreen({
  navigation,
  route,
}: PresentationPreviewScreenProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet);
  const { selectedCredentials } = route.params;
  const share = useShareCredentials();

  function renderItem({ item }: RenderItemProps) {
    const { credential } = item;
    const onSelect = () => navigation.navigate('CredentialScreen', { rawCredentialRecord: item });

    return (
      <CredentialItem
        credential={credential}
        onSelect={onSelect}
        chevron
      />
    );
  }

  return (
    <>
      <NavHeader
        title="Share Preview"
        goBack={() => navigation.navigate('ShareHomeScreen')}
      />
      <View style={styles.container}>
        <FlatList
          style={styles.credentialList}
          data={selectedCredentials}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${index}-${item.credential.id}`}
        />
        <Button
          title="Send"
          buttonStyle={mixins.buttonPrimary}
          titleStyle={mixins.buttonTitle}
          onPress={() => share(selectedCredentials)}
        />
      </View>
    </>
  );
}
