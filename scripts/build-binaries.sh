#!/bin/bash
set -e

# Build standalone binaries for all platforms using Bun
# Usage: ./scripts/build-binaries.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTDIR="$ROOT_DIR/binaries"
ENTRY="$ROOT_DIR/src/cli.ts"

echo "Building Caterpillar binaries..."
echo "Entry: $ENTRY"
echo "Output: $OUTDIR"
echo ""

mkdir -p "$OUTDIR"

TARGETS=(
  "bun-darwin-arm64:caterpillar-macos-arm64"
  "bun-darwin-x64:caterpillar-macos-x64"
  "bun-linux-x64:caterpillar-linux-x64"
  "bun-linux-arm64:caterpillar-linux-arm64"
  "bun-windows-x64:caterpillar-win-x64.exe"
)

for entry in "${TARGETS[@]}"; do
  TARGET="${entry%%:*}"
  OUTPUT="${entry##*:}"
  echo "  Building $OUTPUT ($TARGET)..."
  bun build --compile --target="$TARGET" --outfile="$OUTDIR/$OUTPUT" "$ENTRY" 2>&1
done

echo ""
echo "Done! Binaries:"
ls -lh "$OUTDIR/"
