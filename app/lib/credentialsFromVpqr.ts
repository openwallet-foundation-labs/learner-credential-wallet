import { IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';
import { fromQrCode } from '@digitalcredentials/vpqr';
import { securityLoader } from '@digitalcredentials/security-document-loader';

import { credentialsFromPresentation } from './credentialsFromPresentation';

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build();

export async function credentialsFromVpqr(text: string): Promise<IVerifiableCredential[]> {
  const { vp }: { vp: IVerifiablePresentation } = await fromQrCode({ text, documentLoader });
  return credentialsFromPresentation(vp);
}
