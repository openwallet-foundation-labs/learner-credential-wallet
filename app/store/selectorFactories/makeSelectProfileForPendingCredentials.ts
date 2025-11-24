import { createSelector } from '@reduxjs/toolkit'
import { ProfileRecordRaw } from '../../model'
import { selectRawProfileRecords } from '../slices/profile'
import { Selector } from '.'
import {
  PendingCredential,
  selectPendingCredentials
} from '../slices/credentialFoyer'
import { selectRawDidRecords } from '../slices/did'

export const makeSelectProfileForPendingCredentials = (): Selector<
  undefined,
  ProfileRecordRaw | null
> =>
  createSelector(
    [selectRawProfileRecords, selectRawDidRecords, selectPendingCredentials],
    (rawProfileRecords, rawDidRecords, pendingCredentials) => {
      const didKey = reduceCommonDidKeyFrom(pendingCredentials)

      if (didKey) {
        const rawDidRecord = rawDidRecords.find(
          ({ didDocument }) => didDocument.id === didKey
        )
        if (rawDidRecord) {
          const rawProfileRecord =
            rawProfileRecords.find(({ didRecordId }) =>
              didRecordId.equals(rawDidRecord._id)
            ) || null
          return rawProfileRecord
        }
      }

      return null
    }
  )

export function didKeyFrom(
  pendingCredential: PendingCredential
): string | null {
  let subject = pendingCredential.credential.credentialSubject
  if (!subject) {
    return null
  }
  if (Array.isArray(subject) && subject.length === 0) {
    return null
  }
  if (!Array.isArray(subject)) {
    subject = [subject]
  }
  // @ts-ignore
  return subject[0].id || null
}

function reduceCommonDidKeyFrom(
  pendingCredentials: PendingCredential[]
): string | null {
  if (pendingCredentials.length === 0) return null
  if (pendingCredentials.length === 1) return didKeyFrom(pendingCredentials[0])

  return pendingCredentials.reduce<string | null>((did, pendingCredential) => {
    return did === didKeyFrom(pendingCredential) ? did : null
  }, didKeyFrom(pendingCredentials[0]))
}
