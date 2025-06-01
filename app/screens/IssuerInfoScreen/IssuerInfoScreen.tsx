import React from 'react';
import { View, Text, Linking, Image } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { NavHeader } from '../../components';
import dynamicStyleSheet from './IssuerInfoScreen.styles';
import { IssuerInfoScreenProps } from './IssuerInfoScreen.d';
import { useDynamicStyles, useVerifyCredential } from '../../hooks';
import defaultIssuerImage from '../../assets/defaultIssuer.png';
import { issuerRenderInfoWithVerification } from '../../lib/credentialDisplay/shared/utils/issuer';

const NO_URL = 'None';

export default function IssuerInfoScreen({
  navigation,
  route,
}: IssuerInfoScreenProps): React.ReactElement | null {
  const { rawCredentialRecord } = route.params;
  const { styles } = useDynamicStyles(dynamicStyleSheet);
  const verifyCredential = useVerifyCredential(rawCredentialRecord);
  const credential = rawCredentialRecord.credential;

  const getImageUri = (img?: string | { id?: string }): string | undefined => {
    if (!img) return undefined;
    if (typeof img === 'string') return img;
    if (typeof img === 'object' && typeof img.id === 'string') return img.id;
    return undefined;
  };

  const registeredIssuerLog = verifyCredential?.result?.log?.find(
    (entry) => entry.id === 'registered_issuer'
  ) as { matchingIssuers?: any[] } | undefined;

  const matchingIssuers = registeredIssuerLog?.matchingIssuers ?? [];

  const renderLink = (url?: string, label?: string) => {
    if (!url) return <Text style={styles.dataValue}>{NO_URL}</Text>;
    return (
      <Text style={styles.link} onPress={() => Linking.openURL(url)}>
        {label || url}
      </Text>
    );
  };

  const fallbackIssuer = issuerRenderInfoWithVerification(credential.issuer, verifyCredential?.result);

  return (
    <>
      <NavHeader title="Issuer Info" goBack={navigation.goBack}
      />
      <ScrollView style={styles.bodyContainer}>
        <Text style={styles.sectionTitle}>Information from Known Registries</Text>

        {matchingIssuers.length > 0 ? (
          matchingIssuers.map((entry, index) => {
            const registryName =
              entry.registry?.federation_entity?.organization_name ?? 'Unknown Registry';
            const governanceUrl =
              entry.registry?.federation_entity?.policy_uri;
            const legalName = entry.issuer?.institution_additional_information?.legal_name;
            const issuerEntity = entry.issuer?.federation_entity ?? {};
            const issuerImageUri = getImageUri(issuerEntity.logo_uri);

            console.log('issuerImageUri', issuerImageUri);

            return (
              <View key={index} style={styles.registryBlock}>
                <Text style={styles.registryTitle}>
                  {registryName}{' '}
                  {governanceUrl && (
                    <Text
                      style={styles.link}
                      onPress={() => Linking.openURL(governanceUrl)}
                    >
                      (More info on governance)
                    </Text>
                  )}
                </Text>

                <Image
                  source={issuerImageUri ? { uri: issuerImageUri } : defaultIssuerImage}
                  style={styles.registryImage} resizeMode="contain"
                />

                <View style={styles.dataContainer}>
                  <Text style={styles.dataLabel}>Issuer Name</Text>
                  <Text style={styles.dataValue}>
                    {issuerEntity.organization_name ?? 'N/A'}
                  </Text>
                </View>

                {legalName && (
                  <View style={styles.dataContainer}>
                    <Text style={styles.dataLabel}>Legal Name</Text>
                    <Text style={styles.dataValue}>{legalName}</Text>
                  </View>
                )}

                <View style={styles.dataContainer}>
                  <Text style={styles.dataLabel}>Issuer URL</Text>
                  {renderLink(issuerEntity.homepage_uri)}
                </View>

                {entry.issuer?.credential_registry_entity?.ce_url && (
                  <View style={styles.dataContainer}>
                    <Text style={styles.dataLabel}>CTID URL</Text>
                    {renderLink(entry.issuer.credential_registry_entity.ce_url)}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.registryBlock}>
            <Text style={styles.registryTitle}>Issuer (from Credential)</Text>

            <Image
              source={
                fallbackIssuer.issuerImage
                  ? { uri: fallbackIssuer.issuerImage }
                  : defaultIssuerImage
              }
              style={styles.registryImage} resizeMode="contain"
            />

            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>Issuer Name</Text>
              <Text style={styles.dataValue}>
                {fallbackIssuer.issuerName || 'N/A'}
              </Text>
            </View>

            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>Issuer URL</Text>
              {renderLink(fallbackIssuer.issuerUrl ?? undefined)}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}
