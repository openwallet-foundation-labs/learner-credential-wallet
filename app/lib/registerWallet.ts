import { Linking } from 'react-native';

import {LinkConfig} from '../../app.config';

export function registerWallet(): void {
  Linking.canOpenURL(LinkConfig.registerWalletUrl).then(supported => {
    if (supported) {
      Linking.openURL(LinkConfig.registerWalletUrl);
    } else {
      console.log('Unable to register wallet! Failed URL');
    }
  });
}
