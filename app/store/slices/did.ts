import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { RootState } from '..'
import { DidRecord, DidRecordRaw } from '../../model'

export type DidState = {
  rawDidRecords: DidRecordRaw[]
}

const initialState: DidState = {
  rawDidRecords: []
}

const _getAllDidRecords = createAsyncThunk(
  'didState/_getAllDidRecords',
  async () => ({
    rawDidRecords: await DidRecord.getAllDidRecords()
  })
)

const didSlice = createSlice({
  name: 'didState',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(_getAllDidRecords.fulfilled, (state, action) => ({
      ...state,
      ...action.payload
    }))
  }
})

export default didSlice.reducer
export { _getAllDidRecords }

export const selectRawDidRecords = (state: RootState): DidRecordRaw[] =>
  state.did.rawDidRecords
