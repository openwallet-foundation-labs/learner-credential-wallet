import type { RegistryClient } from '@digitalcredentials/issuer-registry-client'

/**
 * Checks to see if a VC's issuer appears in any of the known DID registries.
 *
 * @returns A list of names of DID registries the issuer appears in.
 */
export function issuerInRegistries({
  issuer,
  registries
}: {
  issuer: string | any
  registries: RegistryClient
}): string[] | null {
  const issuerDid = typeof issuer === 'string' ? issuer : issuer.id
  const issuerInfo = registries.didEntry(issuerDid)
  // See if the issuer DID appears in any of the known registries
  // If yes, assemble a list of registries it appears in
  return issuerInfo?.inRegistries
    ? Array.from(issuerInfo.inRegistries).map((r) => r.name)
    : null
}
