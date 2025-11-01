import { IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';

export function credentialsFromPresentation(vp: IVerifiablePresentation): IVerifiableCredential[] {
  const { verifiableCredential } = vp;
  return ([] as IVerifiableCredential[]).concat(verifiableCredential!);
}
