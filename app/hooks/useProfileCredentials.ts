import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectRawCredentialRecords } from '../store/slices/credential';

export function useProfileCredentials(profileId: string) {
  const allCredentials = useSelector(selectRawCredentialRecords);
  
  return useMemo(() => 
    allCredentials.filter(({ profileRecordId }) => profileRecordId.toHexString() === profileId),
    [allCredentials, profileId]
  );
}