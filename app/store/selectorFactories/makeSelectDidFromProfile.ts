import { createSelector } from '@reduxjs/toolkit'
import { DidRecordRaw, ProfileRecordRaw } from '../../model'
import { selectRawDidRecords } from '../slices/did'
import { Selector, selectProps, expectValue } from '.'

export const makeSelectDidFromProfile = (): Selector<
  { rawProfileRecord: ProfileRecordRaw },
  DidRecordRaw
> =>
  createSelector(
    [selectRawDidRecords, selectProps],
    (rawDidRecords, { rawProfileRecord }) => {
      const rawDidRecord = rawDidRecords.find(({ _id }) =>
        _id.equals(rawProfileRecord.didRecordId)
      )
      return expectValue(rawDidRecord, 'DID could not be selected from profile')
    }
  )
