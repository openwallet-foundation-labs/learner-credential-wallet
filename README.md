<img src="https://user-images.githubusercontent.com/7339800/129089107-fa190c95-76fd-4a93-8e36-ff4d3ae5681c.png" alt="icon" width="100px" />

# Learner Credential Wallet

Learner Credential Wallet is a cross-platform iOS and Android mobile application 
for storing and sharing digital learner credentials.

Install [Learner Credential Wallet](https://lcw.app/) for your mobile!

The wallet is based on the [learner credential wallet specification](https://digitalcredentials.mit.edu/docs/Learner-Credential-Wallet-Specification-May-2021.pdf) developed by the [Digital Credentials Consortium](https://digitalcredentials.mit.edu/). The learner credential wallet specification is based on the draft [W3C Universal Wallet interoperability specification](https://w3c-ccg.github.io/universal-wallet-interop-spec/) and the draft [W3C Verifiable Credentials data model](https://w3c.github.io/vc-data-model/).

The app has been compiled for iOS and Android and allows users to add and share credentials, as well as manage the wallet.

<img src="https://user-images.githubusercontent.com/20584379/234087398-2a8c2b54-66a3-4a56-8332-0e4bfc089a3b.png" alt="The Learner Credential Wallet startup screen, displaying the choice between quick and custom setup." width="24%" /> <img src="https://user-images.githubusercontent.com/20584379/234087758-f718942b-d9b7-47a6-846a-4ba5f9aea83a.png" alt="The “credential preview” screen, displaying information about an issued credential, including credential name, issuer, issuer date, credential description, criteria, and verification status." width="24%" /> <img src="https://user-images.githubusercontent.com/20584379/234087893-81573b7e-db33-48f5-8d51-23f845fb75a4.png" alt="The “share credential” screen, which allows the user to share their credentials with others through a public link or QR code, and includes the additional options to send the credential link or directly add it to LinkedIn through the app." width="24%" /> <img src="https://user-images.githubusercontent.com/20584379/234087959-4150b63a-c980-472a-bc54-7f8b0a9bbc5f.png" alt="The “verification status” screen, which shows whether the credential has been verified, and includes an additional breakdown of information including the last date verification status was checked, the validity of the credentials digital signature, expiration, and revocation status." width="24%" />


## Goals
This learner credential wallet includes the features and technical requirements 
ultimately enabling individuals to curate and present their learning and 
employment records to others—for example, as applicants to educational programs 
or to apply for jobs with employers—in an interoperable manner. 

* Receive digital credentials from standards compliant issuers via link or QR code
* Store credentials on their mobile device
* Keep credential access safe with strong encryption best practices
* Create and share a presentation that collates any number of credentials in their wallet
* Backup and restore their wallet

## Pilot
The Digital Credentials Consortium is working with a number of colleges and 
universities to [pilot test](https://lcw.app/pilot.html) the wallet.


## Development Setup

### Dependencies

**If you encounter any issues, visit the [Troubleshooting Page](https://github.com/digitalcredentials/learner-credential-wallet/wiki/Troubleshooting)**

Prerequisites:
* [Java](https://www.java.com/en/download/manual.jsp)
* [nvm](https://collabnix.com/how-to-install-and-configure-nvm-on-mac-os/) or [asdf](https://asdf-vm.com/guide/getting-started.html#getting-started)
* [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) or [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
* [Node.js](https://nodejs.org/en/)
* [Cocoapods](https://cocoapods.org/) (use brew, not gem, to install)
* [XCode](https://developer.apple.com/xcode/)
* [Android Studio](https://developer.android.com/studio)

See [Installing on Linux](install-linux.md) on setting up the project on Linux.

### Setup of the LCW App
1. Clone this repository or `git pull`
2. In root of project, run `npm i --legacy-peer-deps` to install the React Native dependencies.
   * Note: The app will crash if you try to use just `npm i` or `yarn` for example
   * (Optionally, if you use the `asdf` version manager run `asdf install` to install - more info in asdf section below)
3. Run `npm run prebuild:ios` and `npm run prebuild:android` to set up the `ios` and `android` folders. This step uses [Expo prebuild](https://docs.expo.dev/workflow/prebuild/).

#### *If using asdf*
* Run `asdf install` to install the proper versions of the technologies used listed in the `.tool-versions` file
  * If you need to install anything, run `asdf plugin add [plugin-name]` to add it to your local machine
  * Here is a link if you need it to the [asdf installation documentation](https://asdf-vm.com/guide/getting-started.html#getting-started) _(homebrew is the easiest)_

### Running the LCW App
1) Run `yarn start` in one terminal
2) In another terminal run `yarn android`
  * When running on android, open Android Studio and make sure the device you want to run on is selected (whether that is an emulator or a real device). 
  * Note: You might need to hit the play button in Android Studio for it to fully register which device to set to be used from the command line.
3) In another terminal yarn `yarn ios`

### Environment

This project uses **TypeScript and React Native with [Expo](https://docs.expo.dev/)**. It would be best to use an 
editor that can hook into the TypeScript language server (VSCode does this with 
Intellisense, Vim does it with CoC). We also use eslint to catch common mistakes 
and formatting errors. Most editors should support dynamic linting support while 
editing. If your editor does not, you can manually lint by running `npm run lint` 
in the project root.

This project also uses **environment variables**, which are stored in `config.ts`.
These values can be overridden, but development values should not be committed to the repository.

### Project Structure

```
├── app
│   ├── assets ← Image assets 
│   ├── components ← React components
│   ├── hooks ← This is where custom hooks are defined (usually wraps lib methods)
│   ├── lib ← Location for utility methods
│   ├── mock ← Location for mock data, usually used for testing
│   ├── model ← Database access objects and connections
│   ├── navigation ← React Navigation structure
│   ├── screens ← Individual screen views
│   ├── store ← Redux and Redux Toolkit definitions
│   │   └── slices ← Redux Toolkit slices (add new Redux state here)
│   ├── styles ← All app style definitions
│   └── types ← General place for defining types (usually DCC types for Credential, Presentation, etc...)
├── android ← Auto-generated android build folder, can still be manually edited if needed
└── ios ← Same as android, except it also uses Cocoapods for dependency management
```

#### Configuration

Overridable configuration lives in two places:

1. [`app.config.js`](./app.config.js) - created by Expo, contains app name, icon, splash
   page color, etc.
2. [`config.ts`](./config.ts) - contains everything else,
   including a list of Known DID Registries, deep link schemes, app website URLs,
   and so on.

### Issuing new credential

[Instructions for issuing a credential](https://github.com/digitalcredentials/docs/edit/main/credential/issue_credential.md). 

### Adding new credential display

A custom display can be created for different credentials, to do so:

- Create a new React component for your credential type in 
  [app/components/CredentialCard/](app/components/CredentialCard/) - 
  eg. `app/components/CredentialCard/YourNewTypeCard.tsx`
- Define addition styles in `app/components/CredentialCard/YourNewTypeCard.styles.tsx`
- Add a function to the `credentialTypes` list defined in 
  [app/components/CredentialCard/CredentialCard.tsx](app/components/CredentialCard/CredentialCard.tsx). 
  The function should return `{component: YourNewCredentialCard, title: 'the title of the credential that should be used when listing it elsewhere'}` or null if the credential isn't the appropriate type for you custom display
- **note**: the list will be scanned for the first function that returns a 
  component and title, so it's important that the type check is specific and 
  doesn't match any other types.


## Accessibility
We have conducted a Voluntary Product Accessibility Test, please review the
[Learner Credential Wallet Accessibility Conformance Report, December 2021](https://github.com/digitalcredentials/learner-credential-wallet/blob/769bacbc2bfed381a20e2927f2c32a18a6faacbb/docs/Learner%20Credential%20Wallet%20VPAT2.4Rev508-December%202021.pdf)

For more information on accessibility please visit the 
[MIT Accessibilty](https://accessibility.mit.edu) page.

## Privacy Policy 
This Privacy Policy explains how Learner Credential Wallet collects, uses, and 
processes personal information about our learners.

### What Personal Information We Collect
We do not collect any personal information.

### Additional Information
We may change this Privacy Policy from time to time. If we make any significant 
changes in the way we treat your personal information we will make this clear 
on our website or by contacting you directly.

The controller for your personal information is the Learner Credential Wallet 
project at MIT. We can be contacted at lcw-support@mit.edu.

## Terms and Conditions of Use

[Learner Credential Wallet Terms and Conditions of Use](https://lcw.app/terms.html)

## Acknowledgements
Initial development was supported by the U.S. Department of Education (Contract 
Number: 91990020C0105). The opinions expressed herein do not necessarily 
represent the positions or policies of the U.S. Department of Education, and no 
official endorsement by the U.S. Department of Education should be inferred.

Initial development was also supported by the Massachusetts Institute of 
Technology. Continued development is supported by members of the Digital 
Credentials Consortium.

### License

[MIT License](https://github.com/digitalcredentials/learner-credential-wallet/blob/main/LICENSE) Copyright (c) 2024 Massachusetts Institute of Technology

All files located in external directories are externally maintained libraries 
used by this software which have their own licenses; we recommend you read them, 
as their terms may differ from the terms above.
