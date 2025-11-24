// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/**
 * Template for redux slices.
 * Replace values:
 *   - Entity
 *   - entity
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { EntityRecord, EntityRecordRaw } from '../../model'

export type EntityState = {
  rawEntityRecords: EntityRecordRaw[]
}

const initialState: EntityState = {
  rawEntityRecords: []
}

const getAllEntityRecords = createAsyncThunk(
  'entityState/getAllEntityRecords',
  async () => ({
    rawEntityRecords: await EntityRecord.getAllEntityRecords()
  })
)

const entitySlice = createSlice({
  name: 'entityState',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllEntityRecords.fulfilled, (state, action) => ({
      ...state,
      ...action.payload
    }))
  }
})

export default entitySlice.reducer
export { getAllEntityRecords }
