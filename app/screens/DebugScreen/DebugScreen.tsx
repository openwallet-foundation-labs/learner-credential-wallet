import React from 'react';
import { Text, View, ScrollView } from 'react-native';
import { Button } from 'react-native-elements';

import { NavHeader } from '../../components';
import dynamicStyleSheet from './DebugScreen.styles';
import { DebugScreenProps } from '../../navigation';
import { makeSelectDidFromProfile } from '../../store/selectorFactories/makeSelectDidFromProfile';
import { useSelectorFactory } from '../../hooks/useSelectorFactory';
import { useDynamicStyles } from '../../hooks';

export default function DebugScreen({ navigation, route }: DebugScreenProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet);
  const { rawCredentialRecord, rawProfileRecord } = route.params;
  const rawDidRecord = useSelectorFactory(makeSelectDidFromProfile, { rawProfileRecord });

  function goBack() {
    navigation.goBack();
  }

  function Exit(): React.ReactElement {
    return (
      <Button
        buttonStyle={styles.exitButton}
        titleStyle={styles.exitButtonTitle}
        onPress={goBack}
        title="Exit"
      />
    );
  }

  return (
    <>
      <NavHeader title="Details" rightComponent={<Exit />} />
      <ScrollView>
        <View style={styles.container}>
          <Text style={styles.paragraph}>Credential:</Text>
          <Text style={styles.codeBlock} selectable>
            {JSON.stringify(rawCredentialRecord.credential, null, 2)}
          </Text>
          <Text style={styles.paragraph}>DID Document:</Text>
          <Text style={styles.codeBlock} selectable>
            {JSON.stringify(rawDidRecord.didDocument, null, 2)}
          </Text>
          <Text style={styles.paragraph}>Verification Key:</Text>
          <Text style={styles.codeBlock} selectable>
            {JSON.stringify(rawDidRecord.verificationKey, null, 2)}
          </Text>
          <Text style={styles.paragraph}>Key Agreement Key:</Text>
          <Text style={styles.codeBlock} selectable>
            {JSON.stringify(rawDidRecord.keyAgreementKey, null, 2)}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
