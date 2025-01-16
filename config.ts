const env = process.env as any;
export const VERIFIER_PLUS_URL = env['VERIFIER_PLUS_URL'] || 'https://verifierplus.org';

export const KnownDidRegistries = [
  {
    'name': 'DCC Pilot Registry',
    'url': 'https://digitalcredentials.github.io/issuer-registry/registry.json'
  },
  {
    'name': 'DCC Sandbox Registry',
    'url': 'https://digitalcredentials.github.io/sandbox-registry/registry.json'
  },
  {
    'name': 'DCC Community Registry',
    'url': 'https://digitalcredentials.github.io/community-registry/registry.json'
  },
  {
    'name': 'DCC Registry',
    'url': 'https://digitalcredentials.github.io/dcc-registry/registry.json'
  }
];

export const LinkConfig = {
  schemes: {
    customProtocol: ['dccrequest://', 'org.dcconsortium://', 'https://lcw.app/request'],
    universalAppLink: 'https://lcw.app/mobile'
  },
  registerWalletUrl: 'https://lcw.app/register-wallet.html',
  appWebsite: {
    home: 'https://lcw.app',
    // FAQ page assumes #public-link,
    //   #public-link-unshare, and #add-to-linkedin sections
    faq: 'https://lcw.app/faq.html'
  }
};
