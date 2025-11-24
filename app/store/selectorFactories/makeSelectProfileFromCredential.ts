import { createSelector } from '@reduxjs/toolkit'
import { CredentialRecordRaw, ProfileRecordRaw } from '../../model'
import { selectRawProfileRecords } from '../slices/profile'
import { Selector, selectProps, expectValue } from '.'

export const makeSelectProfileFromCredential = (): Selector<
  { rawCredentialRecord: CredentialRecordRaw },
  ProfileRecordRaw
> =>
  createSelector(
    [selectRawProfileRecords, selectProps],
    (rawProfileRecords, { rawCredentialRecord }) => {
      const rawProfileRecord = rawProfileRecords.find(({ _id }) =>
        _id.equals(rawCredentialRecord.profileRecordId)
      )
      return expectValue(
        rawProfileRecord,
        'Profile could not be selected from credential'
      )
    }
  )
