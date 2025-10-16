import moment from 'moment';
import { extractNameFromOBV3Identifier } from '../../../extractNameFromOBV3Identifier';
import { imageSourceFrom } from './image';
import { DATE_FORMAT } from '../../../../../app.config';
import { ICredentialSubject, IVerifiableCredential } from '@digitalcredentials/ssi';

type CredentialRenderInfo = {
  subjectName: string | null;
  degreeName: string | null;
  issuedTo : string | null;
  description: string | null;
  criteria: string | null;
  startDateFmt: string | null;
  endDateFmt: string | null;
  numberOfCredits: string | null;
  achievementImage: string | null;
  achievementType: string | null;
}

/**
 * Partially supports VCs with multiple credentialSubject entries,
 * by just picking the first one.
 * @param vc
 */
export function getSubject (vc: IVerifiableCredential): ICredentialSubject {
  const { credentialSubject } = vc;
  if (Array.isArray(credentialSubject)) {
    return credentialSubject[0];
  }
  return credentialSubject;
}

export function credentialSubjectRenderInfoFrom(credentialSubject: ICredentialSubject): CredentialRenderInfo {

  // Same as "issuedTo", below, but used in non-OBv3 components
  const subjectName = credentialSubject?.name ?? extractNameFromOBV3Identifier(credentialSubject) ?? null;
  // Used in OBv3 components only
  const issuedTo = credentialSubject?.name ?? extractNameFromOBV3Identifier(credentialSubject) ?? null;
  const degreeName = credentialSubject.degree?.name ?? null;

  const [achievement] = Array.isArray(credentialSubject.achievement) ? credentialSubject.achievement : [credentialSubject.achievement];

  const description = achievement?.description ?? null;
  const criteria = achievement?.criteria?.narrative ?? null;

  const numberOfCredits = achievement?.awardedOnCompletionOf?.numberOfCredits?.value ?? null;

  const achievementImage = imageSourceFrom(achievement?.image);

  const achievementType = achievement && achievement.achievementType ? achievement.achievementType : null;

  const { startDate, endDate } = achievement?.awardedOnCompletionOf || {};
  const startDateFmt = startDate ? moment(startDate).format(DATE_FORMAT) : null;
  const endDateFmt = endDate ? moment(endDate).format(DATE_FORMAT) : null;

  return {
    subjectName,
    issuedTo,
    degreeName,
    description,
    criteria,
    numberOfCredits,
    startDateFmt,
    endDateFmt,
    achievementImage,
    achievementType
  };
}
