import moment from 'moment';
import { Subject, Alignment } from '../../../../types/credential';
import { educationalOperationalCredentialFrom } from '../../../decode';
import { extractNameFromOBV3Identifier } from '../../../extractNameFromOBV3Identifier';
import { imageSourceFrom } from './image';
import { DATE_FORMAT } from '../../../../../app.config';

type CredentialRenderInfo = {
  subjectName: string | null;
  degreeName: string | null;
  issuedTo : string | null;
  title: string | null;
  description: string | null;
  criteria: string | null;
  startDateFmt: string | null;
  endDateFmt: string | null;
  numberOfCredits: string | null;
  achievementImage: string | null;
  achievementType: string | null;
  alignment: Alignment[] | undefined;
}

export function credentialSubjectRenderInfoFrom(credentialSubject: Subject): CredentialRenderInfo {

  // Same as "issuedTo", below, but used in non-OBv3 components
  const subjectName = credentialSubject?.name ?? extractNameFromOBV3Identifier(credentialSubject) ?? null;
  // Used in OBv3 components only
  const issuedTo = credentialSubject?.name ?? extractNameFromOBV3Identifier(credentialSubject) ?? null;
  const degreeName = credentialSubject.degree?.name ?? null;

  const eoc = educationalOperationalCredentialFrom(credentialSubject);

  const title = eoc?.name ?? null;
  const description = eoc?.description ?? null;
  const criteria = eoc?.criteria?.narrative ?? null;

  const numberOfCredits = eoc?.awardedOnCompletionOf?.numberOfCredits?.value ?? null;

  const achievementImage = imageSourceFrom(eoc?.image);

  const achievementType = eoc && eoc.achievementType ? eoc.achievementType : null;
  const alignment = eoc?.alignment;

  const { startDate, endDate } = eoc?.awardedOnCompletionOf || {};
  const startDateFmt = startDate ? moment.utc(startDate).format(DATE_FORMAT) : null;
  const endDateFmt = endDate ? moment.utc(endDate).format(DATE_FORMAT) : null;

  return {
    subjectName,
    issuedTo,
    degreeName,
    title,
    description,
    criteria,
    numberOfCredits,
    startDateFmt,
    endDateFmt,
    achievementImage,
    achievementType,
    alignment
  };
}
