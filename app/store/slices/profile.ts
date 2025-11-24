import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { type RootState } from '..'
import {
  AddProfileRecordParams,
  ProfileRecord,
  ProfileRecordRaw
} from '../../model'
import { _getAllDidRecords } from './did'

export type ProfileState = {
  rawProfileRecords: ProfileRecordRaw[]
}

const initialState: ProfileState = {
  rawProfileRecords: []
}

const _getAllProfileRecords = createAsyncThunk(
  'profileState/_getAllProfileRecords',
  async (_, { dispatch }) => {
    /* Update associated records */
    await dispatch(_getAllDidRecords())

    return {
      rawProfileRecords: await ProfileRecord.getAllProfileRecords()
    }
  }
)

const createProfile = createAsyncThunk(
  'profileState/createProfile',
  async (params: AddProfileRecordParams, { dispatch }) => {
    await ProfileRecord.addProfileRecord(params)
    await dispatch(_getAllProfileRecords())
  }
)

const updateProfile = createAsyncThunk(
  'profileState/updateProfile',
  async (rawProfileRecord: ProfileRecordRaw, { dispatch }) => {
    await ProfileRecord.updateProfileRecord(rawProfileRecord)
    await dispatch(_getAllProfileRecords())
  }
)

const deleteProfile = createAsyncThunk(
  'profileState/deleteProfile',
  async (rawProfileRecord: ProfileRecordRaw, { dispatch }) => {
    await ProfileRecord.deleteProfileRecord(rawProfileRecord)
    // Import getAllRecords dynamically to avoid circular dependency
    const { getAllRecords } = await import('../getAllRecords')
    await dispatch(getAllRecords())
  }
)

const profileSlice = createSlice({
  name: 'profileState',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(_getAllProfileRecords.fulfilled, (state, action) => ({
      ...state,
      ...action.payload
    }))

    builder.addCase(deleteProfile.rejected, (_, action) => {
      throw action.error
    })
  }
})

export default profileSlice.reducer
export { _getAllProfileRecords, createProfile, deleteProfile, updateProfile }

export const selectRawProfileRecords = (state: RootState): ProfileRecordRaw[] =>
  state.profile.rawProfileRecords
