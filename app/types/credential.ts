import { ObjectID } from 'bson';

export type IssuerURI = string;

export type ImageObject = {
  readonly id: string;
  readonly type: string;
}

export type IssuerObject = {
  readonly id: IssuerURI;
  readonly type?: string;
  readonly name?: string;
  readonly url?: string;
  readonly image?: string | ImageObject;
}
export type Issuer = IssuerURI | IssuerObject;

export type CreditValue = {
  value?: string;
}

export type CompletionDocument = {
  readonly type?: string;
  readonly identifier?: string;
  readonly name?: string;
  readonly description?: string;
  readonly numberOfCredits?: CreditValue;
  readonly startDate?: string;
  readonly endDate?: string;
}

export type EducationalOperationalCredentialExtensions = {
  readonly type?: string[];
  readonly awardedOnCompletionOf?: CompletionDocument;
  readonly criteria?: {
    type: string;
    narrative: string;
  };
  readonly image?: ImageObject;
}

// https://schema.org/EducationalOccupationalCredential (this doesn't really conform)
export type EducationalOperationalCredential = EducationalOperationalCredentialExtensions & {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly competencyRequired?: string;
  readonly credentialCategory?: string;
  readonly achievementType?: string;
}

export type DegreeCompletion = {
  readonly type: string;
  readonly name: string;
}

export type StudentId = {
  readonly id: string;
  readonly image: string;
}

type SubjectExtensions = {
  readonly type?: string;
  readonly name?: string;
  readonly hasCredential?: EducationalOperationalCredential; // https://schema.org/hasCredential
  readonly degree?: DegreeCompletion;
  readonly studentId?: StudentId;
  // Open Badges v3
  readonly achievement?: EducationalOperationalCredential | EducationalOperationalCredential[];
  readonly identifier?: OBV3IdentifierObject | OBV3IdentifierObject[];
}

export type OBV3IdentifierObject = {
  readonly identityType?: string;
  readonly identityHash?: string;
}

export type Subject = SubjectExtensions & {
  readonly id?: string;
}

export type Proof = {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
  challenge?: string;
  jws?: string;
}

export type RenderMethod = {
  id?: string;
  type: string;
  name?: string;
  css3MediaQuery?: string;
}

// https://www.w3.org/TR/vc-data-model/
export type CredentialV1 = {
  readonly '@context': string[];         // https://www.w3.org/TR/vc-data-model/#contexts
  readonly id?: string;                  // https://www.w3.org/TR/vc-data-model/#identifiers
  readonly type: string[];               // https://www.w3.org/TR/vc-data-model/#types
  readonly issuer: Issuer;               // https://www.w3.org/TR/vc-data-model/#issuer
  readonly issuanceDate: string;         // https://www.w3.org/TR/vc-data-model/#issuance-date
  readonly expirationDate?: string;      // https://www.w3.org/TR/vc-data-model/#expiration
  readonly credentialSubject: Subject;   // https://www.w3.org/TR/vc-data-model/#credential-subject
  readonly credentialStatus?: CredentialStatus | CredentialStatus[]; // https://www.w3.org/TR/vc-data-model/#status
  readonly proof?: Proof;                // https://www.w3.org/TR/vc-data-model/#proofs-signatures
  readonly name?: string;
  readonly renderMethod?: RenderMethod[];
}

// https://www.w3.org/TR/vc-data-model-2.0/
// (At this time, this should be in sync with https://w3c.github.io/vc-data-model/)
export type CredentialV2 = {
  readonly '@context': string[];         // https://www.w3.org/TR/vc-data-model-2.0/#contexts
  readonly id?: string;                  // https://www.w3.org/TR/vc-data-model-2.0/#identifiers
  readonly type: string[];               // https://www.w3.org/TR/vc-data-model-2.0/#types
  readonly issuer: Issuer;               // https://www.w3.org/TR/vc-data-model-2.0/#issuer
  readonly validFrom?: string;           // https://www.w3.org/TR/vc-data-model-2.0/#validity-period
  readonly validUntil?: string;          // https://www.w3.org/TR/vc-data-model-2.0/#validity-period
  readonly credentialSubject: Subject;   // https://www.w3.org/TR/vc-data-model-2.0/#credential-subject
  readonly credentialStatus?: CredentialStatus | CredentialStatus[]; // https://www.w3.org/TR/vc-data-model-2.0/#status
  readonly proof?: Proof;                // https://w3c.github.io/vc-data-model/#proofs-signatures
  readonly name?: string;
  readonly renderMethod?: RenderMethod[]; // https://www.w3.org/TR/vc-data-model-2.0/#reserved-extension-points
}

export type Credential = CredentialV1 | CredentialV2;

// https://www.w3.org/TR/vc-bitstring-status-list
export type CredentialStatus = {
  readonly id: string;
  readonly type: string | string[];
  readonly statusPurpose: string;
  readonly statusListIndex: string | number;
  readonly statusListCredential: string;
}

export enum CredentialError {
  IsNotVerified = 'Credential is not verified.',
  CouldNotBeVerified = 'Credential could not be checked for verification and may be malformed.',
  DidNotInRegistry = 'Could not find issuer in registry with given DID.',
}

export type CredentialImportReport = {
  success: string[];
  duplicate: string[];
  failed: string[];
}

/**
 * The DCC VC standard is in flux right now,
 * so we are choosing to store credentials as
 * stringified JSON.
 */
export type CredentialRecordEntry = {
  readonly _id: ObjectID;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly rawCredential: string;
  readonly profileRecordId: ObjectID;
}
export type CredentialRecordRaw = CredentialRecordEntry & {
  readonly credential: Credential;
}

// Different types of queries in verifiable presentation request
export enum VcQueryType {
  Example = 'QueryByExample',
  Frame = 'QueryByFrame',
  DidAuth = 'DIDAuthentication',
  DidAuthLegacy = 'DIDAuth',
  ZcapQuery = 'ZcapQuery',
}
