import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { Text } from 'react-native-elements';
import { MaterialIcons } from '@expo/vector-icons';

import {
  ApprovalStatus,
  ApprovalMessage,
  PendingCredential,
  setCredentialApproval,
} from '../../store/slices/credentialFoyer';
import { getAllCredentials } from '../../store/slices/wallet';
import { CredentialRecord } from '../../model';
import { theme, Color } from '../../styles';
import styles from './ApprovalControls.styles';
import type { Credential } from '../../types/credential';

enum StatusIcon {
  Schedule = 'schedule',
  Close = 'close',
  Done = 'done',
}

type ApprovalControlsProps = {
  pendingCredential: PendingCredential;
};

const iconFor = (status: ApprovalStatus): StatusIcon => ({
  [ApprovalStatus.Pending]: StatusIcon.Schedule,
  [ApprovalStatus.Errored]: StatusIcon.Close,
  [ApprovalStatus.Rejected]: StatusIcon.Close,
  [ApprovalStatus.Accepted]: StatusIcon.Done,
})[status];

const colorFor = (status: ApprovalStatus): Color  => ({
  [ApprovalStatus.Pending]: theme.color.success,
  [ApprovalStatus.Errored]: theme.color.error,
  [ApprovalStatus.Rejected]: theme.color.error,
  [ApprovalStatus.Accepted]: theme.color.success,
})[status];

const defaultMessageFor = (status: ApprovalStatus): ApprovalMessage => ({
  [ApprovalStatus.Pending]: ApprovalMessage.Pending,
  [ApprovalStatus.Accepted]: ApprovalMessage.Accepted,
  [ApprovalStatus.Rejected]: ApprovalMessage.Rejected,
  [ApprovalStatus.Errored]: ApprovalMessage.Errored,
})[status];

export default function ApprovalControls({ pendingCredential }: ApprovalControlsProps): JSX.Element {
  const dispatch = useDispatch();
  const { credential, status, messageOveride } = pendingCredential;
  const message = messageOveride || defaultMessageFor(status);

  async function add(credential: Credential): Promise<void> {
    await CredentialRecord.addCredential(CredentialRecord.rawFrom(credential));
    dispatch(getAllCredentials());
  }

  function setApprovalStatus(status: ApprovalStatus) {
    dispatch(setCredentialApproval({
      ...pendingCredential,
      status,
    }));
  }

  async function accept() {
    try {
      await add(credential);

      setApprovalStatus(ApprovalStatus.Accepted);
    } catch (err) {
      console.warn(err);

      setApprovalStatus(ApprovalStatus.Errored);
    }
  }

  if (status === ApprovalStatus.Pending) {
    return (
      <View style={styles.approvalContainer}>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => setApprovalStatus(ApprovalStatus.Rejected)}
        >
          <Text style={styles.brightActionText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={accept}
        >
          <Text style={styles.darkActionText}>Accept</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    return (
      <View style={styles.approvalContainer}>
        <View style={styles.credentialStatusContainer}>
          <MaterialIcons
            color={colorFor(status)}
            name={iconFor(status)}
            size={theme.iconSize}
          />
          <Text style={styles.statusText}>{message}</Text>
        </View>
      </View>
    );
  }
}
