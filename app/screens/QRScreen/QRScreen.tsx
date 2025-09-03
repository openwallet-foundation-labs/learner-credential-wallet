import React, {useEffect, useRef, useState,} from 'react';
import {Text,  useWindowDimensions} from 'react-native';
import { View,  StyleSheet } from 'react-native';

import { ConfirmModal } from '../../components';
import { NavHeader } from '../../components';
import { QRScreenProps } from './QRScreen.d';
import dynamicStyleSheet from './QRScreen.styles';
import { errorMessageFrom } from '../../lib/error';
import { useDynamicStyles } from '../../hooks';
import QRCodeScanner from 'react-native-qrcode-scanner';
import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import {useAppState} from '@react-native-community/hooks';
import {useCameraPermissionStatus} from './useCameraPermissionStatus';
export default function QRScreen({ navigation, route }: QRScreenProps)  {
  const { styles } = useDynamicStyles(dynamicStyleSheet);
  const { onReadQRCode, instructionText } = route.params;
  const isActivated = useRef(true);
  const deactivate = () => {
    isActivated.current = false;
  };
  const activate = () => {
    isActivated.current = true;
  };
  const [errorMessage, setErrorMessage] = useState('');
  const { width } = useWindowDimensions();

  const errorModalOpen = errorMessage !== '';

  const {status, requestPermission} = useCameraPermissionStatus();

  useEffect(() => {
    if (status === 'undetermined') {
      requestPermission();
    }
  }, [status, requestPermission]);


  function Instructions(): React.ReactElement {
    return (
      <Text style={styles.instructionText}>
        {instructionText}
      </Text>
    );
  }

  useFocusEffect(
    React.useCallback(() => {
      activate();

      return deactivate;
    }, []),
  );

  async function onRead(e: any) {
    if (!e || !e.data) {
      return;
    }
    if (!isActivated.current) {
      return;
    }
    deactivate();
    try {
      await onReadQRCode(e.data);
    } catch (err) {
      setErrorMessage(errorMessageFrom(err));
    }
  }

  function onRequestModalClose() {
    setErrorMessage('');
    // setTimeout(() => scannerRef.current?.reactivate(), 1000);
  }

  // function goToSettings() {
  //   Linking.openSettings();
  // }
  //
  // function navGoBack() {
  //   navigation.goBack();
  // }

  // function NoCameraPermission(): React.ReactElement {
  //   return (
  //     <View>
  //       {
  //         Alert.alert(
  //           'Camera Access is Off',
  //           'Please go into your camera settings and enable access for this app',
  //           [
  //             {
  //               text: 'Go Back',
  //               onPress: navGoBack
  //             },
  //             {
  //               text: 'Settings',
  //               onPress: goToSettings
  //             }
  //           ])
  //       }
  //     </View>
  //   );
  // }

  const isFocused = useIsFocused();
  const appState = useAppState();
  const isActive = isFocused && appState === 'active';

  if (status === 'denied') {
    return null;
    // TODO should return <NoCameraPermissionView />;
  }


  return (
    <View style={styles.scannerBody}>
      <NavHeader title="QR Code Scanner" goBack={navigation.goBack} />
      <Instructions />
      <QRCodeScanner
        onRead={isActive ? onRead : () => {}}
        cameraStyle={styles.cameraStyle}
        showMarker={false}
        reactivate={false}
        reactivateTimeout={5000}
      />
      <View style={stylez.rectangleContainer}>
        <View
          style={[
            stylez.rectangle,
            styles.markerStyle,
            {
              width: width * 0.8,
              height: width * 0.8,
            }
          ]}
        />
      </View>

      <ConfirmModal
        open={errorModalOpen}
        onRequestClose={onRequestModalClose}
        confirmText="Okay"
        cancelButton={false}
        cancelOnBackgroundPress
        title={errorMessage}
      />
    </View>
  );
}

const stylez = StyleSheet.create({
  rectangleContainer: {
    ...StyleSheet.absoluteFillObject,
    top: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rectangle: {
    height: 250,
    width: 250,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});
