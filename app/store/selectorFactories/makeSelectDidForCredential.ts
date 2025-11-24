import { createSelector } from '@reduxjs/toolkit'
import { CredentialRecordRaw, DidRecordRaw } from '../../model'
import { makeSelectProfileFromCredential } from './makeSelectProfileFromCredential'
import { selectRawDidRecords } from '../slices/did'
import { Selector, expectValue } from '.'

export const makeSelectDidForCredential = (): Selector<
  { rawCredentialRecord: CredentialRecordRaw },
  DidRecordRaw
> =>
  createSelector(
    [makeSelectProfileFromCredential(), selectRawDidRecords],
    (rawProfileRecord, rawDidRecords) => {
      const rawDidRecord = rawDidRecords.find(({ _id }) =>
        _id.equals(rawProfileRecord.didRecordId)
      )
      return expectValue(
        rawDidRecord,
        'DID could not be selected for credential'
      )
    }
  )
