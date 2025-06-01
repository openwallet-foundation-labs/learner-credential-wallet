import { Issuer } from '../../../../types/credential';
import { imageSourceFrom } from './image';

type IssuerInfo = {
  issuerName: string | null;
  issuerUrl: string | null;
  issuerId: string | null;
  issuerImage: string | null;
};

type VerifyCredentialResult = {
  log?: Array<{
    id: string;
    matchingIssuers?: any[];
  }>;
};

export function issuerRenderInfoWithVerification(
  issuer: Issuer,
  verifyResult?: VerifyCredentialResult
): IssuerInfo {
  const registeredIssuerLog = verifyResult?.log?.find(
    (log) => log.id === 'registered_issuer'
  );

  const matchingIssuer = registeredIssuerLog?.matchingIssuers?.[0];

  if (matchingIssuer?.issuer?.federation_entity) {
    const federationEntity = matchingIssuer.issuer.federation_entity;
    return {
      issuerName: federationEntity.organization_name ?? '',
      issuerUrl: federationEntity.homepage_uri ?? '',
      issuerId: typeof issuer === 'string' ? null : issuer?.id ?? '',
      issuerImage: federationEntity.logo_uri ?? '',
    };
  }

  // Fallback to existing logic
  const fallback = issuerRenderInfoFrom(issuer);
  return {
    issuerName: fallback.issuerName ?? '',
    issuerUrl: fallback.issuerUrl ?? '',
    issuerId: fallback.issuerId ?? '',
    issuerImage: fallback.issuerImage ?? '',
  };
}


export function issuerRenderInfoFrom(issuer: Issuer): IssuerInfo {
  const issuerName = (typeof issuer === 'string' ? issuer : issuer?.name) ?? null;
  const issuerUrl = (typeof issuer === 'string' ? null : issuer?.url) ?? null;
  const issuerId = typeof issuer === 'string' ? null : issuer?.id;
  const issuerImage = typeof issuer === 'string' ? null : imageSourceFrom(issuer.image);

  return {
    issuerName,
    issuerUrl,
    issuerId,
    issuerImage
  };
}
