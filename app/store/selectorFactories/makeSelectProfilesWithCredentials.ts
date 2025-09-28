import { createSelector } from '@reduxjs/toolkit';
import { ProfileWithCredentialRecords } from '../../model/profile';
import { selectRawCredentialRecords } from '../slices/credential';
import { selectRawProfileRecords } from '../slices/profile';
import { Selector } from '.';

export const makeSelectProfilesWithCredentials = (): Selector<
  undefined,
  ProfileWithCredentialRecords[]
> => createSelector(
  [selectRawProfileRecords, selectRawCredentialRecords],
  (rawProfileRecords, rawCredentialRecords) => {
    const profilesWithCredentials = rawProfileRecords.map((rawProfileRecord) => {
      const profileCredentials = rawCredentialRecords.filter(({ profileRecordId }) => profileRecordId.equals(rawProfileRecord._id));
      return { ...rawProfileRecord, rawCredentialRecords: profileCredentials };
    });

    return profilesWithCredentials;
  }
);
