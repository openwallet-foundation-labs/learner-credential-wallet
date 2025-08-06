import AsyncStorage from '@react-native-async-storage/async-storage';
import { WAS_KEYS, ZCAP_EXPIRES } from '../../app.config';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
// @ts-ignore
import { ZcapClient } from '@digitalbazaar/ezcap';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';

import { displayGlobalModal } from './globalModal';


interface ZcapReq {
    query: {
      type: string;
      capabilityQuery: {
        allowedAction: string[];
        controller: string;
        invocationTarget: {
          type: string;
          name: string;
          contentType: string;
        } | string;
        reason: string;
      };
    }[];
}

export default async function handleZcapRequest({
  request,
}: {
  request: ZcapReq;
}) {
  const zcapQuery = request.query?.find((q: any) => q.type === 'ZcapQuery');
  if (!zcapQuery) {
    throw new Error('No ZcapQuery found in request.');
  }

  const { allowedAction, controller, invocationTarget, reason } =
    zcapQuery.capabilityQuery;

  const approved = await displayGlobalModal({
    title: 'App Permission Request',
    body: `Unrecognized Application is asking for the following permission:\n\n"${reason}"\n\nRead and Write access to the Verifiable Credentials collection`,
    confirmText: 'Allow',
    cancelText: 'Cancel',
    onConfirm: () => true,
    onCancel: () => false
  });
  if (!approved) {
    throw new Error('User denied Zcap delegation');
  }

  // TODO: Extract this code (loading from storage and re-hydrating the signer) to a `getRootSigner()` function
  const rootSignerStr = await AsyncStorage.getItem(WAS_KEYS.SIGNER_JSON);
  if (!rootSignerStr) {
    throw new Error('Root signer not found in wallet.');
  }

  const invocationTargetType = typeof invocationTarget === 'string' ? invocationTarget : invocationTarget.type;

  const rootSigner = await Ed25519VerificationKey2020.from(
    JSON.parse(rootSignerStr)
  );

  const parentCapability = `urn:zcap:root:${encodeURIComponent(invocationTargetType)}`;

  const zcapClient = new ZcapClient({
    SuiteClass: Ed25519Signature2020,
    delegationSigner: rootSigner.signer()
  });

  const delegatedZcap = await zcapClient.delegate({
    capability: parentCapability,
    controller,
    invocationTarget: invocationTargetType,
    allowedActions: allowedAction,
    expires: ZCAP_EXPIRES.toISOString()
  });

  return {
    zcap: delegatedZcap
  };
}
