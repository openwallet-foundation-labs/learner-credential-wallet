#!/bin/bash

echo "🔍 Verifying Maestro Setup..."
echo ""

# Check if Maestro is installed
if ! command -v maestro &> /dev/null; then
    echo "Maestro is not installed"
    echo "   Install with: curl -Ls \"https://get.maestro.mobile.dev\" | bash"
    exit 1
fi

echo "Maestro is installed: $(maestro --version)"
echo ""

# Check test files exist
if [ ! -f "onboarding.yaml" ]; then
    echo "onboarding.yaml not found"
    exit 1
fi

if [ ! -f "config.yaml" ]; then
    echo "config.yaml not found"
    exit 1
fi

echo "Test files found"
echo ""

# Validate YAML syntax
echo "🔍 Validating test file syntax..."
maestro test onboarding.yaml --dry-run 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Test file syntax is valid"
else
    echo "Could not validate syntax (this is okay if no device is connected)"
fi

echo ""
echo "Maestro setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. Start iOS simulator or Android emulator"
echo "  2. Build and install the app: npm run ios or npm run android"
echo "  3. Run tests: npm run test:ui:ios or npm run test:ui:android"
