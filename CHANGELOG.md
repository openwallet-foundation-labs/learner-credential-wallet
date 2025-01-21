# learner-credential-wallet Changelog

## 2.1.6 - build 86
### Fixed
- Fix deep linking in scanned QR codes

## 2.1.5 - build 85
### Added
- Add QR codes to PDF exports

## 2.1.4 - build 84
### Fixed
- Fix PDF export

## 2.1.3 - build 83
### Fixed
- Fix verifyCredential not working without a credentialStatus #644

## 2.1.2 - build 82
### Fixed
- Fix signature verification (`@sphereon/isomorphic-webcrypto` was failing upstream in `jsonld-signatures`),
  and has been replaced with `expo-crypto` usage. Also fixes StatusList `Buffer` error.
- Update Target API Level #633
- "Issued To" Not Displaying When Using Identifier in CredentialSubject #632
- Wallet not verifying creds #638
- After issuing VC via CHAPI, LCW shows error #547
- Error: crypto.subtle not found (IOS ISSUE) #554
- 'Select to Speak' accessibility control on Android causes bottom nav row to disappear #405
- Check more markdown/HTML in achievement.criteria.narrative #470

## 2.1.1 - build 81
### Changed
- Update to latest library versions, add support for VC DM 2.0.

### Fixed
- Title adjustment on BGV credential #531
- Register Wallet button not working on Android on Build 58+. #607

## 2.1.0 - build 80
- First official release to app stores post RN Upgrade and conversion to Expo. Releases are now back on `main` branch.

### Added
- Add support for the OBv3 name property (derived from `identifierHash` when `identifierType == 'name'`).

## 2.0.24 - build 79 (Pre-RN Upgrade `demo` branch)
### Changed
- Fix 'Register Wallet' button on Android.

## 2.0.23 - build 78 (Pre-RN Upgrade `demo` branch)
### Changed
- Update sample VC templates from dev menu.
- Fix PDF generation Share call.

## 2.0.21 - build 76
### Changed
- Update to latest Bitstring Status List dependency.

## 2.0.8 - build 63
### Changed
- Fix 'Android add button not clickable' issue #449
- Remove Custom Setup Option PR #452
- Update SplashScreen image PR #453
- Update warning text on wallet setup, include 6 char minimum, issue #392
- Fix CI build error (`@nuintun/qrcode` patch), issue #451
- Fix Issue Date and Expiration Date, issue #365
- Fix Cancel button styling during LI share, issue #461

## 1.17.3 - build 52 - 2022-12-08
### Changed
- (Fix) Roll back PR #293 (which broke Send Credential button).

## 1.17.2 - build 51 - 2022-12-07
### Changed
- Fix config implementation, verifier-plus integration

For previous history, see Git commits.
