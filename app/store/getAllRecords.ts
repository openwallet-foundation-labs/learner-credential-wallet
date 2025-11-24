import { createAsyncThunk } from '@reduxjs/toolkit'
import { _getAllDidRecords } from './slices/did'
import { _getAllCredentialRecords } from './slices/credential'
import { _getAllProfileRecords } from './slices/profile'

export const getAllRecords = createAsyncThunk(
  'getAllRecords',
  async (_, { dispatch }) => {
    await dispatch(_getAllDidRecords())
    await dispatch(_getAllCredentialRecords())
    await dispatch(_getAllProfileRecords())
  }
)
