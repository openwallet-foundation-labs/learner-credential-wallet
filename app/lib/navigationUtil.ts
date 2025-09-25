import { CredentialRecordRaw, ProfileRecordRaw } from '../model';
import { navigationRef } from '../navigation/AppNavigation/AppNavigation';
import { CredentialSelectionScreenParams, ProfileSelectionScreenParams, QRScreenParams } from '../screens';
import store from '../store';
import { selectRawProfileRecords } from '../store/slices/profile';

export class NavigationUtil {
  static selectProfile(screenParams?: Omit<ProfileSelectionScreenParams, 'onSelectProfile'>): Promise<ProfileRecordRaw> | ProfileRecordRaw {
    const rawProfileRecords = selectRawProfileRecords(store.getState());
    if (rawProfileRecords.length === 1) {
      return rawProfileRecords[0];
    }

    return new Promise((resolve) => 
      navigationRef.navigate('ProfileSelectionScreen', { 
        onSelectProfile: resolve,
        ...screenParams,
      })
    );
  }

  static selectCredentials(screenParams: Omit<CredentialSelectionScreenParams, 'onSelectCredentials'>): Promise<CredentialRecordRaw[]> {
    return new Promise((resolve) => 
      navigationRef.navigate('CredentialSelectionScreen', { 
        onSelectCredentials: resolve,
        ...screenParams,
      })
    );
  }

  static scanQRCode(screenParams: Omit<QRScreenParams, 'onReadQRCode'>): Promise<string> {
    return new Promise((resolve) => 
      navigationRef.navigate('QRScreen', {
        onReadQRCode: resolve,
        ...screenParams,
      })
    );
  }
}
