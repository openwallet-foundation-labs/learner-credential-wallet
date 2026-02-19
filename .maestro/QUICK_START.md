# Maestro Quick Start

## One-Time Setup
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH="$PATH:$HOME/.maestro/bin"

# Verify installation
./.maestro/verify-setup.sh

> **Intel Mac users:** Maestro 2.1.0+ only ships arm64 XCTest runner binaries. If you're on an Intel (x86_64) Mac, downgrade to Maestro 2.0.10. See [Troubleshooting](#troubleshooting) for details.

## Running Tests Locally

### iOS
# Terminal 1: Start app
npm run ios

# Terminal 2: Run tests
npm run test:ui:ios

### Android

# Terminal 1: Start app
npm run android

# Terminal 2: Run tests
npm run test:ui:android

### Using npm scripts (recommended)
npm run test:ui:ios      # Run on iOS
npm run test:ui:android  # Run on Android
npm run test:ui          # Run with manual platform selection (uses config.yaml)

### Direct Maestro commands
maestro test .maestro/lock-unlock-wallet.yaml --env APP_ID=edu.mit.eduwallet  # iOS
maestro test .maestro/lock-unlock-wallet.yaml --env APP_ID=app.lcw            # Android
maestro test .maestro/lock-unlock-wallet.yaml --config .maestro/config.yaml   # Using config

## Test Flow Chain

The main entry point is `lock-unlock-wallet.yaml`, which runs the full test suite via nested `runFlow` references:

lock-unlock-wallet.yaml
  └── profile-management.yaml
        └── about-section.yaml
              └── issuer-info.yaml
                    └── verification-status.yaml
                          └── credential-management.yaml
                                └── onboarding.yaml
```

Each flow sets up its prerequisites by running the flow below it. The full chain starts from onboarding (fresh wallet creation) and builds up through credential management, verification, issuer info, about section, profile management, and finally lock/unlock testing.

## Test Files

- **onboarding.yaml** - Wallet setup and onboarding flow (clears state, creates wallet)
- **credential-management.yaml** - End-to-end credential lifecycle (add, delete, share, LinkedIn)
- **verification-status.yaml** - Credential verification and validation testing
- **issuer-info.yaml** - Issuer details and credential source JSON viewing
- **about-section.yaml** - About section navigation and Developer Settings access
- **profile-management.yaml** - Profile creation, rename, backup, and deletion
- **lock-unlock-wallet.yaml** - Lock wallet, test wrong password, unlock with correct password
- **learn-more-link.yaml** - Tests "Learn more about LCW" link functionality
- **config.yaml** - Platform-specific app identifiers (iOS: `edu.mit.eduwallet`, Android: `app.lcw`)

## What the Tests Do

**onboarding.yaml**

1. Clears app state and launches fresh
2. Connects to Metro dev server
3. Taps "Quick Setup" button
4. Enters and confirms password
5. Verifies "Creating Wallet" screen appears
6. Taps "Take Me To My Wallet" to complete onboarding

**credential-management.yaml**

1. Runs the full onboarding flow
2. Adds multiple test credentials (verified, warning, and not verified states):
   - Credential via JSON input (verified)
   - Credential via URL input (verified)
   - Credential via JSON (expired/warning)
   - Credential via URL (expired/warning)
   - Credential via JSON (revoked/not verified)
   - Credential via URL (revoked/not verified)
3. Tests credential deletion functionality
4. Tests duplicate credential handling
5. Tests credential sharing features:
   - Public link creation
   - Copy link functionality
   - LinkedIn integration
   - Send credential (JSON/QR code)
   - Unshare functionality
6. Tests navigation between different sharing methods
7. Verifies wallet state management throughout the flow

**verification-status.yaml**

1. Runs the full credential management flow to set up test data
2. Navigates to credential detail screen
3. Scrolls to "Credential Verification and Validation" section
4. Waits for verification to complete (up to 90s, optional due to network dependency)
5. Conditionally verifies credential status:
   - For valid credentials: checks for valid signature, not expired, and not revoked
   - For invalid credentials: checks for invalid signature
   - For loading state: verifies loading indicator is visible
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

**profile-management.yaml**

1. Runs the full flow chain to set up test data
2. Navigates to Settings > Manage Profiles
3. Tests profile creation with custom name
4. Tests profile renaming functionality
5. Tests profile backup feature
6. Tests adding existing profiles (including iOS file picker dismissal)
7. Tests profile deletion with confirmation
8. Verifies proper navigation and state management throughout

**lock-unlock-wallet.yaml**

1. Runs the profile management flow (which runs the full chain)
2. Navigates to Settings tab
3. Taps "Sign out" to lock the wallet
4. Verifies login screen appears
5. Tests incorrect password entry (password field auto-clears on failure)
6. Enters correct password
7. Unlocks wallet and verifies return to home screen

## CI/CD Pipeline

Maestro tests run automatically via GitHub Actions on pushes and PRs to `main`. The workflow is defined in `.github/workflows/maestro-tests.yml`.

### What the pipeline does

1. Sets up Xcode 16, Node.js, and installs dependencies
2. Runs `expo prebuild` to generate the iOS project
3. Installs CocoaPods and builds the iOS app (Debug configuration)
4. Installs Maestro CLI
5. Creates and boots an iPhone 16 Pro simulator
6. Starts Metro bundler in background (required for Expo dev client)
7. Runs the full Maestro test suite
8. Uploads debug artifacts (screenshots, logs) on failure

### Manual trigger

You can trigger the pipeline manually from the GitHub Actions tab using "workflow_dispatch".

## Test Development

Use Maestro Studio for interactive test development:

maestro studio

For debugging, add `--debug-output` flag:

maestro test .maestro/lock-unlock-wallet.yaml --debug-output .maestro-debug

## Troubleshooting

**Test fails to find app:**
- Ensure app is built and installed: `npm run ios` or `npm run android`
- Verify correct app ID in `.maestro/config.yaml`

**Maestro command not found:**
- Add Maestro to PATH: `export PATH="$PATH:$HOME/.maestro/bin"`
- Restart terminal after installation

**"iOS driver not ready in time" on Intel Mac:**
- Maestro 2.1.0+ only ships arm64 XCTest runner binaries
- Downgrade to Maestro 2.0.10:
  curl -L -o maestro-2.0.10.zip https://github.com/mobile-dev-inc/maestro/releases/download/cli-2.0.10/maestro-2.0.10.zip
  unzip -o maestro-2.0.10.zip -d ~/.maestro/
  maestro --version  # Should show 2.0.10
- This is not an issue on Apple Silicon Macs or GitHub Actions runners (ARM)

**Test hangs or times out:**
- Use `--debug-output` flag to see exactly where it hangs:
  maestro test .maestro/lock-unlock-wallet.yaml --debug-output .maestro-debug
- Ensure device/emulator is running and unlocked
- Check app launches successfully manually first
- Credential verification depends on network (DID resolution) and may take up to 90s

**eraseText + inputText issues with React Native:**
- Maestro's `eraseText` can desync with React Native controlled `TextInput` components
- Add `waitForAnimationToEnd` (2s+) between `eraseText` and `inputText`
- For password fields wrapped in `AccessibleView`, prefer clearing state in app code rather than using `eraseText`

## More Information

- Main project README: [README.md](../README.md) (see UI Testing section)
- Maestro documentation: [maestro.mobile.dev](https://maestro.mobile.dev)
