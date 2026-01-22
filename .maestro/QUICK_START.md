# Maestro Quick Start

## One-Time Setup
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH="$PATH:$HOME/.maestro/bin"

# Verify installation
./.maestro/verify-setup.sh

## Running Tests Locally

### iOS
# Terminal 1: Start app
npm run ios

# Terminal 2: Run test
npm run test:ui:ios

### Android
# Terminal 1: Start app
npm run android

# Terminal 2: Run test
npm run test:ui:android

### Using npm scripts (recommended)
npm run test:ui:ios      # Run on iOS
npm run test:ui:android  # Run on Android
npm run test:ui          # Run with manual platform selection (uses config.yaml)

### Direct Maestro commands
maestro test .maestro/credential-management.yaml --env APP_ID=edu.mit.eduwallet  # iOS
maestro test .maestro/credential-management.yaml --env APP_ID=app.lcw            # Android
maestro test .maestro/credential-management.yaml --config .maestro/config.yaml   # Using config

## Test Files

- **onboarding.yaml** - Automated test for wallet onboarding flow
- **credential-management.yaml** - End-to-end onboarding + add credential flow
- **verification-status.yaml** - Credential verification and validation testing
- **profile-management.yaml** - Profile creation, management, and deletion flow
- **lock-unlock-wallet.yaml** - Lock wallet and unlock with password
- **issuer-info.yaml** - Issuer details and credential source JSON viewing
- **about-section.yaml** - About section navigation and Developer Settings access
- **config.yaml** - Platform-specific app identifiers (iOS: `edu.mit.eduwallet`, Android: `app.lcw`)

## What the Tests Do

**onboarding.yaml**

1. Launches LCW app
2. Taps \"Quick Setup\" button
3. Verifies \"Creating Wallet\" screen appears
4. Verifies loading message is visible
5. Taps \"Take Me To My Wallet\" to complete onboarding

**credential-management.yaml**

1. Runs the full onboarding flow
2. Adds multiple test credentials (verified, warning, and not verified states)
3. Tests credential deletion functionality
4. Tests credential sharing features:
   - Public link creation
   - Copy link functionality
   - LinkedIn integration
   - Send credential (JSON/QR code)
   - Unshare functionality
5. Tests navigation between different sharing methods
6. Verifies wallet state management throughout the flow

**profile-management.yaml**

1. Runs the full credential management flow to set up test data
2. Navigates to Settings > Manage Profiles
3. Tests profile creation with custom name
4. Tests profile renaming functionality
5. Tests profile backup feature
6. Tests adding existing profiles
7. Tests profile deletion with confirmation
8. Verifies proper navigation and state management throughout

**lock-unlock-wallet.yaml**

1. Navigates to Settings tab
2. Taps "Sign out" to lock the wallet
3. Verifies login screen appears
4. Tests incorrect password entry and error message display
5. Clears incorrect password and enters correct password
6. Unlocks wallet and verifies return to home screen

**verification-status.yaml**

1. Runs the full credential management flow to set up test data
2. Navigates to credential detail screen
3. Scrolls to "Credential Verification and Validation" section
4. Waits for verification to complete
5. Conditionally verifies credential status:
   - For valid credentials: checks for valid signature, not expired, and not revoked
   - For invalid credentials: checks for invalid signature
6. Verifies all verification fields are present (signature, expiration, revocation)
7. Verifies "Last Checked" timestamp is displayed

**issuer-info.yaml**

1. Runs the verification status flow to set up test data
2. Navigates to "Issuer Details" section
3. Verifies issuer information display (name and URL)
4. Tests "View Source" functionality from credential menu
5. Verifies credential JSON display
6. Scrolls through and verifies DID document sections:
   - Credential JSON
   - DID Document
   - Verification Key
   - Key Agreement Key
7. Tests navigation back to home screen

**about-section.yaml**

1. Navigates to Settings tab
2. Opens About section
3. Verifies About screen content:
   - App name (Learner Credential Wallet)
   - Digital Credentials Consortium information
   - Website link (https://lcw.app)
   - Copyright notice
4. Tests website link functionality (opens in browser)
5. Taps version/build number to access Developer Settings
6. Verifies Developer Settings screen opens
7. Tests navigation back to Settings

## Test Development

Use Maestro Studio for interactive test development:
maestro studio

For debugging, add `--debug` flag:
maestro test .maestro/onboarding.yaml --debug

## Troubleshooting

**Test fails to find app:**
- Ensure app is built and installed: `npm run ios` or `npm run android`
- Verify correct app ID in `.maestro/config.yaml`

**Maestro command not found:**
- Add Maestro to PATH: `export PATH="$PATH:$HOME/.maestro/bin"`
- Restart terminal after installation

**Test times out:**
- Ensure device/emulator is running and unlocked
- Check app launches successfully manually first
- Use `--debug` flag for detailed logs

## More Information

- Main project README: [README.md](../README.md) (see UI Testing section)
- Maestro documentation: [maestro.mobile.dev](https://maestro.mobile.dev)
