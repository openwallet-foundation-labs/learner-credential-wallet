import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { RootState } from '..'
import {
  AddCredentialRecordParams,
  CredentialRecord
} from '../../model/credential'
import { CredentialRecordRaw } from '../../types/credential'

export type CredentialState = {
  rawCredentialRecords: CredentialRecordRaw[]
}

const initialState: CredentialState = {
  rawCredentialRecords: []
}

const _getAllCredentialRecords = createAsyncThunk(
  'credentialState/_getAllCredentialRecords',
  async () => ({
    rawCredentialRecords: await CredentialRecord.getAllCredentialRecords()
  })
)

const addCredential = createAsyncThunk(
  'credentialState/addCredential',
  async (params: AddCredentialRecordParams, { dispatch }) => {
    await CredentialRecord.addCredentialRecord(params)
    dispatch(_getAllCredentialRecords())
  }
)

const deleteCredential = createAsyncThunk(
  'credentialState/deleteCredential',
  async (rawCredentialRecord: CredentialRecordRaw, { dispatch }) => {
    await CredentialRecord.deleteCredentialRecord(rawCredentialRecord)
    dispatch(_getAllCredentialRecords())
  }
)

const credentialSlice = createSlice({
  name: 'credentialState',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(_getAllCredentialRecords.fulfilled, (state, action) => ({
      ...state,
      ...action.payload
    }))

    builder.addCase(addCredential.rejected, (_, action) => {
      throw action.error
    })
  }
})

export default credentialSlice.reducer
export { _getAllCredentialRecords, addCredential, deleteCredential }

export const selectRawCredentialRecords = (
  state: RootState
): CredentialRecordRaw[] => state.credential.rawCredentialRecords
