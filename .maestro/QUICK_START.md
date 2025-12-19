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
```

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
2. Navigates to the Add Credential screen
3. Pastes a sample verifiable credential JSON into the \"Paste JSON or URL\" field
4. Submits the credential and navigates through the approval screens
5. Returns to the Home screen with the wallet populated

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

- Full documentation: [MAESTRO.md](../MAESTRO.md)
- Main project README: [README.md](../README.md) (see UI Testing section)
