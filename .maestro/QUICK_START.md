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
maestro test .maestro/onboarding.yaml --env APP_ID=edu.mit.eduwallet  # iOS
maestro test .maestro/onboarding.yaml --env APP_ID=app.lcw            # Android
maestro test .maestro/onboarding.yaml --config .maestro/config.yaml   # Using config

## Test Files

- **onboarding.yaml** - Automated test for wallet onboarding flow
- **config.yaml** - Platform-specific app identifiers (iOS: `edu.mit.eduwallet`, Android: `app.lcw`)

## What the Test Does

1. Launches LCW app
2. Taps "Quick Setup" button
3. Verifies "Creating Wallet" screen appears
4. Verifies loading message is visible
5. Taps "Take Me To My Wallet" to complete onboarding

## Test Development

Use Maestro Studio for interactive test development:
maestro studio

For debugging, add `--debug` flag:
maestro test .maestro/onboarding.yaml --debug

## CI/CD Integration

Tests run automatically on pull requests via GitHub Actions (`.github/workflows/maestro-tests.yml`).

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
