import { ZCAP_EXPIRES } from '../../app.config';
// @ts-ignore
import { ZcapClient } from '@digitalcredentials/ezcap';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';

import { displayGlobalModal } from './globalModal';
import { getRootSigner } from './getRootSigner';
import { IZcapQuery } from './vcApi';

export default async function handleZcapRequest({
  request,
}: {
  request: IZcapQuery;
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

  const invocationTargetType = typeof invocationTarget === 'string' ? invocationTarget : invocationTarget.type;

  const rootSigner = await getRootSigner();

  const parentCapability = `urn:zcap:root:${encodeURIComponent(invocationTargetType)}`;

  const zcapClient = new ZcapClient({
    SuiteClass: Ed25519Signature2020,
    delegationSigner: rootSigner
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
