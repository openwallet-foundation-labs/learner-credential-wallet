import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useAppDispatch, useDynamicStyles } from '../../hooks';
import { Text } from 'react-native-elements';
import { MaterialIcons } from '@expo/vector-icons';

import {
  ApprovalStatus,
  ApprovalMessage,
  PendingCredential,
  setCredentialApproval,
  acceptPendingCredentials,
  clearFoyer,
} from '../../store/slices/credentialFoyer';
import { Color, ThemeType } from '../../styles';
import dynamicStyleSheet from './ApprovalControls.styles';
import { useAccessibilityFocus } from '../../hooks';
import { ObjectID } from 'bson';
import { navigationRef } from '../../navigation/navigationRef';

enum StatusIcon {
  Schedule = 'schedule',
  Close = 'close',
  Done = 'done'
}

type ApprovalControlsProps = {
  pendingCredential: PendingCredential;
  profileRecordId: ObjectID;
};

type ApprovalButtonProps = {
  title: string;
  onPress: () => void;
  primary?: boolean;
}

const iconFor = (status: ApprovalStatus): StatusIcon => ({
  [ApprovalStatus.Pending]: StatusIcon.Schedule,
  [ApprovalStatus.PendingDuplicate]: StatusIcon.Schedule,
  [ApprovalStatus.Errored]: StatusIcon.Close,
  [ApprovalStatus.Rejected]: StatusIcon.Close,
  [ApprovalStatus.Accepted]: StatusIcon.Done,
})[status];

const colorFor = (status: ApprovalStatus, theme: ThemeType): Color  => ({
  [ApprovalStatus.Pending]: theme.color.success,
  [ApprovalStatus.PendingDuplicate]: theme.color.success,
  [ApprovalStatus.Errored]: theme.color.error,
  [ApprovalStatus.Rejected]: theme.color.error,
  [ApprovalStatus.Accepted]: theme.color.success,
})[status];

const defaultMessageFor = (status: ApprovalStatus): ApprovalMessage => ({
  [ApprovalStatus.Pending]: ApprovalMessage.Pending,
  [ApprovalStatus.PendingDuplicate]: ApprovalMessage.Duplicate,
  [ApprovalStatus.Accepted]: ApprovalMessage.Accepted,
  [ApprovalStatus.Rejected]: ApprovalMessage.Rejected,
  [ApprovalStatus.Errored]: ApprovalMessage.Errored,
})[status];

function ApprovalButton({ title, onPress, primary }: ApprovalButtonProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet);

  return (
    <TouchableOpacity
      style={[styles.button, primary && styles.buttonPrimary]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function ApprovalControls({ pendingCredential, profileRecordId }: ApprovalControlsProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);
  const dispatch = useAppDispatch();
  const { status, messageOverride } = pendingCredential;
  const message = messageOverride || defaultMessageFor(status);
  const [statusRef, focusStatus] = useAccessibilityFocus<View>();

  function setApprovalStatus(status: ApprovalStatus) {
    dispatch(setCredentialApproval({
      ...pendingCredential,
      status,
    }));
  }

  function reject() {
    setApprovalStatus(ApprovalStatus.Rejected);
    focusStatus();
  }

  async function rejectAndExit() {
    setApprovalStatus(ApprovalStatus.Rejected);
    await dispatch(clearFoyer());
    if (navigationRef.isReady()) {
      navigationRef.navigate('HomeNavigation', {
        screen: 'CredentialNavigation',
        params: {
          screen: 'HomeScreen',
        },
      });
    }
  }

  useEffect(focusStatus, []);

  async function accept() {
    await dispatch(acceptPendingCredentials({ pendingCredentials: [pendingCredential], profileRecordId }));
    focusStatus();
  }

  switch (status) {
  case ApprovalStatus.Pending:
    return (
      <View style={styles.approvalContainer}>
        <ApprovalButton title="Decline" onPress={reject} />
        <View style={styles.buttonSpacer} />
        <ApprovalButton title="Accept" onPress={accept} primary />
      </View>
    );
  case ApprovalStatus.PendingDuplicate:
    return (
      <>
        <View style={styles.approvalContainer}>
          <ApprovalButton title="Close" onPress={rejectAndExit} primary />
        </View>
        <Text style={styles.statusTextOutside}>{message}</Text>
      </>
    );
  default:
    return (
      <View style={styles.approvalContainer} accessible>
        <View style={styles.credentialStatusContainer} ref={statusRef}>
          <MaterialIcons
            color={colorFor(status, theme)}
            name={iconFor(status)}
            size={theme.iconSize}
          />
          <Text style={styles.statusText}>{message}</Text>
        </View>
      </View>
    );
  }
}
