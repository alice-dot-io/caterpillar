#!/bin/sh
set -e

# Caterpillar NPM Installer
# https://caterpillar.alice.io

echo "Installing Caterpillar..."
echo ""

# Check if Node.js is installed
if ! command -v node > /dev/null 2>&1; then
  echo "Error: Node.js is required but not installed."
  echo "Please install Node.js 18+ from https://nodejs.org"
  exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Error: Node.js 18 or higher is required."
  echo "Current version: $(node -v)"
  exit 1
fi

# Check if npm is installed
if ! command -v npm > /dev/null 2>&1; then
  echo "Error: npm is required but not installed."
  exit 1
fi

# Install globally
echo "Installing @alice-io/caterpillar..."
npm install -g @alice-io/caterpillar

echo ""
echo "✓ Caterpillar installed successfully!"
echo ""
echo "Get started:"
echo "  caterpillar login    # authenticate"
echo "  caterpillar scan     # scan skills"
echo ""
