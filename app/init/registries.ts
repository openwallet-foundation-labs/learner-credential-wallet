import { createContext } from 'react'
import { RegistryClient } from '@digitalcredentials/issuer-registry-client'
import { KnownDidRegistries } from '../../app.config'

const registries = new RegistryClient()

export const DidRegistryContext = createContext(registries)

/**
 * Loads remote Known Issuer / Known Verifier DID registries from config.
 */
export async function loadKnownDidRegistries({
  client
}: {
  client: RegistryClient
}) {
  await client.load({ config: KnownDidRegistries })
  // now available for usage through useContext(DidRegistryContext)
}
