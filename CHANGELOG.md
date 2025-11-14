# learner-credential-wallet Changelog

## 2.2.8 - build 102
### Added
- Visualizing credentials for different profiles #885
- New display rule for open badges #641
- Disable url links for credentials from non DCC-supported registries #881
- Better handling of duplicate credentials #857
- Use external VC type definitions #295
- Support VC-API Interaction URL format in QR Code scanning #764
- Refactor handling of VPR requests from deep links etc #808

### Fixed
- VC-API mismatch on exchange participation response #763
- Issues with PresentationPreview screen from PublicLink creation work #893


## 2.2.7 - build 100-101
### Added
- Add Alignments to Open Badges 3.0 Display #681
- Android: Support 16KB memory page sizes #840
 - Show duplicate profiles skipped when restoring wallet #852
- Remove Scan QR code button on Developer menu #856
- Link to LCW app page (for trying it) #883

### Fixed
- Credential Details Page – Options menu becomes transparent on click #875
- OWF: Fix warnings #564
- View Link becomes invalid after first use on Share Credential screen #865
- Duplicate profile names allowed when renaming existing profile #866
- Public Link Page – Unnecessary status refetch causing UI flicker #876
- “Unable to Create Public Link” Modal “Close” button is not responsive #888


## 2.2.6 - build 96-99
### Added
- Upgrade to Expo SDK 53 #777
- React(19) and RN(0.79) Upgrade #758
- "Scan a shared QR code" text and UI consistency #855
- Encourage devs to use their own verifier instance on LCW #843
- Runtime Warning – Credential Verification lacks log value #838
- Require Cycle Warnings across model, store, components, and navigation #837
- Disable coverage by default when running npm tests #828
- Remove Accept All Button When Only One Credential in Available Credentials Screen #738
- Update Instructions at Top of Add Credential Screen #735
- Update README #665
- LCW: Set up test coverage #616
- "Scan a shared QR code" text consistency #494
- Users confused about shared link expiration #446

### Fixed
- Issue with share credentials option - cannot select credential to create public link #860
- LCW: Coverage command failing while tests pass under npm test #854
- UI Overlap on Manage Profiles screen #853
- Wallet restore creates duplicate profiles & app allows duplicate profile names #836
- Enable scrolling on Manage Profile screen #831
- Issuer logo should pull from registry first, then fallback to VC logo second, default stock photo third #795
- Some Credly Badges Fail Verify - Special Characters Issue? #768
- Navigation order is inconsistent on two different pages - accessibility issue #534


## 2.2.5 - build 95
### Added
- [EPIC] Wallet attached storage #668
- Feature Flag: Wallet attached storage #669
- Consent screens for wallet attached storage #667
- Feature Flag: Password prompt at wallet setup #572
- Update Android API level to 35 #788
- Upgrade to Expo SDK 52 #776
- Updated age rating questions on Apple store for LCW #797

### Fixed
- Creating public links on w.a.s. branch is broken #799
- Tarballs are empty when exporting w.a.s. space #800
- BUG: iOS - Creating public links is broken when sharing a credential #801

## 2.2.4 - build 94
### Added
- Verifiable Presentation Requests #697

### Fixed
- Remove need for legacy-peer-deps flag during installation #626

## 2.2.3 - build 93
### Added
- Capability to Unbake Open Badge 3.0 #649
- Integrate verifier-core in LCW & Adjust Response Handling #719
- Install and Configure verifier-core in LCW #718
- Content & Design for Error Messaging Based on Updates to Verifier Core #709
- Design for Issuer & Issuer Registry Display #713
- Updating Issuer & Issuer Registry Display #727
- Integrate verifier-core and shared known issuer registry list #728

### Fixed
- Identify and remove duplicate validation logic in LCW #717
- Animated: 'use Native Driver' not specified #716
- ViewPropTypes error on Android and iOS #575

## 2.1.8 - build 88
### Added
- Add eddsa-rdfc-2022 #656

### Fixed
- 'Wallet initialization failed' error when setting up wallet #695

## 2.1.7 - build 87
### Changed
- Remove checkbox from for pw protection for Backup screen #578

### Fixed
- Update where we get credential name from in wallet #696
- PDF Export is Available for All Credentials Even When RenderMethod Isn't in the Credential #699
- Remove CHAPI Registration as Part of App Install #672
- Remove period from "Create a Public Link" instructions on Bottom Nav Share #493

## 2.1.6 - build 86
### Fixed
- Deep Linking for QR codes #627

## 2.1.5 - build 85
### Added
- Add QR code to PDFs for verification #650

## 2.1.4 - build 84
### Fixed
- Fix PDF export #604

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
