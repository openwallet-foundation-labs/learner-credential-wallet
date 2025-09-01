import uuid from 'react-native-uuid';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {canonicalize as jcsCanonicalize} from 'json-canonicalize';

import { CredentialRecord, CredentialRecordRaw } from '../../model';
import { RootState } from '..';
import { addCredential } from './credential';
import { ObjectID } from 'bson';
import { IVerifiableCredential } from '@digitalcredentials/ssi';

export enum ApprovalStatus {
  Pending,
  PendingDuplicate,
  Accepted,
  Rejected,
  Errored,
}

export enum ApprovalMessage {
  Pending = 'None',
  Accepted = 'Added to Wallet',
  Rejected = 'Credential Declined',
  Errored = 'Credential Failed to Add',
  Duplicate = 'This credential is already in your wallet.'
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

function comparableStringFor(credential: IVerifiableCredential): string {
  const rawCredential = JSON.parse(JSON.stringify(credential));

  delete rawCredential.issuanceDate;
  delete rawCredential.validFrom;
  delete rawCredential.proof;

  return JSON.stringify(jcsCanonicalize(rawCredential));
}

const stageCredentials = createAsyncThunk('credentialFoyer/stageCredentials', async (credentials: IVerifiableCredential[]) => {
  const existingCredentialRecords = await CredentialRecord.getAllCredentialRecords();
  const existingCredentialStrings = existingCredentialRecords.map(({ credential }) => comparableStringFor(credential));

  const pendingCredentials = credentials.map((credential) => {
    const isDuplicate = existingCredentialStrings.includes(comparableStringFor(credential));

    if (isDuplicate) {
      return new PendingCredential(credential, ApprovalStatus.PendingDuplicate);
    }

    return new PendingCredential(credential);
  });

  return { pendingCredentials };
});

const acceptPendingCredentials = createAsyncThunk('credentialFoyer/stageCredentials', async ({ pendingCredentials, profileRecordId }: AcceptPendingCredentialsParams, { dispatch, getState }) => {
  await Promise.all(
    pendingCredentials.map((pendingCredential) => {
      try {
        const { credential } = pendingCredential;
        dispatch(addCredential({ credential, profileRecordId }));
        dispatch(setCredentialApproval({...pendingCredential, status: ApprovalStatus.Accepted }));
      } catch (err) {
        dispatch(setCredentialApproval({...pendingCredential, status: ApprovalStatus.Errored }));
        console.warn('Error while accepting credential:', err);
      }
    })
  );

  const state = await getState() as RootState;
  const freshPendingCredentials = selectPendingCredentials(state);

  const focusedPendingCredentialIds = pendingCredentials.map(({ id }) => id);
  const freshFocusedPendingCredentials = freshPendingCredentials.filter(({ id }) => focusedPendingCredentialIds.includes(id));
  const notAcceptedCredentialCount = freshFocusedPendingCredentials.filter(({ status }) => status !== ApprovalStatus.Accepted).length;

  if (notAcceptedCredentialCount !== 0) {
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

    builder.addCase(acceptPendingCredentials.rejected, (_, action) => {
      throw action.error;
    });
  },
});

export default credentialFoyer.reducer;
export const { clearFoyer, setCredentialApproval, selectExchangeCredentials, clearSelectedExchangeCredentials } = credentialFoyer.actions;
export { stageCredentials, acceptPendingCredentials };

export const selectPendingCredentials = (state: RootState): PendingCredential[] => (state.credentialFoyer || initialState).pendingCredentials;
export const selectSelectedExchangeCredentials = (state: RootState): CredentialRecordRaw[] => (state.credentialFoyer || initialState).selectedExchangeCredentials;
