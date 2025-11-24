#!/bin/bash
# Simple build test script

cd /Users/Austin.Leahy/Source/Github/DigitalMinion/atakora

# Build component package
echo "Building @atakora/component..."
npx tsc --build packages/component/tsconfig.json 2>&1

echo ""
echo "Build complete. Checking for dist directory..."
ls -la packages/component/dist 2>&1 || echo "dist directory not found"
