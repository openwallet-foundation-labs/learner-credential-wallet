import React, { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Text, Button } from 'react-native-elements';
import { useSelector } from 'react-redux';

import CredentialItem from '../../components/CredentialItem/CredentialItem';
import NavHeader from '../../components/NavHeader/NavHeader';
import dynamicStyleSheet from './CredentialSelectionScreen.styles';
import type { RenderItemProps } from './CredentialSelectionScreen.d';
import type { CredentialSelectionScreenProps } from '../../navigation';
import { selectRawCredentialRecords } from '../../store/slices/credential';
import { useDynamicStyles } from '../../hooks';

export default function CredentialSelectionScreen({
  navigation,
  route
}: CredentialSelectionScreenProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet);
  const { title, instructionText, onSelectCredentials, singleSelect, credentialFilter, goBack = navigation.goBack } = route.params;

  const [selected, setSelected] = useState<number[]>([]);
  const allItems = useSelector(selectRawCredentialRecords);
  const filteredItems = useMemo(() => credentialFilter ? allItems.filter(credentialFilter) : allItems, [allItems]);
  const selectedCredentials = useMemo(() => selected.map((i) => filteredItems[i]), [selected, filteredItems]);

  function toggleItem(credentialIndex: number): void {
    if (selected.includes(credentialIndex)) {
      setSelected(selected.filter(i => i !== credentialIndex));
    } else {
      setSelected([...selected, credentialIndex]);
    }
  }

  function renderItem({ item, index }: RenderItemProps): React.ReactElement {
    const { credential } = item;

    const onSelectItem = () => {
      toggleItem(index);
      if (singleSelect) onSelectCredentials([item]);
    };

    return (
      <CredentialItem
        credential={credential}
        onSelect={onSelectItem}
        selected={selected.includes(index)}
        checkable={!singleSelect}
        hideLeft={singleSelect}
        chevron={singleSelect}
        rawCredentialRecord={item}
        showStatusBadges
      />
    );
  }



  function ShareButton(): React.ReactElement | null {
    if (selected.length === 0 || singleSelect) {
      return null;
    }

    return (
      <Button
        title="Send Selected Credentials"
        buttonStyle={styles.shareButton}
        titleStyle={mixins.buttonTitle}
        onPress={() => onSelectCredentials(selectedCredentials)}
      />
    );
  }

  return (
    <>
      <NavHeader
        title={title}
        goBack={goBack}
      />
      <View style={styles.container}>
        <Text style={styles.paragraph}>
          {instructionText}
        </Text>
        <FlatList
          indicatorStyle="white"
          style={styles.credentialList}
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${index}-${item.credential.id}`}
        />
        <ShareButton />
      </View>
    </>
  );
}
