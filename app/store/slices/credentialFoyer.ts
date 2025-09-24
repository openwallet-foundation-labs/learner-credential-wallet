import uuid from 'react-native-uuid';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {canonicalize as jcsCanonicalize} from 'json-canonicalize';

import { CredentialRecord, CredentialRecordRaw } from '../../model';
import { RootState } from '..';
import { addCredential } from './credential';
import { ObjectID } from 'bson';
import { IVerifiableCredential } from '@digitalcredentials/ssi';
import { credentialContentHash } from '../../lib/credentialHash';

export enum ApprovalStatus {
  Pending,
  PendingDuplicate,
  Accepted,
  Rejected,
  Errored
}

export enum ApprovalMessage {
  Pending = 'None',
  Accepted = 'Added to Wallet',
  Rejected = 'Credential Declined',
  Errored = 'Credential Failed to Add',
  Duplicate = 'This credential already exists in the selected profile and cannot be added again.'
}

export class PendingCredential {
  id: string = uuid.v4() as string;
  status: ApprovalStatus;
  credential: IVerifiableCredential;
  messageOverride?: ApprovalMessage;

  constructor(
    credential: IVerifiableCredential,
    status: ApprovalStatus = ApprovalStatus.Pending,
    messageOverride?: ApprovalMessage,
  ) {
    this.credential = credential;
    this.status = status;
    this.messageOverride = messageOverride;
  }
}

export type CredentialFoyerState = {
  pendingCredentials: PendingCredential[];
  selectedExchangeCredentials: CredentialRecordRaw[];
};

type AcceptPendingCredentialsParams = {
  pendingCredentials: PendingCredential[];
  profileRecordId: ObjectID;
}

const initialState: CredentialFoyerState = {
  pendingCredentials: [],
  selectedExchangeCredentials: []
};

// TODO: Why are we excluding validFrom and issuanceDate from the comparison?
function comparableStringFor(credential: IVerifiableCredential): string {
  const rawCredential = JSON.parse(JSON.stringify(credential));

  delete rawCredential.issuanceDate;
  delete rawCredential.validFrom;
  delete rawCredential.proof;

  return JSON.stringify(jcsCanonicalize(rawCredential));
}

const stageCredentials = createAsyncThunk('credentialFoyer/stageCredentials', async (credentials: IVerifiableCredential[]) => {
  // Legacy behavior (global duplicate check) for backward compatibility
  const existingCredentialRecords = await CredentialRecord.getAllCredentialRecords();
  const existingHashes = existingCredentialRecords.map(({ credential }) => credentialContentHash(credential));

  const pendingCredentials = credentials.map((credential) => {
    const isDuplicate = existingHashes.includes(credentialContentHash(credential));
    return new PendingCredential(credential, isDuplicate ? ApprovalStatus.PendingDuplicate : ApprovalStatus.Pending);
  });

  return { pendingCredentials };
});

type StageForProfileParams = { credentials: IVerifiableCredential[]; profileRecordId: ObjectID };
const stageCredentialsForProfile = createAsyncThunk('credentialFoyer/stageCredentialsForProfile', async ({ credentials, profileRecordId }: StageForProfileParams) => {
  const existingCredentialRecords = await CredentialRecord.getAllCredentialRecords();
  const existingHashesInProfile = existingCredentialRecords
    .filter(({ profileRecordId: pid }) => pid.equals(profileRecordId))
    .map(({ credential }) => credentialContentHash(credential));

  const pendingCredentials = credentials.map((credential) => {
    const isDuplicate = existingHashesInProfile.includes(credentialContentHash(credential));
    return new PendingCredential(credential, isDuplicate ? ApprovalStatus.PendingDuplicate : ApprovalStatus.Pending);
  });

  return { pendingCredentials };
});

const acceptPendingCredentials = createAsyncThunk('credentialFoyer/stageCredentials', async ({ pendingCredentials, profileRecordId }: AcceptPendingCredentialsParams, { dispatch, getState }) => {
  await Promise.all(
    pendingCredentials.map((pendingCredential) => {
      try {
        if (pendingCredential.status === ApprovalStatus.PendingDuplicate) {
          // Skip adding duplicates for this profile
          dispatch(setCredentialApproval({ ...pendingCredential, status: ApprovalStatus.Rejected, messageOverride: ApprovalMessage.Duplicate }));
          return;
        }

        const { credential } = pendingCredential;
        dispatch(addCredential({ credential, profileRecordId }));
        dispatch(setCredentialApproval({ ...pendingCredential, status: ApprovalStatus.Accepted }));
      } catch (err) {
        dispatch(setCredentialApproval({ ...pendingCredential, status: ApprovalStatus.Errored }));
        console.warn('Error while accepting credential:', err);
      }
    })
  );

  const state = await getState() as RootState;
  const freshPendingCredentials = selectPendingCredentials(state);

  const focusedPendingCredentialIds = pendingCredentials.map(({ id }) => id);
  const freshFocusedPendingCredentials = freshPendingCredentials.filter(({ id }) => focusedPendingCredentialIds.includes(id));
  const remainingCount = freshFocusedPendingCredentials.filter(({ status }) => status !== ApprovalStatus.Accepted && status !== ApprovalStatus.Rejected).length;

  if (remainingCount !== 0) {
    throw new Error('Unable to accept all credentials');
  }
});

const credentialFoyer = createSlice({
  name: 'credentialFoyer',
  initialState,
  reducers: {
    clearFoyer(state = initialState) {
      state.pendingCredentials = initialState.pendingCredentials;
      state.selectedExchangeCredentials = initialState.selectedExchangeCredentials;
    },
    setCredentialApproval(state = initialState, action: PayloadAction<PendingCredential>) {
      const isSubject = ({ id: given }: PendingCredential) => given === action.payload.id;
      const subject = state.pendingCredentials.find(isSubject);

      if (subject === undefined) return;

      return {
        ...state,
        pendingCredentials: state.pendingCredentials.map(
          (pendingCredential) => {
            if (isSubject(pendingCredential)) {
              return {
                ...pendingCredential,
                status: action.payload.status,
              };
            } else {
              return pendingCredential;
            }
          },
        ),
      };
    },
    selectExchangeCredentials: (state: CredentialFoyerState, action: PayloadAction<CredentialRecordRaw[]>) => {
      state.selectedExchangeCredentials = action.payload;
    },
    clearSelectedExchangeCredentials: (state: CredentialFoyerState) => {
      state.selectedExchangeCredentials = [];
    }
  },
  extraReducers: (builder) => {
    builder.addCase(stageCredentials.fulfilled, (state, action) => ({
      ...state,
      ...action.payload,
    }));

    builder.addCase(stageCredentialsForProfile.fulfilled, (state, action) => ({
      ...state,
      ...action.payload,
    }));

    builder.addCase(acceptPendingCredentials.rejected, (_, action) => {
      throw action.error;
    });
  },
});

export default credentialFoyer.reducer;
export const { clearFoyer, setCredentialApproval, selectExchangeCredentials, clearSelectedExchangeCredentials } = credentialFoyer.actions;
export { stageCredentials, stageCredentialsForProfile, acceptPendingCredentials };

export const selectPendingCredentials = (state: RootState): PendingCredential[] => (state.credentialFoyer || initialState).pendingCredentials;
export const selectSelectedExchangeCredentials = (state: RootState): CredentialRecordRaw[] => (state.credentialFoyer || initialState).selectedExchangeCredentials;
