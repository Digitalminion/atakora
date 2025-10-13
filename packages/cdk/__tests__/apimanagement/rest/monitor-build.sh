#!/bin/bash

# REST API Integration Testing - Build Monitor
# This script monitors the build status until all compilation errors are fixed

ATAKORA_ROOT="C:/Users/austi/Source/Github/Digital Minion/atakora"

echo "=========================================="
echo "REST API Integration Testing - Build Monitor"
echo "=========================================="
echo ""

check_build() {
  cd "$ATAKORA_ROOT"
  npm run build 2>&1 | tee /tmp/atakora-build.log
  error_count=$(grep -c "error TS" /tmp/atakora-build.log || echo "0")
  echo "$error_count"
}

echo "Initial build check..."
initial_errors=$(check_build)

if [ "$initial_errors" -eq 0 ]; then
  echo ""
  echo "✅ BUILD PASSED! All compilation errors fixed."
  echo ""
  echo "Ready to activate REST API tests:"
  echo "  1. packages/cdk/__tests__/api/rest/unit/builder.test.ts"
  echo "  2. packages/cdk/__tests__/api/rest/integration/openapi.test.ts"
  echo "  3. packages/cdk/__tests__/api/rest/integration/stack.test.ts"
  echo ""
  exit 0
else
  echo ""
  echo "❌ BUILD FAILED: $initial_errors compilation errors remaining"
  echo ""
  echo "Top errors:"
  grep "error TS" /tmp/atakora-build.log | head -10
  echo ""
  echo "Monitoring build every 30 seconds..."
  echo ""
fi

# Monitor loop
while true; do
  sleep 30
  echo "Checking build status..."

  current_errors=$(check_build)

  if [ "$current_errors" -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ BUILD PASSED!"
    echo "=========================================="
    echo ""
    echo "All compilation errors fixed. Ready for comprehensive integration testing."
    exit 0
  elif [ "$current_errors" -lt "$initial_errors" ]; then
    echo "Progress: $current_errors errors (down from $initial_errors)"
    initial_errors=$current_errors
  else
    echo "Status: $current_errors errors"
  fi
done
